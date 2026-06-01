import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import { sql } from "kysely";
import { z } from "zod";
import {
  ActivityUpdateSchema,
  MenuUpdateSchema,
  RideOfferCreateSchema,
  RsvpUpdateSchema,
  WeddingContentSchema
} from "@aislewright/shared";
import { toCsv } from "./csv.js";
import { db } from "./db.js";
import { createRandomToken, hashPassword, hashToken, verifyPassword } from "./crypto.js";
import { env } from "./env.js";

const ownerCookie = "wedding_owner";
const guestCookie = "wedding_guest";
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.PUBLIC_SITE_URL.startsWith("https://"),
  path: "/"
};

const ownerSetupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

const ownerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const householdInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  guests: z.array(z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional().default(""),
    isChild: z.boolean().optional().default(false),
    plusOne: z.boolean().optional().default(false)
  })).optional().default([])
});

const guestInputSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional().default(""),
  rsvpStatus: z.enum(["unknown", "attending", "declined"]).optional().default("unknown"),
  dietaryConfirmed: z.boolean().optional().default(false),
  dietaryNotes: z.string().nullable().optional(),
  allergyNotes: z.string().nullable().optional(),
  isChild: z.boolean().optional().default(false),
  plusOne: z.boolean().optional().default(false)
});

