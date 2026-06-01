import { z } from "zod";

export const RsvpStatusSchema = z.enum(["unknown", "attending", "declined"]);
export type RsvpStatus = z.infer<typeof RsvpStatusSchema>;

export const ConfigSchema = z.object({
  edition: z.literal("self-host"),
  siteUrl: z.string(),
  features: z.object({
    rsvp: z.boolean(),
    menu: z.boolean(),
    activities: z.boolean(),
    carpool: z.boolean(),
    exports: z.boolean()
  })
});
export type Config = z.infer<typeof ConfigSchema>;

export const WeddingSettingsSchema = z.object({
  coupleNames: z.string().min(1),
  tagline: z.string().min(1),
  weddingDate: z.string().min(1),
  locale: z.string().default("nl"),
  locationName: z.string().min(1),
  locationSummary: z.string().min(1),
  heroImageUrl: z.string().optional().nullable(),
  theme: z.object({
    background: z.string(),
    surface: z.string(),
    ink: z.string(),
    muted: z.string(),
    accent: z.string(),
    accentStrong: z.string()
  })
});
export type WeddingSettings = z.infer<typeof WeddingSettingsSchema>;

export const ContentSectionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  body: z.string(),
  sortOrder: z.number()
});
export type ContentSection = z.infer<typeof ContentSectionSchema>;

export const ScheduleDaySchema = z.object({
  id: z.string(),
  label: z.string(),
  date: z.string(),
  events: z.array(z.object({
    id: z.string(),
    time: z.string(),
    title: z.string(),
    description: z.string(),
    location: z.string().optional().nullable()
  }))
});
export type ScheduleDay = z.infer<typeof ScheduleDaySchema>;

export const FaqSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  sortOrder: z.number()
});
export type Faq = z.infer<typeof FaqSchema>;

export const MenuCourseSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional().nullable(),
  options: z.array(z.object({
    id: z.string(),
    label: z.string(),
    description: z.string().optional().nullable(),
    dietaryTags: z.array(z.string())
  }))
});
export type MenuCourse = z.infer<typeof MenuCourseSchema>;

export const ActivitySchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  responseKind: z.enum(["yes_no", "choice"]),
  options: z.array(z.string())
});
export type Activity = z.infer<typeof ActivitySchema>;

export const WeddingContentSchema = z.object({
  settings: WeddingSettingsSchema,
  sections: z.array(ContentSectionSchema),
  schedule: z.array(ScheduleDaySchema),
  faqs: z.array(FaqSchema),
  menu: z.array(MenuCourseSchema),
  activities: z.array(ActivitySchema)
});
export type WeddingContent = z.infer<typeof WeddingContentSchema>;

export const GuestSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  rsvpStatus: RsvpStatusSchema,
  dietaryConfirmed: z.boolean(),
  dietaryNotes: z.string().nullable(),
  allergyNotes: z.string().nullable(),
  isChild: z.boolean(),
  plusOne: z.boolean()
});
export type Guest = z.infer<typeof GuestSchema>;

export const HouseholdSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  notes: z.string().nullable(),
  guests: z.array(GuestSchema)
});
export type Household = z.infer<typeof HouseholdSchema>;

export const InviteTokenExportSchema = z.object({
  householdId: z.string(),
  householdName: z.string(),
  url: z.string()
});
export type InviteTokenExport = z.infer<typeof InviteTokenExportSchema>;

export const RsvpUpdateSchema = z.object({
  guests: z.array(z.object({
    id: z.string(),
    rsvpStatus: RsvpStatusSchema,
    dietaryConfirmed: z.boolean(),
    dietaryNotes: z.string().nullable(),
    allergyNotes: z.string().nullable()
  }))
});
export type RsvpUpdate = z.infer<typeof RsvpUpdateSchema>;

export const MenuSelectionSchema = z.object({
  guestId: z.string(),
  courseId: z.string(),
  optionId: z.string().nullable(),
  noneWorks: z.boolean(),
  note: z.string().nullable()
});
export type MenuSelection = z.infer<typeof MenuSelectionSchema>;

export const MenuUpdateSchema = z.object({
  selections: z.array(MenuSelectionSchema)
});

export const ActivityResponseSchema = z.object({
  guestId: z.string(),
  activityId: z.string(),
  response: z.string(),
  note: z.string().nullable()
});
export type ActivityResponse = z.infer<typeof ActivityResponseSchema>;

export const ActivityUpdateSchema = z.object({
  responses: z.array(ActivityResponseSchema)
});

export const RideOfferSchema = z.object({
  id: z.string(),
  driverGuestId: z.string(),
  driverName: z.string(),
  fromLocation: z.string(),
  seatsAvailable: z.number(),
  notes: z.string().nullable(),
  status: z.enum(["open", "full", "closed"]),
  passengers: z.array(z.object({
    guestId: z.string(),
    guestName: z.string()
  }))
});
export type RideOffer = z.infer<typeof RideOfferSchema>;

export const RideOfferCreateSchema = z.object({
  driverGuestId: z.string(),
  fromLocation: z.string().min(1),
  seatsAvailable: z.number().int().min(1).max(12),
  notes: z.string().nullable().optional()
});
export type RideOfferCreate = z.infer<typeof RideOfferCreateSchema>;

export const AdminReportSchema = z.object({
  households: z.number(),
  guests: z.number(),
  attending: z.number(),
  declined: z.number(),
  unknown: z.number(),
  dietaryUnconfirmed: z.number(),
  wineYes: z.number(),
  openRideSeats: z.number()
});
export type AdminReport = z.infer<typeof AdminReportSchema>;
