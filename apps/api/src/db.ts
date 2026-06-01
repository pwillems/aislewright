import { Kysely, PostgresDialect, Generated, ColumnType, JSONColumnType } from "kysely";
import { Pool } from "pg";
import { env } from "./env.js";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type GeneratedUuid = Generated<string>;

export interface WeddingSettingsTable {
  id: ColumnType<number, number | undefined, number>;
  couple_names: string;
  tagline: string;
  wedding_date: string;
  locale: string;
  location_name: string;
  location_summary: string;
  hero_image_url: string | null;
  theme: JSONColumnType<Record<string, string>, Record<string, string>, Record<string, string>>;
  updated_at: Timestamp;
}

export interface ContentSectionsTable {
  id: GeneratedUuid;
  slug: string;
  title: string;
  body: string;
  sort_order: number;
}

export interface ScheduleDaysTable {
  id: GeneratedUuid;
  label: string;
  event_date: string;
  sort_order: number;
}

export interface ScheduleEventsTable {
  id: GeneratedUuid;
  day_id: string;
  event_time: string;
  title: string;
  description: string;
  location: string | null;
  sort_order: number;
}

export interface FaqsTable {
  id: GeneratedUuid;
  question: string;
  answer: string;
  sort_order: number;
}

export interface MenuCoursesTable {
  id: GeneratedUuid;
  label: string;
  description: string | null;
  sort_order: number;
}

export interface MenuOptionsTable {
  id: GeneratedUuid;
  course_id: string;
  label: string;
  description: string | null;
  dietary_tags: string[];
  sort_order: number;
}

export interface ActivitiesTable {
  id: GeneratedUuid;
  label: string;
  description: string;
  response_kind: "yes_no" | "choice";
  options: string[];
  sort_order: number;
}

export interface HouseholdsTable {
  id: GeneratedUuid;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface GuestsTable {
  id: GeneratedUuid;
  household_id: string;
  first_name: string;
  last_name: string;
  rsvp_status: "unknown" | "attending" | "declined";
  dietary_confirmed: boolean;
  dietary_notes: string | null;
  allergy_notes: string | null;
  is_child: boolean;
  plus_one: boolean;
  sort_order: number;
  updated_at: Timestamp;
}

export interface InviteTokensTable {
  id: GeneratedUuid;
  household_id: string;
  token_hash: string;
  token_preview: string;
  created_at: Timestamp;
  last_used_at: Timestamp | null;
  revoked_at: Timestamp | null;
}

export interface OwnersTable {
  id: GeneratedUuid;
  name: string;
  email: string;
  password_hash: string;
  created_at: Timestamp;
}

export interface SessionsTable {
  id: GeneratedUuid;
  kind: "owner" | "guest";
  token_hash: string;
  owner_id: string | null;
  household_id: string | null;
  expires_at: Timestamp;
  created_at: Timestamp;
}

export interface GuestMenuSelectionsTable {
  guest_id: string;
  course_id: string;
  option_id: string | null;
  none_works: boolean;
  note: string | null;
  updated_at: Timestamp;
}

export interface GuestActivityResponsesTable {
  guest_id: string;
  activity_id: string;
  response: string;
  note: string | null;
  updated_at: Timestamp;
}

export interface RideOffersTable {
  id: GeneratedUuid;
  driver_guest_id: string;
  from_location: string;
  seats_available: number;
  notes: string | null;
  status: "open" | "full" | "closed";
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface RidePassengersTable {
  offer_id: string;
  guest_id: string;
  created_at: Timestamp;
}

export interface DB {
  wedding_settings: WeddingSettingsTable;
  content_sections: ContentSectionsTable;
  schedule_days: ScheduleDaysTable;
  schedule_events: ScheduleEventsTable;
  faqs: FaqsTable;
  menu_courses: MenuCoursesTable;
  menu_options: MenuOptionsTable;
  activities: ActivitiesTable;
  households: HouseholdsTable;
  guests: GuestsTable;
  invite_tokens: InviteTokensTable;
  owners: OwnersTable;
  sessions: SessionsTable;
  guest_menu_selections: GuestMenuSelectionsTable;
  guest_activity_responses: GuestActivityResponsesTable;
  ride_offers: RideOffersTable;
  ride_passengers: RidePassengersTable;
}

export const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool })
});

export async function closeDb() {
  await db.destroy();
  await pool.end().catch(() => undefined);
}