export async function createServer() {
  const server = Fastify({ logger: true });
  await server.register(cors, { origin: env.WEB_ORIGIN, credentials: true });
  await server.register(cookie, { secret: env.COOKIE_SECRET });

  server.get("/health", async () => ({ ok: true }));

  server.get("/setup/status", async () => {
    const hasOwner = await ownerExists();
    return { needsOwnerSetup: !hasOwner };
  });

  server.post("/auth/owner/setup", async (request, reply) => {
    if (await ownerExists()) return reply.code(409).send({ error: "Owner already exists" });
    const body = ownerSetupSchema.parse(request.body);
    const passwordHash = await hashPassword(body.password);
    const owner = await db.insertInto("owners").values({
      name: body.name,
      email: body.email.toLowerCase(),
      password_hash: passwordHash
    }).returning(["id", "name", "email"]).executeTakeFirstOrThrow();
    await createSession(reply, "owner", { ownerId: owner.id }, 30);
    return { owner };
  });

  server.post("/auth/owner/login", async (request, reply) => {
    const body = ownerLoginSchema.parse(request.body);
    const owner = await db.selectFrom("owners")
      .select(["id", "name", "email", "password_hash"])
      .where("email", "=", body.email.toLowerCase())
      .executeTakeFirst();
    if (!owner || !(await verifyPassword(body.password, owner.password_hash))) {
      return reply.code(401).send({ error: "Invalid email or password" });
    }
    await createSession(reply, "owner", { ownerId: owner.id }, 30);
    return { owner: { id: owner.id, name: owner.name, email: owner.email } };
  });

  server.post("/auth/owner/logout", async (request, reply) => {
    const token = readCookie(request, ownerCookie);
    if (token) await deleteSession(token);
    reply.clearCookie(ownerCookie, { path: "/" });
    return { ok: true };
  });

  server.get("/auth/owner/me", async (request, reply) => {
    const owner = await requireOwner(request, reply);
    if (!owner) return;
    return { owner };
  });

  server.get("/config", async () => ({
    edition: "self-host",
    siteUrl: env.PUBLIC_SITE_URL,
    features: { rsvp: true, menu: true, activities: true, carpool: true, exports: true }
  }));

  server.get("/content", async () => getContent());

  server.get("/invite/:token", async (request, reply) => {
    const params = z.object({ token: z.string().min(20) }).parse(request.params);
    const tokenHash = hashToken(params.token);
    const invite = await db.selectFrom("invite_tokens")
      .select(["id", "household_id"])
      .where("token_hash", "=", tokenHash)
      .where("revoked_at", "is", null)
      .executeTakeFirst();
    if (!invite) return reply.code(404).send({ error: "Invitation link not found" });
    await db.updateTable("invite_tokens").set({ last_used_at: new Date() }).where("id", "=", invite.id).execute();
    await createSession(reply, "guest", { householdId: invite.household_id }, 14);
    return getGuestState(invite.household_id);
  });

  server.get("/me", async (request, reply) => {
    const session = await requireGuest(request, reply);
    if (!session) return;
    return getGuestState(session.householdId);
  });

  server.patch("/me/rsvp", async (request, reply) => {
    const session = await requireGuest(request, reply);
    if (!session) return;
    const body = RsvpUpdateSchema.parse(request.body);
    const allowedGuestIds = await getHouseholdGuestIds(session.householdId);
    for (const guest of body.guests) {
      if (!allowedGuestIds.has(guest.id)) return reply.code(403).send({ error: "Guest is outside this household" });
      await db.updateTable("guests").set({
        rsvp_status: guest.rsvpStatus,
        dietary_confirmed: guest.dietaryConfirmed,
        dietary_notes: guest.dietaryNotes,
        allergy_notes: guest.allergyNotes,
        updated_at: new Date()
      }).where("id", "=", guest.id).execute();
    }
    return getGuestState(session.householdId);
  });

  server.patch("/me/menu", async (request, reply) => {
    const session = await requireGuest(request, reply);
    if (!session) return;
    const body = MenuUpdateSchema.parse(request.body);
    const allowedGuestIds = await getHouseholdGuestIds(session.householdId);
    for (const selection of body.selections) {
      if (!allowedGuestIds.has(selection.guestId)) return reply.code(403).send({ error: "Guest is outside this household" });
      await db.insertInto("guest_menu_selections").values({
        guest_id: selection.guestId,
        course_id: selection.courseId,
        option_id: selection.optionId,
        none_works: selection.noneWorks,
        note: selection.note,
        updated_at: new Date()
      }).onConflict((oc) => oc.columns(["guest_id", "course_id"]).doUpdateSet({
        option_id: selection.optionId,
        none_works: selection.noneWorks,
        note: selection.note,
        updated_at: new Date()
      })).execute();
    }
    return getGuestState(session.householdId);
  });

  server.patch("/me/activities", async (request, reply) => {
    const session = await requireGuest(request, reply);
    if (!session) return;
    const body = ActivityUpdateSchema.parse(request.body);
    const allowedGuestIds = await getHouseholdGuestIds(session.householdId);
    for (const response of body.responses) {
      if (!allowedGuestIds.has(response.guestId)) return reply.code(403).send({ error: "Guest is outside this household" });
      await db.insertInto("guest_activity_responses").values({
        guest_id: response.guestId,
        activity_id: response.activityId,
        response: response.response,
        note: response.note,
        updated_at: new Date()
      }).onConflict((oc) => oc.columns(["guest_id", "activity_id"]).doUpdateSet({
        response: response.response,
        note: response.note,
        updated_at: new Date()
      })).execute();
    }
    return getGuestState(session.householdId);
  });

  server.get("/rides", async (request, reply) => {
    const session = await requireGuest(request, reply);
    if (!session) return;
    return { rides: await getRideOffers() };
  });

  server.post("/rides/offers", async (request, reply) => {
    const session = await requireGuest(request, reply);
    if (!session) return;
    const body = RideOfferCreateSchema.parse(request.body);
    const allowedGuestIds = await getHouseholdGuestIds(session.householdId);
    if (!allowedGuestIds.has(body.driverGuestId)) return reply.code(403).send({ error: "Driver is outside this household" });
    await db.insertInto("ride_offers").values({
      driver_guest_id: body.driverGuestId,
      from_location: body.fromLocation,
      seats_available: body.seatsAvailable,
      notes: body.notes ?? null,
      status: "open"
    }).execute();
    return { rides: await getRideOffers() };
  });

  server.delete("/rides/offers/:id", async (request, reply) => {
    const session = await requireGuest(request, reply);
    if (!session) return;
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const allowedGuestIds = await getHouseholdGuestIds(session.householdId);
    const offer = await db.selectFrom("ride_offers").select(["driver_guest_id"]).where("id", "=", params.id).executeTakeFirst();
    if (!offer || !allowedGuestIds.has(offer.driver_guest_id)) return reply.code(403).send({ error: "Only the driver can close this ride" });
    await db.updateTable("ride_offers").set({ status: "closed", updated_at: new Date() }).where("id", "=", params.id).execute();
    return { rides: await getRideOffers() };
  });

  server.post("/rides/offers/:id/passengers", async (request, reply) => {
    const session = await requireGuest(request, reply);
    if (!session) return;
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ guestId: z.string().uuid() }).parse(request.body);
    const allowedGuestIds = await getHouseholdGuestIds(session.householdId);
    if (!allowedGuestIds.has(body.guestId)) return reply.code(403).send({ error: "Passenger is outside this household" });
    const offer = await db.selectFrom("ride_offers").select(["id", "seats_available", "status"]).where("id", "=", params.id).executeTakeFirst();
    if (!offer || offer.status !== "open") return reply.code(400).send({ error: "Ride is not open" });
    const count = await passengerCount(params.id);
    if (count >= offer.seats_available) return reply.code(400).send({ error: "Ride is full" });
    await db.insertInto("ride_passengers").values({ offer_id: params.id, guest_id: body.guestId }).onConflict((oc) => oc.doNothing()).execute();
    await syncRideStatus(params.id);
    return { rides: await getRideOffers() };
  });

  server.delete("/rides/offers/:id/passengers/:guestId", async (request, reply) => {
    const session = await requireGuest(request, reply);
    if (!session) return;
    const params = z.object({ id: z.string().uuid(), guestId: z.string().uuid() }).parse(request.params);
    const allowedGuestIds = await getHouseholdGuestIds(session.householdId);
    const offer = await db.selectFrom("ride_offers").select(["driver_guest_id"]).where("id", "=", params.id).executeTakeFirst();
    const canManage = allowedGuestIds.has(params.guestId) || (offer && allowedGuestIds.has(offer.driver_guest_id));
    if (!canManage) return reply.code(403).send({ error: "Cannot remove this passenger" });
    await db.deleteFrom("ride_passengers").where("offer_id", "=", params.id).where("guest_id", "=", params.guestId).execute();
    await syncRideStatus(params.id);
    return { rides: await getRideOffers() };
  });

  server.get("/admin/content", async (request, reply) => {
    const owner = await requireOwner(request, reply);
    if (!owner) return;
    return getContent();
  });

  server.put("/admin/content", async (request, reply) => {
    const owner = await requireOwner(request, reply);
    if (!owner) return;
    const content = WeddingContentSchema.parse(request.body);
    await replaceContent(content);
    return getContent();
  });

  server.get("/admin/households", async (request, reply) => {
    const owner = await requireOwner(request, reply);
    if (!owner) return;
    return { households: await getHouseholds() };
  });

  server.post("/admin/households", async (request, reply) => {
    const owner = await requireOwner(request, reply);
    if (!owner) return;
    const body = householdInputSchema.parse(request.body);
    const household = await db.insertInto("households").values({
      name: body.name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null
    }).returning("id").executeTakeFirstOrThrow();
    let sortOrder = 1;
    for (const guest of body.guests) {
      await db.insertInto("guests").values({
        household_id: household.id,
        first_name: guest.firstName,
        last_name: guest.lastName,
        rsvp_status: "unknown",
        dietary_confirmed: false,
        is_child: guest.isChild,
        plus_one: guest.plusOne,
        sort_order: sortOrder++
      }).execute();
    }
    return { households: await getHouseholds() };
  });

  server.patch("/admin/households/:id", async (request, reply) => {
    const owner = await requireOwner(request, reply);
    if (!owner) return;
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = householdInputSchema.omit({ guests: true }).parse(request.body);
    await db.updateTable("households").set({
      name: body.name,
      email: body.email ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
      updated_at: new Date()
    }).where("id", "=", params.id).execute();
    return { households: await getHouseholds() };
  });

  server.post("/admin/households/:id/guests", async (request, reply) => {
    const owner = await requireOwner(request, reply);
    if (!owner) return;
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = guestInputSchema.parse(request.body);
    await db.insertInto("guests").values({
      household_id: params.id,
      first_name: body.firstName,
      last_name: body.lastName,
      rsvp_status: body.rsvpStatus,
      dietary_confirmed: body.dietaryConfirmed,
      dietary_notes: body.dietaryNotes ?? null,
      allergy_notes: body.allergyNotes ?? null,
      is_child: body.isChild,
      plus_one: body.plusOne,
      sort_order: 0
    }).execute();
    return { households: await getHouseholds() };
  });

  server.patch("/admin/guests/:id", async (request, reply) => {
    const owner = await requireOwner(request, reply);
    if (!owner) return;
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = guestInputSchema.parse(request.body);
    await db.updateTable("guests").set({
      first_name: body.firstName,
      last_name: body.lastName,
      rsvp_status: body.rsvpStatus,
      dietary_confirmed: body.dietaryConfirmed,
      dietary_notes: body.dietaryNotes ?? null,
      allergy_notes: body.allergyNotes ?? null,
      is_child: body.isChild,
      plus_one: body.plusOne,
      updated_at: new Date()
    }).where("id", "=", params.id).execute();
    return { households: await getHouseholds() };
  });

  server.get("/admin/reports/summary", async (request, reply) => {
    const owner = await requireOwner(request, reply);
    if (!owner) return;
    return getSummaryReport();
  });

  server.get("/admin/exports/guests.csv", async (request, reply) => {
    const owner = await requireOwner(request, reply);
    if (!owner) return;
    return sendCsv(reply, "guests.csv", toCsv(await guestExportRows()));
  });

  server.get("/admin/exports/menu-diet.csv", async (request, reply) => {
    const owner = await requireOwner(request, reply);
    if (!owner) return;
    return sendCsv(reply, "menu-diet.csv", toCsv(await menuDietExportRows()));
  });

  server.get("/admin/exports/wine.csv", async (request, reply) => {
    const owner = await requireOwner(request, reply);
    if (!owner) return;
    return sendCsv(reply, "wine.csv", toCsv(await wineExportRows()));
  });

  server.get("/admin/exports/carpool.csv", async (request, reply) => {
    const owner = await requireOwner(request, reply);
    if (!owner) return;
    return sendCsv(reply, "carpool.csv", toCsv(await carpoolExportRows()));
  });

  server.post("/admin/exports/invites", async (request, reply) => {
    const owner = await requireOwner(request, reply);
    if (!owner) return;
    return { invites: await generateInviteLinks() };
  });

  server.post("/admin/exports/invites.csv", async (request, reply) => {
    const owner = await requireOwner(request, reply);
    if (!owner) return;
    return sendCsv(reply, "invite-links.csv", toCsv(await generateInviteLinks()));
  });

  return server;
}

