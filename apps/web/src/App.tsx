import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Car, Download, Heart, Lock, Plus, Save, Users, Wine } from "lucide-react";
import type { ActivityResponse, Guest, Household, MenuSelection, RideOffer, WeddingContent } from "@aislewright/shared";
import { api, exportUrl, type GuestState } from "./api";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/guest" element={<GuestPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}

function Button({ children, type = "button", variant = "primary", onClick, disabled }: {
  children: React.ReactNode;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const variants = {
    primary: "bg-[var(--accent-strong)] text-white hover:opacity-95",
    secondary: "bg-[var(--accent)] text-white hover:opacity-95",
    ghost: "bg-transparent text-[var(--ink)] ring-1 ring-black/10 hover:bg-black/5"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={"focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 " + variants[variant]}>
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={"rounded-md border border-black/10 bg-[var(--surface)] p-5 shadow-soft " + className}>{children}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-[var(--ink)]">
      <span>{label}</span>
      {children}
    </label>
  );
}

const inputClass = "focus-ring min-h-11 rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-[var(--ink)]";
const textareaClass = "focus-ring min-h-28 rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-[var(--ink)]";

function useContent() {
  return useQuery({ queryKey: ["content"], queryFn: api.content });
}

function ApplyTheme({ content }: { content?: WeddingContent }) {
  useEffect(() => {
    if (!content) return;
    const root = document.documentElement;
    const theme = content.settings.theme;
    root.style.setProperty("--background", theme.background);
    root.style.setProperty("--surface", theme.surface);
    root.style.setProperty("--ink", theme.ink);
    root.style.setProperty("--muted", theme.muted);
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--accent-strong", theme.accentStrong);
    root.style.setProperty("--hero-image", "url('" + (content.settings.heroImageUrl ?? "") + "')");
  }, [content]);
  return null;
}

function PublicNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-[var(--surface)]/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="font-serif text-xl font-semibold">Aislewright</Link>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <a href="#programma" className="rounded-md px-3 py-2 hover:bg-black/5">Programma</a>
          <a href="#praktisch" className="rounded-md px-3 py-2 hover:bg-black/5">Praktisch</a>
          <Link to="/guest" className="rounded-md px-3 py-2 hover:bg-black/5">Mijn RSVP</Link>
          <Link to="/admin" className="rounded-md px-3 py-2 hover:bg-black/5">Admin</Link>
        </div>
      </nav>
    </header>
  );
}

