import type {
  ActivityResponse,
  AdminReport,
  Household,
  InviteTokenExport,
  MenuSelection,
  RideOffer,
  RideOfferCreate,
  RsvpUpdate,
  WeddingContent
} from "@aislewright/shared";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface GuestState {
  household: Household;
  menuSelections: MenuSelection[];
  activityResponses: ActivityResponse[];
  rides: RideOffer[];
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(API_URL + path, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });
  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = await response.json();
      message = data.error ?? message;
    } catch {
      message = response.statusText;
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const api = {
  setupStatus: () => requestJson<{ needsOwnerSetup: boolean }>("/setup/status"),
  ownerSetup: (body: { name: string; email: string; password: string }) => requestJson<{ owner: { id: string; name: string; email: string } }>("/auth/owner/setup", { method: "POST", body: JSON.stringify(body) }),
  ownerLogin: (body: { email: string; password: string }) => requestJson<{ owner: { id: string; name: string; email: string } }>("/auth/owner/login", { method: "POST", body: JSON.stringify(body) }),
  ownerMe: () => requestJson<{ owner: { id: string; name: string; email: string } }>("/auth/owner/me"),
  content: () => requestJson<WeddingContent>("/content"),
  adminContent: () => requestJson<WeddingContent>("/admin/content"),
  saveContent: (content: WeddingContent) => requestJson<WeddingContent>("/admin/content", { method: "PUT", body: JSON.stringify(content) }),
  invite: (token: string) => requestJson<GuestState>("/invite/" + token),
  me: () => requestJson<GuestState>("/me"),
  saveRsvp: (body: RsvpUpdate) => requestJson<GuestState>("/me/rsvp", { method: "PATCH", body: JSON.stringify(body) }),
  saveMenu: (body: { selections: MenuSelection[] }) => requestJson<GuestState>("/me/menu", { method: "PATCH", body: JSON.stringify(body) }),
  saveActivities: (body: { responses: ActivityResponse[] }) => requestJson<GuestState>("/me/activities", { method: "PATCH", body: JSON.stringify(body) }),
  createRide: (body: RideOfferCreate) => requestJson<{ rides: RideOffer[] }>("/rides/offers", { method: "POST", body: JSON.stringify(body) }),
  joinRide: (offerId: string, guestId: string) => requestJson<{ rides: RideOffer[] }>("/rides/offers/" + offerId + "/passengers", { method: "POST", body: JSON.stringify({ guestId }) }),
  removePassenger: (offerId: string, guestId: string) => requestJson<{ rides: RideOffer[] }>("/rides/offers/" + offerId + "/passengers/" + guestId, { method: "DELETE" }),
  closeRide: (offerId: string) => requestJson<{ rides: RideOffer[] }>("/rides/offers/" + offerId, { method: "DELETE" }),
  households: () => requestJson<{ households: Household[] }>("/admin/households"),
  createHousehold: (body: unknown) => requestJson<{ households: Household[] }>("/admin/households", { method: "POST", body: JSON.stringify(body) }),
  addGuest: (householdId: string, body: unknown) => requestJson<{ households: Household[] }>("/admin/households/" + householdId + "/guests", { method: "POST", body: JSON.stringify(body) }),
  report: () => requestJson<AdminReport>("/admin/reports/summary"),
  generateInvites: () => requestJson<{ invites: InviteTokenExport[] }>("/admin/exports/invites", { method: "POST" })
};

export function exportUrl(path: string) {
  return API_URL + path;
}