async function ownerExists() {
  const row = await db.selectFrom("owners").select((eb) => eb.fn.count("id").as("count")).executeTakeFirstOrThrow();
  return Number(row.count) > 0;
}

async function createSession(reply: FastifyReply, kind: "owner" | "guest", ids: { ownerId?: string; householdId?: string }, days: number) {
  const token = createRandomToken();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await db.insertInto("sessions").values({
    kind,
    token_hash: hashToken(token),
    owner_id: ids.ownerId ?? null,
    household_id: ids.householdId ?? null,
    expires_at: expiresAt
  }).execute();
  reply.setCookie(kind === "owner" ? ownerCookie : guestCookie, token, { ...cookieOptions, maxAge: days * 24 * 60 * 60 });
}

async function deleteSession(token: string) {
  await db.deleteFrom("sessions").where("token_hash", "=", hashToken(token)).execute();
}

function readCookie(request: FastifyRequest, name: string): string | undefined {
  return request.cookies[name];
}

async function requireOwner(request: FastifyRequest, reply: FastifyReply) {
  const token = readCookie(request, ownerCookie);
  if (!token) {
    reply.code(401).send({ error: "Owner login required" });
    return null;
  }
  const row = await db.selectFrom("sessions")
    .innerJoin("owners", "owners.id", "sessions.owner_id")
    .select(["owners.id as id", "owners.name as name", "owners.email as email"])
    .where("sessions.kind", "=", "owner")
    .where("sessions.token_hash", "=", hashToken(token))
    .where("sessions.expires_at", ">", sql<Date>`now()`)
    .executeTakeFirst();
  if (!row) {
    reply.code(401).send({ error: "Owner login required" });
    return null;
  }
  return row;
}