function HomePage() {
  const contentQuery = useContent();
  const content = contentQuery.data;
  return (
    <div>
      <ApplyTheme content={content} />
      <PublicNav />
      {contentQuery.isLoading && <main className="mx-auto max-w-6xl px-4 py-12">Laden...</main>}
      {content && (
        <main>
          <section className="hero-photo min-h-[68vh] px-4 py-20 text-white">
            <div className="mx-auto flex min-h-[52vh] max-w-6xl flex-col justify-end">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em]">{content.settings.weddingDate}</p>
              <h1 className="max-w-3xl font-serif text-5xl font-semibold leading-tight md:text-7xl">{content.settings.coupleNames}</h1>
              <p className="mt-5 max-w-2xl text-xl text-white/90">{content.settings.tagline}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/guest"><Button><Heart size={18} /> RSVP invullen</Button></Link>
                <a href="#programma"><Button variant="ghost"><CalendarDays size={18} /> Bekijk programma</Button></a>
              </div>
            </div>
          </section>

          <section className="mx-auto grid max-w-6xl gap-5 px-4 py-10 md:grid-cols-[1.2fr_0.8fr]">
            {content.sections.map((section) => (
              <Card key={section.id}>
                <p className="mb-2 text-sm font-semibold text-[var(--accent-strong)]">{section.slug}</p>
                <h2 className="font-serif text-3xl font-semibold">{section.title}</h2>
                <p className="mt-3 whitespace-pre-line text-[var(--muted)]">{section.body}</p>
              </Card>
            ))}
          </section>

          <section id="programma" className="border-y border-black/10 bg-white/35 px-4 py-10">
            <div className="mx-auto max-w-6xl">
              <h2 className="font-serif text-4xl font-semibold">Programma</h2>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {content.schedule.map((day) => (
                  <Card key={day.id}>
                    <p className="text-sm font-semibold text-[var(--accent-strong)]">{day.date}</p>
                    <h3 className="font-serif text-2xl font-semibold">{day.label}</h3>
                    <div className="mt-4 grid gap-3">
                      {day.events.map((event) => (
                        <div key={event.id} className="grid grid-cols-[4.5rem_1fr] gap-3 border-t border-black/10 pt-3">
                          <span className="font-semibold">{event.time}</span>
                          <span><strong>{event.title}</strong><br /><span className="text-sm text-[var(--muted)]">{event.description}</span></span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          <section id="praktisch" className="mx-auto max-w-6xl px-4 py-10">
            <h2 className="font-serif text-4xl font-semibold">Praktisch</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {content.faqs.map((faq) => (
                <Card key={faq.id}>
                  <h3 className="font-semibold">{faq.question}</h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">{faq.answer}</p>
                </Card>
              ))}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inviteMutation = useMutation({
    mutationFn: () => api.invite(token ?? ""),
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      navigate("/guest");
    }
  });
  useEffect(() => {
    inviteMutation.mutate();
  }, [token]);
  return (
    <CenteredPage icon={<Lock size={24} />} title="Uitnodiging openen">
      {inviteMutation.isPending && <p className="text-[var(--muted)]">We openen je persoonlijke RSVP-link.</p>}
      {inviteMutation.error && <p className="text-red-700">{inviteMutation.error.message}</p>}
    </CenteredPage>
  );
}

function CenteredPage({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white">{icon}</div>
        <h1 className="font-serif text-3xl font-semibold">{title}</h1>
        <div className="mt-4">{children}</div>
      </Card>
    </main>
  );
}

function GuestPage() {
  const contentQuery = useContent();
  const meQuery = useQuery({ queryKey: ["me"], queryFn: api.me, retry: false });
  const content = contentQuery.data;
  return (
    <div>
      <ApplyTheme content={content} />
      <PublicNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {meQuery.isLoading && <p>Laden...</p>}
        {meQuery.error && (
          <Card>
            <h1 className="font-serif text-3xl font-semibold">Open je uitnodiging</h1>
            <p className="mt-2 text-[var(--muted)]">Gebruik de persoonlijke link of QR-code op je uitnodiging om je RSVP in te vullen.</p>
          </Card>
        )}
        {content && meQuery.data && <GuestWorkspace content={content} state={meQuery.data} />}
      </main>
    </div>
  );
}

function GuestWorkspace({ content, state }: { content: WeddingContent; state: GuestState }) {
  const queryClient = useQueryClient();
  const [rsvp, setRsvp] = useState<Record<string, Pick<Guest, "id" | "rsvpStatus" | "dietaryConfirmed" | "dietaryNotes" | "allergyNotes">>>({});
  const [menu, setMenu] = useState<Record<string, MenuSelection>>({});
  const [activities, setActivities] = useState<Record<string, ActivityResponse>>({});
  const [rideForm, setRideForm] = useState({ driverGuestId: state.household.guests[0]?.id ?? "", fromLocation: "", seatsAvailable: 2, notes: "" });

  useEffect(() => {
    const nextRsvp: Record<string, Pick<Guest, "id" | "rsvpStatus" | "dietaryConfirmed" | "dietaryNotes" | "allergyNotes">> = {};
    for (const guest of state.household.guests) {
      nextRsvp[guest.id] = {
        id: guest.id,
        rsvpStatus: guest.rsvpStatus,
        dietaryConfirmed: guest.dietaryConfirmed,
        dietaryNotes: guest.dietaryNotes,
        allergyNotes: guest.allergyNotes
      };
    }
    setRsvp(nextRsvp);
    const nextMenu: Record<string, MenuSelection> = {};
    for (const selection of state.menuSelections) nextMenu[selection.guestId + ":" + selection.courseId] = selection;
    setMenu(nextMenu);
    const nextActivities: Record<string, ActivityResponse> = {};
    for (const response of state.activityResponses) nextActivities[response.guestId + ":" + response.activityId] = response;
    setActivities(nextActivities);
  }, [state]);

  const saveRsvp = useMutation({ mutationFn: () => api.saveRsvp({ guests: Object.values(rsvp) }), onSuccess: (data) => queryClient.setQueryData(["me"], data) });
  const saveMenu = useMutation({ mutationFn: () => api.saveMenu({ selections: Object.values(menu) }), onSuccess: (data) => queryClient.setQueryData(["me"], data) });
  const saveActivities = useMutation({ mutationFn: () => api.saveActivities({ responses: Object.values(activities) }), onSuccess: (data) => queryClient.setQueryData(["me"], data) });
  const createRide = useMutation({ mutationFn: () => api.createRide({ ...rideForm, notes: rideForm.notes || null }), onSuccess: (data) => queryClient.setQueryData(["me"], { ...state, rides: data.rides }) });
  const joinRide = useMutation({ mutationFn: ({ offerId, guestId }: { offerId: string; guestId: string }) => api.joinRide(offerId, guestId), onSuccess: (data) => queryClient.setQueryData(["me"], { ...state, rides: data.rides }) });
  const removePassenger = useMutation({ mutationFn: ({ offerId, guestId }: { offerId: string; guestId: string }) => api.removePassenger(offerId, guestId), onSuccess: (data) => queryClient.setQueryData(["me"], { ...state, rides: data.rides }) });
  const closeRide = useMutation({ mutationFn: (offerId: string) => api.closeRide(offerId), onSuccess: (data) => queryClient.setQueryData(["me"], { ...state, rides: data.rides }) });

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-strong)]">{state.household.name}</p>
        <h1 className="font-serif text-4xl font-semibold">Mijn RSVP</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">Vul per persoon RSVP, dieetwensen, menu-keuzes en vrijdagactiviteiten in. Je kunt dit later via dezelfde link aanpassen.</p>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-2xl font-semibold">Aanwezigheid en dieet</h2>
          <Button onClick={() => saveRsvp.mutate()} disabled={saveRsvp.isPending}><Save size={18} /> Opslaan</Button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {state.household.guests.map((guest) => {
            const value = rsvp[guest.id];
            if (!value) return null;
            return (
              <div key={guest.id} className="rounded-md border border-black/10 bg-white/60 p-4">
                <h3 className="font-semibold">{guest.firstName} {guest.lastName}</h3>
                <div className="mt-3 grid gap-3">
                  <Field label="Kom je erbij?">
                    <select className={inputClass} value={value.rsvpStatus} onChange={(event) => setRsvp({ ...rsvp, [guest.id]: { ...value, rsvpStatus: event.target.value as Guest["rsvpStatus"] } })}>
                      <option value="unknown">Nog onbekend</option>
                      <option value="attending">Ja</option>
                      <option value="declined">Nee</option>
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={value.dietaryConfirmed} onChange={(event) => setRsvp({ ...rsvp, [guest.id]: { ...value, dietaryConfirmed: event.target.checked } })} /> Dieetinformatie klopt
                  </label>
                  <Field label="Dieetwensen">
                    <textarea className={textareaClass} value={value.dietaryNotes ?? ""} onChange={(event) => setRsvp({ ...rsvp, [guest.id]: { ...value, dietaryNotes: event.target.value || null } })} />
                  </Field>
                  <Field label="Allergieen">
                    <textarea className={textareaClass} value={value.allergyNotes ?? ""} onChange={(event) => setRsvp({ ...rsvp, [guest.id]: { ...value, allergyNotes: event.target.value || null } })} />
                  </Field>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-2xl font-semibold">Menu-keuzes</h2>
          <Button onClick={() => saveMenu.mutate()} disabled={saveMenu.isPending}><Save size={18} /> Menu opslaan</Button>
        </div>
        <div className="mt-5 grid gap-5">
          {state.household.guests.map((guest) => (
            <div key={guest.id} className="rounded-md border border-black/10 bg-white/60 p-4">
              <h3 className="font-semibold">{guest.firstName} {guest.lastName}</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {content.menu.map((course) => {
                  const key = guest.id + ":" + course.id;
                  const current = menu[key] ?? { guestId: guest.id, courseId: course.id, optionId: null, noneWorks: false, note: null };
                  return (
                    <Field key={course.id} label={course.label}>
                      <select className={inputClass} value={current.noneWorks ? "none" : current.optionId ?? ""} onChange={(event) => {
                        const value = event.target.value;
                        setMenu({ ...menu, [key]: { ...current, optionId: value && value !== "none" ? value : null, noneWorks: value === "none" } });
                      }}>
                        <option value="">Kies...</option>
                        {course.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                        <option value="none">Niets past door dieet</option>
                      </select>
                    </Field>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-2xl font-semibold">Vrijdagactiviteiten</h2>
          <Button onClick={() => saveActivities.mutate()} disabled={saveActivities.isPending}><Wine size={18} /> Opslaan</Button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {state.household.guests.map((guest) => (
            <div key={guest.id} className="rounded-md border border-black/10 bg-white/60 p-4">
              <h3 className="font-semibold">{guest.firstName} {guest.lastName}</h3>
              <div className="mt-3 grid gap-3">
                {content.activities.map((activity) => {
                  const key = guest.id + ":" + activity.id;
                  const current = activities[key] ?? { guestId: guest.id, activityId: activity.id, response: "", note: null };
                  return (
                    <Field key={activity.id} label={activity.label}>
                      <select className={inputClass} value={current.response} onChange={(event) => setActivities({ ...activities, [key]: { ...current, response: event.target.value } })}>
                        <option value="">Kies...</option>
                        {activity.options.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </Field>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-3">
          <Car className="text-[var(--accent-strong)]" />
          <h2 className="font-serif text-2xl font-semibold">Carpooling</h2>
        </div>
        <form className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_7rem_auto]" onSubmit={(event) => { event.preventDefault(); createRide.mutate(); }}>
          <Field label="Bestuurder">
            <select className={inputClass} value={rideForm.driverGuestId} onChange={(event) => setRideForm({ ...rideForm, driverGuestId: event.target.value })}>
              {state.household.guests.map((guest) => <option key={guest.id} value={guest.id}>{guest.firstName} {guest.lastName}</option>)}
            </select>
          </Field>
          <Field label="Vertrekplaats">
            <input className={inputClass} value={rideForm.fromLocation} onChange={(event) => setRideForm({ ...rideForm, fromLocation: event.target.value })} placeholder="Bijv. Utrecht" />
          </Field>
          <Field label="Plekken">
            <input className={inputClass} type="number" min={1} max={12} value={rideForm.seatsAvailable} onChange={(event) => setRideForm({ ...rideForm, seatsAvailable: Number(event.target.value) })} />
          </Field>
          <div className="flex items-end"><Button type="submit" disabled={createRide.isPending}><Plus size={18} /> Rit</Button></div>
        </form>
        <div className="mt-5 grid gap-3">
          {state.rides.map((ride) => <RideRow key={ride.id} ride={ride} household={state.household} onJoin={(guestId) => joinRide.mutate({ offerId: ride.id, guestId })} onRemove={(guestId) => removePassenger.mutate({ offerId: ride.id, guestId })} onClose={() => closeRide.mutate(ride.id)} />)}
          {state.rides.length === 0 && <p className="text-sm text-[var(--muted)]">Er zijn nog geen ritten aangeboden.</p>}
        </div>
      </Card>
    </div>
  );
}

function RideRow({ ride, household, onJoin, onRemove, onClose }: { ride: RideOffer; household: Household; onJoin: (guestId: string) => void; onRemove: (guestId: string) => void; onClose: () => void }) {
  const householdGuestIds = new Set(household.guests.map((guest) => guest.id));
  const driverIsHere = householdGuestIds.has(ride.driverGuestId);
  const passengerIds = new Set(ride.passengers.map((passenger) => passenger.guestId));
  const joinableGuests = household.guests.filter((guest) => guest.id !== ride.driverGuestId && !passengerIds.has(guest.id));
  return (
    <div className="rounded-md border border-black/10 bg-white/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{ride.driverName} rijdt vanaf {ride.fromLocation}</p>
          <p className="text-sm text-[var(--muted)]">{ride.passengers.length}/{ride.seatsAvailable} plekken bezet · {ride.status}</p>
          {ride.passengers.length > 0 && <p className="mt-2 text-sm">Passagiers: {ride.passengers.map((p) => p.guestName).join(", ")}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {joinableGuests.map((guest) => <Button key={guest.id} variant="ghost" onClick={() => onJoin(guest.id)}>+ {guest.firstName}</Button>)}
          {ride.passengers.filter((passenger) => householdGuestIds.has(passenger.guestId)).map((passenger) => <Button key={passenger.guestId} variant="ghost" onClick={() => onRemove(passenger.guestId)}>Verwijder {passenger.guestName}</Button>)}
          {driverIsHere && <Button variant="ghost" onClick={onClose}>Sluit rit</Button>}
        </div>
      </div>
    </div>
  );
}

function AdminPage() {
  const setupQuery = useQuery({ queryKey: ["setup-status"], queryFn: api.setupStatus });
  const ownerQuery = useQuery({ queryKey: ["owner"], queryFn: api.ownerMe, retry: false, enabled: setupQuery.data?.needsOwnerSetup === false });
  if (setupQuery.isLoading) return <CenteredPage icon={<Lock size={24} />} title="Admin laden"><p>Laden...</p></CenteredPage>;
  if (setupQuery.data?.needsOwnerSetup) return <OwnerSetup />;
  if (ownerQuery.isLoading) return <CenteredPage icon={<Lock size={24} />} title="Admin laden"><p>Laden...</p></CenteredPage>;
  if (ownerQuery.error) return <OwnerLogin />;
  return <AdminWorkspace />;
}

function OwnerSetup() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const mutation = useMutation({ mutationFn: () => api.ownerSetup(form), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["setup-status"] }); queryClient.invalidateQueries({ queryKey: ["owner"] }); } });
  return (
    <CenteredPage icon={<Lock size={24} />} title="Eerste eigenaar instellen">
      <form className="grid gap-3 text-left" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
        <Field label="Naam"><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label="E-mail"><input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <Field label="Wachtwoord"><input className={inputClass} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>
        {mutation.error && <p className="text-sm text-red-700">{mutation.error.message}</p>}
        <Button type="submit" disabled={mutation.isPending}>Eigenaar maken</Button>
      </form>
    </CenteredPage>
  );
}

function OwnerLogin() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: "", password: "" });
  const mutation = useMutation({ mutationFn: () => api.ownerLogin(form), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["owner"] }) });
  return (
    <CenteredPage icon={<Lock size={24} />} title="Admin login">
      <form className="grid gap-3 text-left" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
        <Field label="E-mail"><input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <Field label="Wachtwoord"><input className={inputClass} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>
        {mutation.error && <p className="text-sm text-red-700">{mutation.error.message}</p>}
        <Button type="submit" disabled={mutation.isPending}>Inloggen</Button>
      </form>
    </CenteredPage>
  );
}

function AdminWorkspace() {
  const [tab, setTab] = useState("dashboard");
  return (
    <div>
      <header className="border-b border-black/10 bg-[var(--surface)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-serif text-2xl font-semibold">Aislewright admin</Link>
          <nav className="flex flex-wrap gap-2 text-sm font-semibold">
            {[
              ["dashboard", "Dashboard"],
              ["content", "Content"],
              ["households", "Gasten"],
              ["reports", "Rapporten"]
            ].map(([id, label]) => (
              <button key={id} className={"rounded-md px-3 py-2 " + (tab === id ? "bg-[var(--accent-strong)] text-white" : "hover:bg-black/5")} onClick={() => setTab(id)}>{label}</button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        {tab === "dashboard" && <AdminDashboard />}
        {tab === "content" && <ContentEditor />}
        {tab === "households" && <HouseholdManager />}
        {tab === "reports" && <Reports />}
      </main>
    </div>
  );
}

function AdminDashboard() {
  const reportQuery = useQuery({ queryKey: ["report"], queryFn: api.report });
  const report = reportQuery.data;
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Self-host core</p>
        <h1 className="font-serif text-4xl font-semibold">Aislewright dashboard</h1>
      </div>
      {report && (
        <div className="grid gap-4 md:grid-cols-4">
          <Metric icon={<Users />} label="Gasten" value={report.guests} />
          <Metric icon={<Heart />} label="Aanwezig" value={report.attending} />
          <Metric icon={<Wine />} label="Wijnproeverij ja" value={report.wineYes} />
          <Metric icon={<Car />} label="Open carpoolplekken" value={report.openRideSeats} />
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <div className="flex items-center gap-3 text-[var(--accent-strong)]">{icon}<span className="text-sm font-semibold text-[var(--muted)]">{label}</span></div>
      <p className="mt-4 font-serif text-4xl font-semibold">{value}</p>
    </Card>
  );
}

function ContentEditor() {
  const queryClient = useQueryClient();
  const contentQuery = useQuery({ queryKey: ["admin-content"], queryFn: api.adminContent });
  const [draft, setDraft] = useState<WeddingContent | null>(null);
  useEffect(() => {
    if (contentQuery.data) setDraft(contentQuery.data);
  }, [contentQuery.data]);
  const mutation = useMutation({ mutationFn: () => api.saveContent(draft!), onSuccess: (data) => { queryClient.setQueryData(["admin-content"], data); queryClient.invalidateQueries({ queryKey: ["content"] }); } });
  if (!draft) return <p>Laden...</p>;
  return (
    <form className="grid gap-6" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold">Content</h1>
          <p className="text-[var(--muted)]">Pas de belangrijkste site-informatie aan. Menu, activiteiten en schema zitten al in dezelfde contentstructuur.</p>
        </div>
        <Button type="submit" disabled={mutation.isPending}><Save size={18} /> Content opslaan</Button>
      </div>
      <Card>
        <h2 className="font-serif text-2xl font-semibold">Algemeen</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Namen"><input className={inputClass} value={draft.settings.coupleNames} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, coupleNames: event.target.value } })} /></Field>
          <Field label="Datum"><input className={inputClass} value={draft.settings.weddingDate} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, weddingDate: event.target.value } })} /></Field>
          <Field label="Tagline"><input className={inputClass} value={draft.settings.tagline} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, tagline: event.target.value } })} /></Field>
          <Field label="Locatie"><input className={inputClass} value={draft.settings.locationName} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, locationName: event.target.value } })} /></Field>
          <Field label="Hero-afbeelding URL"><input className={inputClass} value={draft.settings.heroImageUrl ?? ""} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, heroImageUrl: event.target.value || null } })} /></Field>
          <Field label="Locatiesamenvatting"><textarea className={textareaClass} value={draft.settings.locationSummary} onChange={(event) => setDraft({ ...draft, settings: { ...draft.settings, locationSummary: event.target.value } })} /></Field>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {draft.sections.map((section, index) => (
          <Card key={section.id}>
            <Field label="Titel"><input className={inputClass} value={section.title} onChange={(event) => {
              const sections = [...draft.sections];
              sections[index] = { ...section, title: event.target.value };
              setDraft({ ...draft, sections });
            }} /></Field>
            <div className="mt-3"><Field label="Tekst"><textarea className={textareaClass} value={section.body} onChange={(event) => {
              const sections = [...draft.sections];
              sections[index] = { ...section, body: event.target.value };
              setDraft({ ...draft, sections });
            }} /></Field></div>
          </Card>
        ))}
      </div>
    </form>
  );
}

function HouseholdManager() {
  const queryClient = useQueryClient();
  const householdsQuery = useQuery({ queryKey: ["households"], queryFn: api.households });
  const [form, setForm] = useState({ name: "", email: "", firstName: "", lastName: "" });
  const mutation = useMutation({
    mutationFn: () => api.createHousehold({ name: form.name, email: form.email || null, guests: [{ firstName: form.firstName, lastName: form.lastName }] }),
    onSuccess: (data) => { queryClient.setQueryData(["households"], data); setForm({ name: "", email: "", firstName: "", lastName: "" }); }
  });
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-serif text-4xl font-semibold">Gasten en huishoudens</h1>
        <p className="text-[var(--muted)]">Magic links worden per huishouden gegenereerd onder Rapporten.</p>
      </div>
      <Card>
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
          <Field label="Huishouden"><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="E-mail"><input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <Field label="Voornaam"><input className={inputClass} value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></Field>
          <Field label="Achternaam"><input className={inputClass} value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></Field>
          <div className="flex items-end"><Button type="submit" disabled={mutation.isPending}><Plus size={18} /> Toevoegen</Button></div>
        </form>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {householdsQuery.data?.households.map((household) => (
          <Card key={household.id}>
            <h2 className="font-serif text-2xl font-semibold">{household.name}</h2>
            <p className="text-sm text-[var(--muted)]">{household.email ?? "Geen e-mail"}</p>
            <ul className="mt-4 grid gap-2 text-sm">
              {household.guests.map((guest) => <li key={guest.id} className="rounded-md bg-white/70 px-3 py-2">{guest.firstName} {guest.lastName} · {guest.rsvpStatus}</li>)}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Reports() {
  const reportQuery = useQuery({ queryKey: ["report"], queryFn: api.report });
  const [invites, setInvites] = useState<Array<{ householdId: string; householdName: string; url: string }>>([]);
  const inviteMutation = useMutation({ mutationFn: api.generateInvites, onSuccess: (data) => setInvites(data.invites) });
  const report = reportQuery.data;
  const exports = [
    ["Gasten", "/admin/exports/guests.csv"],
    ["Menu en dieet", "/admin/exports/menu-diet.csv"],
    ["Wijnproeverij", "/admin/exports/wine.csv"],
    ["Carpooling", "/admin/exports/carpool.csv"]
  ];
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-serif text-4xl font-semibold">Rapporten en exports</h1>
        <p className="text-[var(--muted)]">Download CSV-bestanden voor planning, catering en vervoer.</p>
      </div>
      {report && (
        <div className="grid gap-4 md:grid-cols-4">
          <Metric icon={<Users />} label="Huishoudens" value={report.households} />
          <Metric icon={<Heart />} label="Onbekend" value={report.unknown} />
          <Metric icon={<Wine />} label="Dieet open" value={report.dietaryUnconfirmed} />
          <Metric icon={<Car />} label="Open plekken" value={report.openRideSeats} />
        </div>
      )}
      <Card>
        <h2 className="font-serif text-2xl font-semibold">CSV exports</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {exports.map(([label, path]) => (
            <a key={path} href={exportUrl(path)}><Button variant="ghost"><Download size={18} /> {label}</Button></a>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Uitnodigingslinks</h2>
            <p className="text-sm text-[var(--muted)]">Genereert nieuwe huishoudlinks en trekt eerdere actieve links in.</p>
          </div>
          <Button onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending}><Lock size={18} /> Links genereren</Button>
        </div>
        {invites.length > 0 && (
          <div className="mt-5 grid gap-2">
            {invites.map((invite) => (
              <div key={invite.householdId} className="rounded-md border border-black/10 bg-white/70 p-3 text-sm">
                <strong>{invite.householdName}</strong>
                <p className="mt-1 break-all text-[var(--muted)]">{invite.url}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function navClass({ isActive }: { isActive: boolean }) {
  return "rounded-md px-3 py-2 text-sm font-semibold " + (isActive ? "bg-[var(--accent-strong)] text-white" : "hover:bg-black/5");
}

void navClass;