async function requireGuest(request: FastifyRequest, reply: FastifyReply) {
  const token = readCookie(request, guestCookie);
  if (!token) {
    reply.code(401).send({ error: "Invitation login required" });
    return null;
  }
  const row = await db.selectFrom("sessions")
    .select(["household_id as householdId"])
    .where("kind", "=", "guest")
    .where("token_hash", "=", hashToken(token))
    .where("expires_at", ">", sql<Date>`now()`)
    .executeTakeFirst();
  if (!row || !row.householdId) {
    reply.code(401).send({ error: "Invitation login required" });
    return null;
  }
  return { householdId: row.householdId };
}

function asDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

async function getContent() {
  const settings = await db.selectFrom("wedding_settings")
    .select(["couple_names as coupleNames", "tagline", "wedding_date as weddingDate", "locale", "location_name as locationName", "location_summary as locationSummary", "hero_image_url as heroImageUrl", "theme"])
    .where("id", "=", 1)
    .executeTakeFirstOrThrow();
  const sections = await db.selectFrom("content_sections")
    .select(["id", "slug", "title", "body", "sort_order as sortOrder"])
    .orderBy("sort_order")
    .execute();
  const days = await db.selectFrom("schedule_days")
    .select(["id", "label", "event_date as date", "sort_order as sortOrder"])
    .orderBy("sort_order")
    .execute();
  const events = await db.selectFrom("schedule_events")
    .select(["id", "day_id as dayId", "event_time as time", "title", "description", "location", "sort_order as sortOrder"])
    .orderBy("sort_order")
    .execute();
  const faqs = await db.selectFrom("faqs")
    .select(["id", "question", "answer", "sort_order as sortOrder"])
    .orderBy("sort_order")
    .execute();
  const courses = await db.selectFrom("menu_courses")
    .select(["id", "label", "description", "sort_order as sortOrder"])
    .orderBy("sort_order")
    .execute();
  const options = await db.selectFrom("menu_options")
    .select(["id", "course_id as courseId", "label", "description", "dietary_tags as dietaryTags", "sort_order as sortOrder"])
    .orderBy("sort_order")
    .execute();
  const activities = await db.selectFrom("activities")
    .select(["id", "label", "description", "response_kind as responseKind", "options", "sort_order as sortOrder"])
    .orderBy("sort_order")
    .execute();
  return {
    settings: {
      ...settings,
      heroImageUrl: settings.heroImageUrl ?? null,
      theme: settings.theme as Record<string, string>
    },
    sections,
    schedule: days.map((day) => ({
      id: day.id,
      label: day.label,
      date: asDateString(day.date),
      events: events.filter((event) => event.dayId === day.id).map((event) => ({
        id: event.id,
        time: event.time,
        title: event.title,
        description: event.description,
        location: event.location
      }))
    })),
    faqs,
    menu: courses.map((course) => ({
      id: course.id,
      label: course.label,
      description: course.description,
      options: options.filter((option) => option.courseId === course.id).map((option) => ({
        id: option.id,
        label: option.label,
        description: option.description,
        dietaryTags: option.dietaryTags
      }))
    })),
    activities: activities.map((activity) => ({
      id: activity.id,
      label: activity.label,
      description: activity.description,
      responseKind: activity.responseKind,
      options: activity.options
    }))
  };
}

async function replaceContent(content: z.infer<typeof WeddingContentSchema>) {
  await db.transaction().execute(async (trx) => {
    await trx.insertInto("wedding_settings").values({
      id: 1,
      couple_names: content.settings.coupleNames,
      tagline: content.settings.tagline,
      wedding_date: content.settings.weddingDate,
      locale: content.settings.locale,
      location_name: content.settings.locationName,
      location_summary: content.settings.locationSummary,
      hero_image_url: content.settings.heroImageUrl ?? null,
      theme: content.settings.theme,
      updated_at: new Date()
    }).onConflict((oc) => oc.column("id").doUpdateSet({
      couple_names: content.settings.coupleNames,
      tagline: content.settings.tagline,
      wedding_date: content.settings.weddingDate,
      locale: content.settings.locale,
      location_name: content.settings.locationName,
      location_summary: content.settings.locationSummary,
      hero_image_url: content.settings.heroImageUrl ?? null,
      theme: content.settings.theme,
      updated_at: new Date()
    })).execute();

    await trx.deleteFrom("guest_menu_selections").execute();
    await trx.deleteFrom("guest_activity_responses").execute();
    await trx.deleteFrom("content_sections").execute();
    await trx.deleteFrom("schedule_days").execute();
    await trx.deleteFrom("faqs").execute();
    await trx.deleteFrom("menu_courses").execute();
    await trx.deleteFrom("activities").execute();

    if (content.sections.length) {
      await trx.insertInto("content_sections").values(content.sections.map((section) => ({
        id: section.id,
        slug: section.slug,
        title: section.title,
        body: section.body,
        sort_order: section.sortOrder
      }))).execute();
    }
    if (content.schedule.length) {
      await trx.insertInto("schedule_days").values(content.schedule.map((day, index) => ({
        id: day.id,
        label: day.label,
        event_date: day.date,
        sort_order: index + 1
      }))).execute();
      const scheduleEvents = content.schedule.flatMap((day) => day.events.map((event, index) => ({
        id: event.id,
        day_id: day.id,
        event_time: event.time,
        title: event.title,
        description: event.description,
        location: event.location ?? null,
        sort_order: index + 1
      })));
      if (scheduleEvents.length) await trx.insertInto("schedule_events").values(scheduleEvents).execute();
    }
    if (content.faqs.length) {
      await trx.insertInto("faqs").values(content.faqs.map((faq) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        sort_order: faq.sortOrder
      }))).execute();
    }
    if (content.menu.length) {
      await trx.insertInto("menu_courses").values(content.menu.map((course, index) => ({
        id: course.id,
        label: course.label,
        description: course.description ?? null,
        sort_order: index + 1
      }))).execute();
      const menuOptions = content.menu.flatMap((course) => course.options.map((option, index) => ({
        id: option.id,
        course_id: course.id,
        label: option.label,
        description: option.description ?? null,
        dietary_tags: option.dietaryTags,
        sort_order: index + 1
      })));
      if (menuOptions.length) await trx.insertInto("menu_options").values(menuOptions).execute();
    }
    if (content.activities.length) {
      await trx.insertInto("activities").values(content.activities.map((activity, index) => ({
        id: activity.id,
        label: activity.label,
        description: activity.description,
        response_kind: activity.responseKind,
        options: activity.options,
        sort_order: index + 1
      }))).execute();
    }
  });
}

async function getHouseholds() {
  const households = await db.selectFrom("households")
    .select(["id", "name", "email", "phone", "notes"])
    .orderBy("name")
    .execute();
  const guests = await db.selectFrom("guests")
    .select(["id", "household_id as householdId", "first_name as firstName", "last_name as lastName", "rsvp_status as rsvpStatus", "dietary_confirmed as dietaryConfirmed", "dietary_notes as dietaryNotes", "allergy_notes as allergyNotes", "is_child as isChild", "plus_one as plusOne", "sort_order as sortOrder"])
    .orderBy("sort_order")
    .execute();
  return households.map((household) => ({
    ...household,
    guests: guests.filter((guest) => guest.householdId === household.id).map(({ sortOrder, ...guest }) => guest)
  }));
}

async function getGuestState(householdId: string) {
  const household = (await getHouseholds()).find((item) => item.id === householdId);
  if (!household) throw new Error("Household not found");
  const guestIds = household.guests.map((guest) => guest.id);
  const menuSelections = guestIds.length ? await db.selectFrom("guest_menu_selections")
    .select(["guest_id as guestId", "course_id as courseId", "option_id as optionId", "none_works as noneWorks", "note"])
    .where("guest_id", "in", guestIds)
    .execute() : [];
  const activityResponses = guestIds.length ? await db.selectFrom("guest_activity_responses")
    .select(["guest_id as guestId", "activity_id as activityId", "response", "note"])
    .where("guest_id", "in", guestIds)
    .execute() : [];
  return { household, menuSelections, activityResponses, rides: await getRideOffers() };
}

async function getHouseholdGuestIds(householdId: string) {
  const rows = await db.selectFrom("guests").select("id").where("household_id", "=", householdId).execute();
  return new Set(rows.map((row) => row.id));
}

async function getRideOffers() {
  const offers = await db.selectFrom("ride_offers")
    .innerJoin("guests", "guests.id", "ride_offers.driver_guest_id")
    .select(["ride_offers.id as id", "driver_guest_id as driverGuestId", "guests.first_name as driverFirstName", "guests.last_name as driverLastName", "from_location as fromLocation", "seats_available as seatsAvailable", "notes", "status"])
    .orderBy("ride_offers.created_at", "desc")
    .execute();
  const passengers = await db.selectFrom("ride_passengers")
    .innerJoin("guests", "guests.id", "ride_passengers.guest_id")
    .select(["offer_id as offerId", "guests.id as guestId", "guests.first_name as firstName", "guests.last_name as lastName"])
    .execute();
  return offers.map((offer) => ({
    id: offer.id,
    driverGuestId: offer.driverGuestId,
    driverName: [offer.driverFirstName, offer.driverLastName].filter(Boolean).join(" "),
    fromLocation: offer.fromLocation,
    seatsAvailable: offer.seatsAvailable,
    notes: offer.notes,
    status: offer.status,
    passengers: passengers.filter((passenger) => passenger.offerId === offer.id).map((passenger) => ({
      guestId: passenger.guestId,
      guestName: [passenger.firstName, passenger.lastName].filter(Boolean).join(" ")
    }))
  }));
}

async function passengerCount(offerId: string) {
  const row = await db.selectFrom("ride_passengers").select((eb) => eb.fn.count("guest_id").as("count")).where("offer_id", "=", offerId).executeTakeFirstOrThrow();
  return Number(row.count);
}

async function syncRideStatus(offerId: string) {
  const offer = await db.selectFrom("ride_offers").select(["seats_available", "status"]).where("id", "=", offerId).executeTakeFirst();
  if (!offer || offer.status === "closed") return;
  const count = await passengerCount(offerId);
  await db.updateTable("ride_offers").set({ status: count >= offer.seats_available ? "full" : "open", updated_at: new Date() }).where("id", "=", offerId).execute();
}

async function getSummaryReport() {
  const households = await db.selectFrom("households").select((eb) => eb.fn.count("id").as("count")).executeTakeFirstOrThrow();
  const guests = await db.selectFrom("guests").select(["rsvp_status as rsvpStatus", "dietary_confirmed as dietaryConfirmed"]).execute();
  const wine = await wineExportRows();
  const rides = await getRideOffers();
  const openRideSeats = rides.filter((ride) => ride.status === "open").reduce((sum, ride) => sum + Math.max(ride.seatsAvailable - ride.passengers.length, 0), 0);
  return {
    households: Number(households.count),
    guests: guests.length,
    attending: guests.filter((guest) => guest.rsvpStatus === "attending").length,
    declined: guests.filter((guest) => guest.rsvpStatus === "declined").length,
    unknown: guests.filter((guest) => guest.rsvpStatus === "unknown").length,
    dietaryUnconfirmed: guests.filter((guest) => !guest.dietaryConfirmed).length,
    wineYes: wine.filter((row) => row.response === "yes").length,
    openRideSeats
  };
}

async function guestExportRows() {
  return db.selectFrom("guests")
    .innerJoin("households", "households.id", "guests.household_id")
    .select(["households.name as household", "guests.first_name as firstName", "guests.last_name as lastName", "guests.rsvp_status as rsvpStatus", "guests.dietary_confirmed as dietaryConfirmed", "guests.dietary_notes as dietaryNotes", "guests.allergy_notes as allergyNotes", "guests.is_child as isChild", "guests.plus_one as plusOne"])
    .orderBy("households.name")
    .orderBy("guests.sort_order")
    .execute();
}

async function menuDietExportRows() {
  return db.selectFrom("guests")
    .innerJoin("households", "households.id", "guests.household_id")
    .leftJoin("guest_menu_selections", "guest_menu_selections.guest_id", "guests.id")
    .leftJoin("menu_courses", "menu_courses.id", "guest_menu_selections.course_id")
    .leftJoin("menu_options", "menu_options.id", "guest_menu_selections.option_id")
    .select(["households.name as household", "guests.first_name as firstName", "guests.last_name as lastName", "guests.dietary_confirmed as dietaryConfirmed", "guests.dietary_notes as dietaryNotes", "guests.allergy_notes as allergyNotes", "menu_courses.label as course", "menu_options.label as option", "guest_menu_selections.none_works as noneWorks", "guest_menu_selections.note as note"])
    .orderBy("households.name")
    .orderBy("guests.sort_order")
    .orderBy("menu_courses.sort_order")
    .execute();
}

async function wineExportRows() {
  return db.selectFrom("guest_activity_responses")
    .innerJoin("activities", "activities.id", "guest_activity_responses.activity_id")
    .innerJoin("guests", "guests.id", "guest_activity_responses.guest_id")
    .innerJoin("households", "households.id", "guests.household_id")
    .select(["households.name as household", "guests.first_name as firstName", "guests.last_name as lastName", "activities.label as activity", "guest_activity_responses.response as response", "guest_activity_responses.note as note"])
    .where("activities.label", "ilike", "%wijn%")
    .orderBy("households.name")
    .execute();
}

async function carpoolExportRows() {
  const rides = await getRideOffers();
  return rides.flatMap((ride) => {
    if (ride.passengers.length === 0) {
      return [{ driver: ride.driverName, fromLocation: ride.fromLocation, seatsAvailable: ride.seatsAvailable, status: ride.status, passenger: "", notes: ride.notes ?? "" }];
    }
    return ride.passengers.map((passenger) => ({ driver: ride.driverName, fromLocation: ride.fromLocation, seatsAvailable: ride.seatsAvailable, status: ride.status, passenger: passenger.guestName, notes: ride.notes ?? "" }));
  });
}

async function generateInviteLinks() {
  const households = await db.selectFrom("households").select(["id", "name"]).orderBy("name").execute();
  await db.updateTable("invite_tokens").set({ revoked_at: new Date() }).where("revoked_at", "is", null).execute();
  const base = env.PUBLIC_SITE_URL.replace(/\/$/, "");
  const links = [];
  for (const household of households) {
    const token = createRandomToken(24);
    await db.insertInto("invite_tokens").values({
      household_id: household.id,
      token_hash: hashToken(token),
      token_preview: token.slice(0, 8)
    }).execute();
    links.push({ householdId: household.id, householdName: household.name, url: base + "/invite/" + token });
  }
  return links;
}

function sendCsv(reply: FastifyReply, filename: string, csv: string) {
  reply.header("content-type", "text/csv; charset=utf-8");
  reply.header("content-disposition", "attachment; filename=\"" + filename + "\"");
  return reply.send(csv);
}


