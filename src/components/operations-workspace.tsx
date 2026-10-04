"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { EventBrief, VenueContact } from "@/types";
import { Button, DetailDialog } from "@/components/ui";
import { VenueEnquiry } from "@/components/venue-enquiry";
import {
  setQueryValues,
  useQueryValues,
  useWorkspaceView,
} from "@/lib/workspace-navigation";
import { valuesFromStoredBrief } from "@/lib/brief-draft";
import {
  APPLICATION_HANDOFF_KEY,
  type ResearchApplicationHandoff,
} from "@/lib/application-handoff";

type Resource = {
  id: string;
  name: string;
  kind: "room" | "equipment";
  capacity: number | null;
  capacity_layout: string | null;
  quantity: number;
};
type DemoPolicy = {
  eventTypes?: string[];
  permittedActivities?: string[];
  foodAllowed?: boolean;
  alcoholAllowed?: boolean;
  accessHours?: string;
  arrivalBufferMinutes?: number;
  cleanupBufferMinutes?: number;
  cleanupRequired?: boolean;
  cancellationNoticeHours?: number;
  notes?: string;
};
type Venue = {
  id: string;
  name: string;
  city: string;
  locality: string;
  kind: "demo" | "research";
  accessModel: string;
  fulfillmentModel: string;
  policy: DemoPolicy;
  resources: Resource[];
};
type SourceLink = { id: string; title: string; url: string };
type AppPayload = {
  organizer: {
    name: string;
    email: string;
    phone: string;
    organization: string;
  };
  resources: Array<{ id: string; quantity: number }>;
  questions: string[];
  flexibleSlot: null | {
    dateStart: string;
    dateEnd: string;
    startTime: string;
    endTime: string;
  };
  sources: SourceLink[];
  summary: string | null;
  evidence: Array<{
    claim: string;
    value: string;
    evidenceType: string;
    qualification: string | null;
    checkedAt: string;
    sourceReferences: SourceLink[];
  }>;
  researchEvidenceCapturedAt?: string | null;
  venueKind?: string;
  /** Published enquiry routes resolved server-side when the draft was saved. */
  contacts?: VenueContact[];
  discoveryBriefSnapshot?: EventBrief | null;
  discoveryCreatedAt?: string | null;
  organizerReply?: string;
};
type HistoryItem = {
  actor: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
};
type ChecklistItem = {
  id: string;
  label: string;
  owner: "organizer" | "host";
  due_at: string | null;
  completed_at: string | null;
  history: Array<{ actor: string; completed: number; created_at: string }>;
};
type AppRow = {
  id: string;
  idempotency_key: string;
  status: string;
  venue_id: string;
  venue_name: string;
  city: string;
  locality: string;
  kind: string;
  payload: AppPayload;
  brief: EventBrief;
  acceptedBrief: EventBrief | null;
  proposed: { date: string; startTime: string; endTime: string } | null;
  history: HistoryItem[];
  checklist: ChecklistItem[];
};
type CalendarEvent = {
  id: string;
  venue_id: string;
  resource_id: string | null;
  starts_at: string;
  ends_at: string;
  released?: number;
  reason?: string;
  state?: string;
  expires_at?: string | null;
  application_id?: string;
  quantity?: number;
};
type ResearchVenue = {
  id: string;
  catalogId: string;
  name: string;
  city: string;
  locality: string;
  summary: string;
  kind: "research";
  sources: SourceLink[];
};
type Overview = {
  workspace: { id: string; role: "organizer" | "host" };
  venues: Venue[];
  applications: AppRow[];
  calendar: {
    month: string;
    availability: CalendarEvent[];
    blocks: CalendarEvent[];
    allocations: CalendarEvent[];
    pending: AppRow[];
  };
  researchVenues: ResearchVenue[];
  timezone: string;
};
type CalendarRow = CalendarEvent & {
  calendarType: string;
  label: string;
  eventDate?: string;
};
const briefKey = "backstage.event-brief.v1";
const list = (text: string) =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const questionList = (text: string) =>
  text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
const localDate = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
const localTime = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));

export function OperationsWorkspace({ mode }: { mode: "organizer" | "host" }) {
  const view = useWorkspaceView(mode),
    query = useQueryValues();
  const mutationLock = useRef(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [calendarItem, setCalendarItem] = useState<CalendarRow | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [brief, setBrief] = useState<EventBrief | null>(null);
  const [venueId, setVenueId] = useState("");
  const [organizer, setOrganizer] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
  });
  const [selected, setSelected] = useState<
    Array<{ id: string; quantity: number }>
  >([]);
  const [applicationDraftId, setApplicationDraftId] = useState<string | null>(
    null,
  );
  const [savedDiscovery, setSavedDiscovery] = useState<{
    brief: EventBrief;
    createdAt: string;
  } | null>(null);
  const [researchHandoff, setResearchHandoff] =
    useState<ResearchApplicationHandoff | null>(null);
  const [questions, setQuestions] = useState("");
  const [flexFrom, setFlexFrom] = useState("");
  const [flexTo, setFlexTo] = useState("");
  const [flexStart, setFlexStart] = useState("");
  const [flexEnd, setFlexEnd] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const applicationKey = useRef(crypto.randomUUID());
  const appliedHandoffAt = useRef("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(query.get("month") || "")
    ? query.get("month")!
    : new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
      })
        .format(new Date())
        .slice(0, 7);
  const resourceFilter = query.get("resource") || "all";
  const setMonth = (value: string) => {
    setQueryValues({ month: value });
    setCalendarVisibleCount(12);
  };
  const setResourceFilter = (value: string) => {
    setQueryValues({ resource: value });
    setCalendarVisibleCount(12);
  };
  const [calendarVisibleCount, setCalendarVisibleCount] = useState(12);
  const [block, setBlock] = useState({
    venueId: "",
    resourceId: "",
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    reason: "Host internal use",
  });
  const load = useCallback(async () => {
    const response = await fetch(`/api/operations?month=${month}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as Overview & { error?: string };
    if (!response.ok)
      throw new Error(payload.error || "Could not load the workspace.");
    setData(payload);
  }, [month]);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch(`/api/operations?month=${month}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as Overview & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(payload.error || "Could not load the workspace.");
        if (active) setData(payload);
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not load the workspace.",
          );
      }
    })();
    return () => {
      active = false;
    };
  }, [month]);
  useEffect(() => {
    const openApplicationDetails = () => {
      document
        .getElementById("application-workspace-disclosure")
        ?.setAttribute("open", "");
    };
    const receive = (event: Event) => {
      openApplicationDetails();
      setQueryValues({ view: "drafts" });
      setResearchHandoff(
        (event as CustomEvent<ResearchApplicationHandoff>).detail,
      );
    };
    const restore = () => {
      try {
        const raw = sessionStorage.getItem(APPLICATION_HANDOFF_KEY);
        if (raw) {
          openApplicationDetails();
          setQueryValues({ view: "drafts" });
          setResearchHandoff(JSON.parse(raw) as ResearchApplicationHandoff);
        }
      } catch {
        /* Ignore damaged one-time handoff data. */
      }
    };
    window.addEventListener("backstage:prepare-research-application", receive);
    restore();
    return () =>
      window.removeEventListener(
        "backstage:prepare-research-application",
        receive,
      );
  }, []);
  useEffect(() => {
    if (
      !data ||
      !researchHandoff ||
      appliedHandoffAt.current === researchHandoff.createdAt
    )
      return;
    const venue = data.researchVenues.find(
      (item) => item.catalogId === researchHandoff.venueId,
    );
    if (!venue) return;
    const timer = window.setTimeout(() => {
      appliedHandoffAt.current = researchHandoff.createdAt;
      sessionStorage.removeItem(APPLICATION_HANDOFF_KEY);
      setBrief(researchHandoff.brief);
      setVenueId(venue.id);
      setQuestions(researchHandoff.questions.join("\n"));
      setApplicationDraftId(null);
      applicationKey.current = crypto.randomUUID();
      setSelected([]);
      setReviewed(false);
      setFlexFrom("");
      setFlexTo("");
      setMessage(
        `Prepared a private draft for ${venue.name} from the discovery brief “${researchHandoff.brief.title}”. Review the snapshot before saving.`,
      );
      document
        .getElementById("application-builder")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [data, researchHandoff]);
  const act = useCallback(
    async (
      body: Record<string, unknown>,
    ): Promise<{ applicationId?: string; role?: string } | null> => {
      if (mutationLock.current) return null;
      mutationLock.current = true;
      setBusy(true);
      setError("");
      setMessage("");
      try {
        const response = await fetch("/api/operations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = (await response.json()) as {
          error?: string;
          applicationId?: string;
          role?: string;
        };
        if (!response.ok)
          throw new Error(
            payload.error || "That action could not be completed.",
          );
        await load();
        setMessage("Saved to this demo workspace.");
        return payload;
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "That action could not be completed.",
        );
        return null;
      } finally {
        mutationLock.current = false;
        setBusy(false);
      }
    },
    [load],
  );
  const switchRole = async (role: "organizer" | "host") => {
    const result = await act({ type: "switch-role", role });
    if (result)
      setMessage(
        `Simulation role changed to ${role}. This is not production account authentication.`,
      );
  };
  const target = useMemo(
    () => data?.venues.find((v) => v.id === venueId) || null,
    [data, venueId],
  );
  const activeMode = data?.workspace.role || mode;
  const demoVenues = useMemo(
    () => data?.venues.filter((v) => v.kind === "demo") || [],
    [data],
  );
  const selectedVenue = useMemo(
    () => demoVenues.find((v) => v.id === block.venueId) || demoVenues[0],
    [demoVenues, block.venueId],
  );

  async function importBrief() {
    try {
      const raw = localStorage.getItem(briefKey);
      if (!raw)
        throw new Error("Save an event brief on the organizer page first.");
      const saved = JSON.parse(raw) as EventBrief;
      if (!valuesFromStoredBrief(saved).complete)
        throw new Error("Review and save your recovered event brief first.");
      setBrief(saved);
      setResearchHandoff(null);
      setSavedDiscovery(null);
      sessionStorage.removeItem(APPLICATION_HANDOFF_KEY);
      setApplicationDraftId(null);
      applicationKey.current = crypto.randomUUID();
      setSelected([]);
      setReviewed(false);
      setMessage("Saved event brief loaded into this application draft.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Saved brief could not be read.",
      );
    }
  }
  function payloadForApplication() {
    if (!brief)
      throw new Error(
        "Load a saved event brief before preparing an application.",
      );
    if (!target) throw new Error("Choose a host first.");
    const resources = selected;
    const flexibleSlot =
      flexFrom && flexTo
        ? {
            dateStart: flexFrom,
            dateEnd: flexTo,
            startTime: flexStart || brief.startTime,
            endTime: flexEnd || brief.endTime,
          }
        : null;
    return {
      venueId,
      brief,
      organizer,
      resources,
      questions: questionList(questions),
      flexibleSlot,
      reviewed,
      idempotencyKey: applicationKey.current,
      applicationId: applicationDraftId || undefined,
      discoveryBriefSnapshot:
        researchHandoff?.brief || savedDiscovery?.brief || undefined,
      discoveryCreatedAt:
        researchHandoff?.createdAt || savedDiscovery?.createdAt || undefined,
    };
  }
  async function saveApplication(submit: boolean) {
    try {
      const payload = payloadForApplication();
      if ((submit || target?.kind === "research") && !reviewed)
        throw new Error(
          "Review the current application contents before saving this draft.",
        );
      const result = await act({
        type: submit ? "submit-application" : "save-application",
        payload,
      });
      if (result) {
        setMessage(
          submit
            ? "Demonstration request submitted to the fictional host."
            : "Application draft saved.",
        );
        setReviewed(false);
        if (submit) {
          setApplicationDraftId(null);
          applicationKey.current = crypto.randomUUID();
        } else if (result.applicationId) {
          setApplicationDraftId(result.applicationId);
        }
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Application could not be saved.",
      );
    }
  }
  function editApplication(app: AppRow) {
    setSavedDiscovery(
      app.payload.discoveryBriefSnapshot
        ? {
            brief: app.payload.discoveryBriefSnapshot,
            createdAt: app.payload.discoveryCreatedAt || "",
          }
        : null,
    );
    setResearchHandoff(null);
    setBrief(app.brief);
    setVenueId(app.venue_id);
    setApplicationDraftId(app.id);
    applicationKey.current = app.idempotency_key;
    setOrganizer(app.payload.organizer);
    setSelected(app.payload.resources);
    setQuestions(app.payload.questions.join(", "));
    setFlexFrom(app.payload.flexibleSlot?.dateStart || "");
    setFlexTo(app.payload.flexibleSlot?.dateEnd || "");
    setFlexStart(app.payload.flexibleSlot?.startTime || "");
    setFlexEnd(app.payload.flexibleSlot?.endTime || "");
    setReviewed(false);
    document
      .getElementById("application-builder")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const hostApps = (data?.applications || []).filter(
    (a) =>
      a.kind === "demo" &&
      [
        "submitted",
        "needs-information",
        "alternative-proposed",
        "held",
      ].includes(a.status),
  );
  const filteredCalendar = useMemo(() => {
    if (!data) return [];
    const ids = data.venues
      .flatMap((v) => v.resources)
      .filter((r) => resourceFilter === "all" || r.id === resourceFilter)
      .map((r) => r.id);
    const pending = data.calendar.pending.map((app) => ({
      id: `pending-${app.id}`,
      venue_id: app.venue_id,
      resource_id: app.payload.resources?.[0]?.id,
      eventDate: app.brief.date,
      starts_at: new Date(
        `${app.brief.date}T${app.brief.startTime}:00+05:30`,
      ).toISOString(),
      ends_at: new Date(
        `${app.brief.date}T${app.brief.endTime}:00+05:30`,
      ).toISOString(),
      calendarType: "Pending request",
      label: app.brief.title,
    }));
    const rows: CalendarRow[] = [
      ...data.calendar.availability.map((x) => ({
        ...x,
        calendarType: "Availability",
        label: "Released host availability",
      })),
      ...data.calendar.blocks.map((x) => ({
        ...x,
        calendarType: "Internal block",
        label: x.reason || "Host internal block",
      })),
      ...data.calendar.allocations.map((x) => ({
        ...x,
        calendarType:
          x.state === "hold" ? "Temporary hold" : "Confirmed reservation",
        label:
          data.applications.find((app) => app.id === x.application_id)?.brief
            .title || "Fictional event",
      })),
      ...pending.filter((event) =>
        event.eventDate.startsWith(`${data.calendar.month}-`),
      ),
    ];
    return rows
      .filter((r) => !r.resource_id || ids.includes(r.resource_id))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [data, resourceFilter]);

  return (
    <section
      id={mode === "organizer" ? "application-workspace" : "host-workspace"}
      className="ops-shell"
      hidden={mode === "organizer" && view !== "drafts"}
      aria-busy={busy}
    >
      <div className="ops-banner">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-dot" /> Demo workspace — fictional hosts
            and simulated roles
          </p>
          <strong>Simulation only · No real host is connected</strong>
          <p>
            Role switching is a local workflow simulation, not production
            account authentication. Messages stay inside this application.
          </p>
        </div>
        <label>
          Simulation role
          <select
            aria-label="Simulation role"
            disabled={busy || !data}
            value={data?.workspace.role || mode}
            onChange={(e) =>
              void switchRole(e.target.value as "organizer" | "host")
            }
          >
            <option value="organizer">Organizer</option>
            <option value="host">Host</option>
          </select>
        </label>
      </div>
      {busy && (
        <p role="status" className="ops-muted">
          Saving workspace action…
        </p>
      )}
      {error && (
        <div role="alert" className="ops-feedback error-message">
          <p>{error}</p>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void load()
                .then(() => setError(""))
                .catch(() =>
                  setError("The workspace could not be refreshed. Try again."),
                )
            }
          >
            Refresh workspace
          </Button>
          <p className="helper-text">
            If a response was lost, refresh to check the saved state before
            repeating an action.
          </p>
        </div>
      )}
      {message && (
        <p role="status" className="ops-feedback success-message">
          {message}
        </p>
      )}
      {!data && <p role="status">Loading your private workspace…</p>}
      {activeMode === "organizer" &&
      (mode === "organizer" || view === "requests") ? (
        <>
          <header className="ops-heading">
            <p className="eyebrow">Application preparation</p>
            <h2>Private drafts and demo requests</h2>
            <p>
              Real researched venues accept private drafts only. Full submission
              and allocation are enabled for fictional demonstration hosts.
            </p>
          </header>
          <div
            id="application-builder"
            className="ops-columns"
            onChangeCapture={() => setReviewed(false)}
          >
            <section className="ops-card">
              <h3>1 · Choose a host and brief</h3>
              <button
                type="button"
                className="button button-light"
                onClick={() => void importBrief()}
              >
                Load saved event brief
              </button>
              {researchHandoff && (
                <div className="ops-callout">
                  <strong>
                    Discovery snapshot · {researchHandoff.venueName}
                  </strong>
                  <span>
                    Recommendation prepared for “{researchHandoff.brief.title}”
                    on {researchHandoff.brief.date}. Review the current
                    application contents; research leads can only be saved
                    privately.
                  </span>
                </div>
              )}
              {brief ? (
                <div className="brief-snapshot">
                  <strong>{brief.title}</strong>
                  <span>
                    {brief.city} · {brief.date} · {brief.startTime}–
                    {brief.endTime} · {brief.headcount} guests
                  </span>
                  <span>
                    {brief.eventType} for {brief.audience}
                  </span>
                  <span>
                    Essential:{" "}
                    {brief.essentialRequirements.join(", ") || "None listed"}
                  </span>
                  <span>
                    Flexible:{" "}
                    {brief.flexibleRequirements.join(", ") || "None listed"}
                  </span>
                </div>
              ) : (
                <p className="ops-muted">
                  Save a brief on the organizer page, then load it here.
                </p>
              )}
              <label className="ops-field">
                Potential host
                <select
                  value={venueId}
                  onChange={(e) => {
                    if (e.target.value !== venueId) {
                      setApplicationDraftId(null);
                      applicationKey.current = crypto.randomUUID();
                      setResearchHandoff(null);
                      setSavedDiscovery(null);
                      sessionStorage.removeItem(APPLICATION_HANDOFF_KEY);
                    }
                    setVenueId(e.target.value);
                    setSelected([]);
                    setReviewed(false);
                  }}
                >
                  <option value="">Choose a host</option>
                  {data?.venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.kind === "demo"
                        ? "[FICTIONAL DEMO] "
                        : "[RESEARCH LEAD · DRAFT ONLY] "}
                      {v.name} · {v.locality}
                    </option>
                  ))}
                </select>
              </label>
              {target && (
                <div className="ops-callout">
                  {target.kind === "research" ? (
                    "This lead has no verified Backstage booking permission. You may save a private application draft; submission is disabled."
                  ) : (
                    <>
                      Fictional host. Requests, approvals, and calendar
                      allocations are simulated in this workspace. Access model:{" "}
                      <strong>{target.accessModel}</strong>. Fulfillment:{" "}
                      <strong>{target.fulfillmentModel}</strong>. These are
                      separate conditions.
                    </>
                  )}
                </div>
              )}
              {target?.kind === "research" && researchHandoff && (
                <section className="ops-sources">
                  <strong>Discovery evidence and qualifications</strong>
                  {researchHandoff.recommendation.documentedFacts.map(
                    (fact, index) => (
                      <p key={`fact-${index}`}>
                        <b>{fact.claim}</b> — {fact.value}
                        {fact.qualification ? ` ${fact.qualification}` : ""}
                      </p>
                    ),
                  )}
                  {researchHandoff.recommendation.sourceReferences.map(
                    (source) => (
                      <a
                        key={source.id}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {source.title} ↗
                      </a>
                    ),
                  )}
                </section>
              )}
              {target?.kind === "demo" && (
                <fieldset className="ops-resource-list">
                  <legend>Requested demo resources</legend>
                  {target.resources.map((r) => (
                    <div className="resource-choice" key={r.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={selected.some((item) => item.id === r.id)}
                          onChange={(e) =>
                            setSelected((old) =>
                              e.target.checked
                                ? [...old, { id: r.id, quantity: 1 }]
                                : old.filter((item) => item.id !== r.id),
                            )
                          }
                        />
                        <span>
                          {r.name} · {r.kind}
                          {r.capacity
                            ? ` · ${r.capacity} guests in ${r.capacity_layout}`
                            : r.quantity > 1
                              ? ` · ${r.quantity} shared units`
                              : ""}
                        </span>
                      </label>
                      {r.kind === "equipment" &&
                        selected.some((item) => item.id === r.id) && (
                          <label className="quantity-control">
                            Units
                            <input
                              aria-label={`${r.name} units`}
                              type="number"
                              min="1"
                              max={r.quantity}
                              value={
                                selected.find((item) => item.id === r.id)
                                  ?.quantity || 1
                              }
                              onChange={(e) =>
                                setSelected((old) =>
                                  old.map((item) =>
                                    item.id === r.id
                                      ? {
                                          ...item,
                                          quantity: Math.max(
                                            1,
                                            Math.min(
                                              r.quantity,
                                              Number(e.target.value) || 1,
                                            ),
                                          ),
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </label>
                        )}
                    </div>
                  ))}
                </fieldset>
              )}
            </section>
            <section className="ops-card">
              <h3>2 · Organizer and event details</h3>
              <div className="ops-fields">
                <label className="ops-field">
                  Organizer name
                  <input
                    required
                    value={organizer.name}
                    onChange={(e) =>
                      setOrganizer({ ...organizer, name: e.target.value })
                    }
                  />
                </label>
                <label className="ops-field">
                  Email
                  <input
                    type="email"
                    required
                    value={organizer.email}
                    onChange={(e) =>
                      setOrganizer({ ...organizer, email: e.target.value })
                    }
                  />
                </label>
                <label className="ops-field">
                  Phone (optional)
                  <input
                    value={organizer.phone}
                    onChange={(e) =>
                      setOrganizer({ ...organizer, phone: e.target.value })
                    }
                  />
                </label>
                <label className="ops-field">
                  Community / organization
                  <input
                    value={organizer.organization}
                    onChange={(e) =>
                      setOrganizer({
                        ...organizer,
                        organization: e.target.value,
                      })
                    }
                  />
                </label>
              </div>
              {brief && (
                <fieldset className="brief-edit">
                  <legend>Editable brief snapshot</legend>
                  {researchHandoff &&
                    JSON.stringify(brief) !==
                      JSON.stringify(researchHandoff.brief) && (
                      <p className="historical-note">
                        The brief has changed since this recommendation. The
                        original discovery brief remains recorded; review the
                        edited application before saving.
                      </p>
                    )}
                  <label className="ops-field">
                    Event title
                    <input
                      value={brief.title}
                      onChange={(e) => {
                        setReviewed(false);
                        setBrief({ ...brief, title: e.target.value });
                      }}
                    />
                  </label>
                  <div className="ops-fields">
                    <label className="ops-field">
                      Event date
                      <input
                        type="date"
                        value={brief.date}
                        onChange={(e) => {
                          setReviewed(false);
                          setBrief({ ...brief, date: e.target.value });
                        }}
                      />
                    </label>
                    <label className="ops-field">
                      Audience
                      <input
                        value={brief.audience}
                        onChange={(e) => {
                          setReviewed(false);
                          setBrief({ ...brief, audience: e.target.value });
                        }}
                      />
                    </label>
                    <label className="ops-field">
                      Starts
                      <input
                        type="time"
                        value={brief.startTime}
                        onChange={(e) => {
                          setReviewed(false);
                          setBrief({ ...brief, startTime: e.target.value });
                        }}
                      />
                    </label>
                    <label className="ops-field">
                      Ends
                      <input
                        type="time"
                        value={brief.endTime}
                        onChange={(e) => {
                          setReviewed(false);
                          setBrief({ ...brief, endTime: e.target.value });
                        }}
                      />
                    </label>
                    <label className="ops-field">
                      Guests
                      <input
                        type="number"
                        min="1"
                        value={brief.headcount}
                        onChange={(e) => {
                          setReviewed(false);
                          setBrief({
                            ...brief,
                            headcount: Number(e.target.value),
                          });
                        }}
                      />
                    </label>
                    <label className="ops-field">
                      Space budget (INR)
                      <input
                        type="number"
                        min="0"
                        value={brief.budgetAmount}
                        onChange={(e) => {
                          setReviewed(false);
                          setBrief({
                            ...brief,
                            budgetAmount: Number(e.target.value),
                          });
                        }}
                      />
                    </label>
                  </div>
                  <label className="ops-field">
                    Rooms / areas
                    <input
                      value={brief.roomRequirements.join(", ")}
                      onChange={(e) => {
                        setReviewed(false);
                        setBrief({
                          ...brief,
                          roomRequirements: list(e.target.value),
                        });
                      }}
                    />
                  </label>
                  <label className="ops-field">
                    Equipment
                    <input
                      value={brief.equipmentRequirements.join(", ")}
                      onChange={(e) => {
                        setReviewed(false);
                        setBrief({
                          ...brief,
                          equipmentRequirements: list(e.target.value),
                        });
                      }}
                    />
                  </label>
                  <label className="ops-field">
                    Essential conditions
                    <input
                      value={brief.essentialRequirements.join(", ")}
                      onChange={(e) => {
                        setReviewed(false);
                        setBrief({
                          ...brief,
                          essentialRequirements: list(e.target.value),
                        });
                      }}
                    />
                  </label>
                  <label className="ops-field">
                    Flexible conditions
                    <input
                      value={brief.flexibleRequirements.join(", ")}
                      onChange={(e) => {
                        setReviewed(false);
                        setBrief({
                          ...brief,
                          flexibleRequirements: list(e.target.value),
                        });
                      }}
                    />
                  </label>
                  <div className="ops-fields">
                    <label className="ops-field">
                      Setup minutes
                      <input
                        type="number"
                        min="0"
                        value={brief.setupMinutes}
                        onChange={(e) => {
                          setReviewed(false);
                          setBrief({
                            ...brief,
                            setupMinutes: Number(e.target.value),
                          });
                        }}
                      />
                    </label>
                    <label className="ops-field">
                      Cleanup minutes
                      <input
                        type="number"
                        min="0"
                        value={brief.cleanupMinutes}
                        onChange={(e) => {
                          setReviewed(false);
                          setBrief({
                            ...brief,
                            cleanupMinutes: Number(e.target.value),
                          });
                        }}
                      />
                    </label>
                  </div>
                </fieldset>
              )}
              <label className="ops-field">
                Questions still needing an answer
                <textarea
                  rows={3}
                  value={questions}
                  onChange={(e) => setQuestions(e.target.value)}
                  placeholder="Room access, permitted activities, equipment, price, or other unknowns"
                />
              </label>
              <div className="ops-fields">
                <label className="ops-field">
                  Flexible date from
                  <input
                    type="date"
                    value={flexFrom}
                    onChange={(e) => setFlexFrom(e.target.value)}
                  />
                </label>
                <label className="ops-field">
                  Flexible date through
                  <input
                    type="date"
                    value={flexTo}
                    onChange={(e) => setFlexTo(e.target.value)}
                  />
                </label>
                <label className="ops-field">
                  Flexible start time
                  <input
                    type="time"
                    value={flexStart || brief?.startTime || ""}
                    onChange={(e) => setFlexStart(e.target.value)}
                  />
                </label>
                <label className="ops-field">
                  Flexible end time
                  <input
                    type="time"
                    value={flexEnd || brief?.endTime || ""}
                    onChange={(e) => setFlexEnd(e.target.value)}
                  />
                </label>
              </div>
              {target?.kind === "research" && (
                <div className="ops-sources">
                  <strong>Verified source references</strong>
                  {(
                    data?.researchVenues.find((v) => v.id === target.id)
                      ?.sources || []
                  ).map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.title} ↗
                    </a>
                  ))}
                </div>
              )}
              <label className="ops-review">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                <span>
                  I have reviewed the brief snapshot, requested resources,
                  source links, and unanswered questions.
                </span>
              </label>
              <div className="ops-actions">
                <button
                  className="button button-light"
                  disabled={busy || (target?.kind === "research" && !reviewed)}
                  type="button"
                  onClick={() => void saveApplication(false)}
                >
                  Save application draft
                </button>
                <button
                  className="button button-dark"
                  disabled={busy || target?.kind !== "demo" || !reviewed}
                  type="button"
                  onClick={() => void saveApplication(true)}
                >
                  Submit demo request
                </button>
              </div>
            </section>
          </div>
          <section className="ops-section">
            <div className="application-list-heading">
              <h3>Your applications</h3>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setApplicationDraftId(null);
                  applicationKey.current = crypto.randomUUID();
                  setVenueId("");
                  setSelected([]);
                  setReviewed(false);
                  setResearchHandoff(null);
                  setSavedDiscovery(null);
                  sessionStorage.removeItem(APPLICATION_HANDOFF_KEY);
                }}
              >
                Start a new application draft
              </button>
            </div>
            {(data?.applications || []).length === 0 ? (
              <p className="ops-muted">
                No application drafts or requests yet.
              </p>
            ) : (
              (data?.applications || []).map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  resources={
                    data?.venues.find((venue) => venue.id === app.venue_id)
                      ?.resources || []
                  }
                  role="organizer"
                  act={act}
                  busy={busy}
                  onEdit={editApplication}
                />
              ))
            )}
          </section>
        </>
      ) : (
        <>
          <header className="ops-heading">
            <p className="eyebrow">Host simulation · fictional venues only</p>
            <h2>Fictional host operations</h2>
            <p>
              The queue, availability, blocks, temporary holds, reservations,
              and checklists are persisted in your private demo workspace.
            </p>
          </header>
          <details className="host-rules">
            <summary>Fictional host rules and facilities</summary>
            <div className="ops-columns">
              {demoVenues.map((venue) => (
                <article className="ops-card" key={venue.id}>
                  <p className="eyebrow">
                    FICTIONAL DEMONSTRATION · {venue.city.toUpperCase()}
                  </p>
                  <h4>{venue.name}</h4>
                  <p>{venue.locality}</p>
                  <p>
                    <strong>Access:</strong> {venue.accessModel} ·{" "}
                    <strong>Fulfillment:</strong> {venue.fulfillmentModel}
                  </p>
                  <p>
                    <strong>Accepted types:</strong>{" "}
                    {venue.policy.eventTypes?.join(", ") || "Not listed"}
                  </p>
                  <p>
                    <strong>Activities:</strong>{" "}
                    {venue.policy.permittedActivities?.join(", ") ||
                      "Not listed"}
                  </p>
                  <p>
                    <strong>Food:</strong>{" "}
                    {venue.policy.foodAllowed === undefined
                      ? "Unspecified"
                      : venue.policy.foodAllowed
                        ? "Permitted"
                        : "Not permitted"}{" "}
                    · <strong>Alcohol:</strong>{" "}
                    {venue.policy.alcoholAllowed === undefined
                      ? "Unspecified"
                      : venue.policy.alcoholAllowed
                        ? "Permitted"
                        : "Not permitted"}
                  </p>
                  <p>
                    <strong>Access hours:</strong>{" "}
                    {venue.policy.accessHours || "Unspecified"} ·{" "}
                    <strong>Arrival buffer:</strong>{" "}
                    {venue.policy.arrivalBufferMinutes ?? "Unspecified"} min ·{" "}
                    <strong>Cleanup buffer:</strong>{" "}
                    {venue.policy.cleanupBufferMinutes ?? "Unspecified"} min ·{" "}
                    <strong>Cleanup required:</strong>{" "}
                    {venue.policy.cleanupRequired === undefined
                      ? "Unspecified"
                      : venue.policy.cleanupRequired
                        ? "Yes"
                        : "No"}
                  </p>
                  <p>
                    <strong>Cancellation notice:</strong>{" "}
                    {venue.policy.cancellationNoticeHours ?? "Unspecified"}{" "}
                    hours
                  </p>
                  <ul>
                    {venue.resources.map((resource) => (
                      <li key={resource.id}>
                        {resource.name}
                        {resource.kind === "room"
                          ? ` · ${resource.capacity} guests in ${resource.capacity_layout}`
                          : resource.quantity > 1
                            ? ` · ${resource.quantity} units`
                            : ""}
                      </li>
                    ))}
                  </ul>
                  <small>{venue.policy.notes}</small>
                </article>
              ))}
            </div>
          </details>
          <section hidden={view !== "requests"} className="ops-section">
            <h3>
              Incoming requests{" "}
              <span className="ops-count">{hostApps.length}</span>
            </h3>
            {hostApps.length === 0 ? (
              <p className="ops-muted">
                No fictional demo requests yet. Switch to Organizer simulation
                to create one.
              </p>
            ) : (
              hostApps.map((app) => (
                <ApplicationCard
                  key={app.id}
                  app={app}
                  resources={
                    data?.venues.find((venue) => venue.id === app.venue_id)
                      ?.resources || []
                  }
                  role={activeMode}
                  act={act}
                  busy={busy}
                />
              ))
            )}
          </section>
          {(() => {
            const confirmed = (data?.applications || []).filter(
              (app) => app.kind === "demo" && app.acceptedBrief,
            );
            return (
              <section hidden={view !== "requests"} className="ops-section">
                <h3>
                  Confirmed events{" "}
                  <span className="ops-count">{confirmed.length}</span>
                </h3>
                {confirmed.length === 0 ? (
                  <p className="ops-muted">
                    Approved demo events and their shared checklists will appear
                    here.
                  </p>
                ) : (
                  confirmed.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      resources={
                        data?.venues.find((venue) => venue.id === app.venue_id)
                          ?.resources || []
                      }
                      role={activeMode}
                      act={act}
                      busy={busy}
                    />
                  ))
                )}
              </section>
            );
          })()}
          <section
            hidden={view !== "calendar"}
            className="ops-section calendar-section"
          >
            <div className="calendar-toolbar">
              <div>
                <p className="eyebrow">
                  Monthly resource calendar · Asia/Kolkata
                </p>
                <h3>
                  {new Intl.DateTimeFormat("en-IN", {
                    month: "long",
                    year: "numeric",
                    timeZone: "Asia/Kolkata",
                  }).format(new Date(`${month}-01T12:00:00+05:30`))}
                </h3>
              </div>
              <div className="ops-actions">
                <button
                  className="button button-light"
                  onClick={() => setMonth(shiftMonth(month, -1))}
                  aria-label="Previous month"
                >
                  ← Previous
                </button>
                <button
                  className="button button-light"
                  onClick={() => setMonth(shiftMonth(month, 1))}
                  aria-label="Next month"
                >
                  Next →
                </button>
              </div>
            </div>
            <label className="ops-field calendar-filter">
              Filter resource
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
              >
                <option value="all">All resources</option>
                {data?.venues.flatMap((v) =>
                  v.resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {v.name} · {r.name}
                    </option>
                  )),
                )}
              </select>
            </label>
            {filteredCalendar.length === 0 ? (
              <p className="ops-muted">
                No availability or allocations in this month.
              </p>
            ) : (
              <>
                <p className="calendar-result-count" aria-live="polite">
                  Showing{" "}
                  {Math.min(calendarVisibleCount, filteredCalendar.length)} of{" "}
                  {filteredCalendar.length} calendar entries.
                </p>
                <div className="calendar-list">
                  {filteredCalendar
                    .slice(0, calendarVisibleCount)
                    .map((item: CalendarRow) => (
                      <article
                        key={item.id}
                        className={`calendar-item calendar-${item.calendarType.toLowerCase().replaceAll(" ", "-")}`}
                      >
                        <div>
                          <strong>{item.calendarType}</strong>
                          <span>
                            {localDate(item.starts_at)} ·{" "}
                            {localTime(item.starts_at)}–
                            {localTime(item.ends_at)} IST
                          </span>
                          <small>
                            {item.label}
                            {item.expires_at
                              ? ` · expires ${new Date(item.expires_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST`
                              : ""}
                          </small>
                        </div>
                        <span>
                          {data?.venues.find((v) => v.id === item.venue_id)
                            ?.name || "Demo host"}
                          <br />
                          {data?.venues
                            .flatMap((v) => v.resources)
                            .find((r) => r.id === item.resource_id)?.name ||
                            "All host resources"}
                        </span>
                        <Button
                          variant="secondary"
                          onClick={() => setCalendarItem(item)}
                        >
                          View calendar details
                        </Button>
                        {item.calendarType === "Availability" &&
                          activeMode === "host" && (
                            <button
                              disabled={busy}
                              className="text-button"
                              type="button"
                              onClick={() =>
                                void act({
                                  type: "withdraw-availability",
                                  availabilityId: item.id,
                                })
                              }
                            >
                              Withdraw availability
                            </button>
                          )}
                      </article>
                    ))}
                </div>
                {filteredCalendar.length > calendarVisibleCount && (
                  <button
                    className="button button-light calendar-more"
                    type="button"
                    onClick={() =>
                      setCalendarVisibleCount((count) => count + 12)
                    }
                  >
                    Show 12 more calendar entries
                  </button>
                )}
              </>
            )}
            <Button
              variant="secondary"
              disabled={activeMode !== "host"}
              onClick={() => setBlockOpen(true)}
            >
              Add an internal block
            </Button>
            <DetailDialog
              open={blockOpen}
              onClose={() => setBlockOpen(false)}
              title="Add an internal block"
            >
              <form
                className="ops-block-form"
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  void act({
                    type: "add-internal-block",
                    ...block,
                    venueId: block.venueId || selectedVenue?.id,
                    resourceId:
                      block.resourceId || selectedVenue?.resources[0]?.id,
                  }).then((result) => {
                    if (result) setBlockOpen(false);
                  });
                }}
              >
                <h4>Add an internal block</h4>
                <div className="ops-fields">
                  <label className="ops-field">
                    Demo host
                    <select
                      value={block.venueId || demoVenues[0]?.id || ""}
                      onChange={(e) => {
                        const v = demoVenues.find(
                          (x) => x.id === e.target.value,
                        );
                        setBlock({
                          ...block,
                          venueId: e.target.value,
                          resourceId: v?.resources[0]?.id || "",
                        });
                      }}
                    >
                      {demoVenues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ops-field">
                    Resource
                    <select
                      value={
                        block.resourceId ||
                        selectedVenue?.resources[0]?.id ||
                        ""
                      }
                      onChange={(e) =>
                        setBlock({ ...block, resourceId: e.target.value })
                      }
                    >
                      {selectedVenue?.resources.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="ops-field">
                    Date
                    <input
                      type="date"
                      required
                      value={block.date}
                      onChange={(e) =>
                        setBlock({ ...block, date: e.target.value })
                      }
                    />
                  </label>
                  <label className="ops-field">
                    From
                    <input
                      type="time"
                      required
                      value={block.startTime}
                      onChange={(e) =>
                        setBlock({ ...block, startTime: e.target.value })
                      }
                    />
                  </label>
                  <label className="ops-field">
                    Until
                    <input
                      type="time"
                      required
                      value={block.endTime}
                      onChange={(e) =>
                        setBlock({ ...block, endTime: e.target.value })
                      }
                    />
                  </label>
                  <label className="ops-field">
                    Reason
                    <input
                      value={block.reason}
                      onChange={(e) =>
                        setBlock({ ...block, reason: e.target.value })
                      }
                    />
                  </label>
                </div>
                <button
                  className="button button-light"
                  disabled={busy}
                  type="submit"
                >
                  Add internal block
                </button>
              </form>
              {error && (
                <p role="alert" className="error-message">
                  {error}
                </p>
              )}
            </DetailDialog>
          </section>
          <section hidden={view !== "calendar"} className="ops-section">
            <h3>Availability windows</h3>
            <p className="ops-muted">
              Fictional demo hosts publish weekday availability, 09:00–18:30
              IST. Withdraw a window to stop offering it. Active reservations
              and unexpired holds protect overlapping windows.
            </p>
            <p>
              {data?.calendar.availability.length || 0} available resource
              windows in the selected month.
            </p>
          </section>
          <section hidden={view !== "preparation"} className="ops-section">
            <h3>Shared preparation</h3>
            <p className="ops-muted">
              Both roles see the same persisted tasks. Only the assigned role
              can change a task.
            </p>
            {data?.applications
              .filter((app) => app.kind === "demo" && app.checklist.length > 0)
              .map((app) => (
                <article className="preparation-card ops-card" key={app.id}>
                  <h4>{app.brief.title}</h4>
                  <p>
                    {app.venue_name} · {app.status} · {app.acceptedBrief?.date}
                  </p>
                  <Checklist
                    app={app}
                    role={activeMode}
                    act={act}
                    busy={busy}
                  />
                </article>
              ))}
            {!data?.applications.some((app) => app.checklist.length) && (
              <p className="empty-state">
                Approve a fictional request to generate its preparation
                checklist.
              </p>
            )}
          </section>
        </>
      )}
      <DetailDialog
        open={Boolean(calendarItem)}
        onClose={() => setCalendarItem(null)}
        title="Calendar entry"
      >
        {calendarItem && (
          <>
            <p>
              <strong>{calendarItem.calendarType}</strong> · fictional
              demonstration
            </p>
            <p>
              {localDate(calendarItem.starts_at)} ·{" "}
              {localTime(calendarItem.starts_at)}–
              {localTime(calendarItem.ends_at)} IST
            </p>
            <p>
              {
                data?.venues.find((venue) => venue.id === calendarItem.venue_id)
                  ?.name
              }
            </p>
            <p>
              {data?.venues
                .flatMap((venue) => venue.resources)
                .find((resource) => resource.id === calendarItem.resource_id)
                ?.name || "All host resources"}
            </p>
            <p>{calendarItem.label}</p>
            {calendarItem.expires_at && (
              <p>
                Expires {localDate(calendarItem.expires_at)}{" "}
                {localTime(calendarItem.expires_at)} IST
              </p>
            )}
          </>
        )}
      </DetailDialog>
    </section>
  );
}

function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

function ApplicationCard({
  app,
  resources,
  role,
  act,
  busy,
  onEdit,
}: {
  app: AppRow;
  resources: Resource[];
  role: "organizer" | "host";
  act: (
    body: Record<string, unknown>,
  ) => Promise<{ applicationId?: string; role?: string } | null>;
  busy: boolean;
  onEdit?: (app: AppRow) => void;
}) {
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState(app.brief.startTime);
  const [endTime, setEndTime] = useState(app.brief.endTime);
  const [reply, setReply] = useState("");
  const resourceNames = app.payload.resources
    ?.map(
      (selected) =>
        `${selected.quantity > 1 ? `${selected.quantity} × ` : ""}${resources.find((resource) => resource.id === selected.id)?.name || "Resource"}`,
    )
    .join(", ");
  return (
    <article className="application-card">
      <div className="application-top">
        <div>
          <span className={`application-status status-${app.status}`}>
            {app.status.replaceAll("-", " ")}
          </span>
          <h4>{app.brief.title}</h4>
          <p>
            {app.venue_name} · {app.locality}
            {app.kind === "demo" && " · FICTIONAL DEMO"}
            {app.kind === "research" && " · DRAFT ONLY"}
          </p>
        </div>
        <span>
          {app.brief.date} · {app.brief.startTime}–{app.brief.endTime}
        </span>
      </div>
      <details className="request-details">
        <summary>View application details</summary>
        <div>
          {app.payload.discoveryBriefSnapshot && (
            <section className="brief-snapshot">
              <strong>Discovery brief snapshot</strong>
              <span>
                {app.payload.discoveryBriefSnapshot.title} ·{" "}
                {app.payload.discoveryBriefSnapshot.date} ·{" "}
                {app.payload.discoveryBriefSnapshot.headcount} guests
              </span>
              <span>
                Recommendation context captured{" "}
                {app.payload.discoveryCreatedAt
                  ? new Date(app.payload.discoveryCreatedAt).toLocaleString(
                      "en-IN",
                      { timeZone: "Asia/Kolkata" },
                    ) + " IST"
                  : "date not recorded"}
                . The editable application brief is stored separately.
              </span>
            </section>
          )}
          <div className="application-detail">
            <span>
              {app.brief.headcount} guests · {app.brief.eventType} ·{" "}
              {app.brief.audience}
            </span>
            <span>
              Organizer: {app.payload.organizer?.name || "Not provided"} ·{" "}
              {app.payload.organizer?.email || "No email"} ·{" "}
              {app.payload.organizer?.phone || "No phone"}
            </span>
            <span>
              Community / organization:{" "}
              {app.payload.organizer?.organization || "Not provided"}
            </span>
            <span>
              Resources: {resourceNames || "No demo resources selected"}
            </span>
            <span>
              Rooms needed:{" "}
              {app.brief.roomRequirements.join(", ") || "None listed"}
            </span>
            <span>
              Equipment needed:{" "}
              {app.brief.equipmentRequirements.join(", ") || "None listed"}
            </span>
            <span>
              Budget: ₹{app.brief.budgetAmount} · setup {app.brief.setupMinutes}{" "}
              min · cleanup {app.brief.cleanupMinutes} min
            </span>
            <span>
              Essential:{" "}
              {app.brief.essentialRequirements.join(", ") || "None listed"}
            </span>
            <span>
              Flexible:{" "}
              {app.brief.flexibleRequirements.join(", ") || "None listed"}
            </span>
            <span>
              Open questions:{" "}
              {app.payload.questions?.join(" · ") || "None listed"}
            </span>
            {app.payload.organizerReply && (
              <span>Organizer response: {app.payload.organizerReply}</span>
            )}
          </div>
          {app.payload.sources?.length > 0 && (
            <div className="ops-sources">
              <strong>Evidence saved with the draft</strong>
              {app.payload.researchEvidenceCapturedAt && (
                <small>
                  Resolved from published Sanity records{" "}
                  {new Date(
                    app.payload.researchEvidenceCapturedAt,
                  ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}{" "}
                  IST. Original source-check dates below describe when each
                  source was researched.
                </small>
              )}
              {app.payload.summary && (
                <p className="ops-muted">{app.payload.summary}</p>
              )}
              {app.payload.evidence?.map((fact, index) => (
                <div
                  className="application-evidence"
                  key={`${fact.claim}-${index}`}
                >
                  <strong>{fact.claim}</strong>
                  <span>
                    {fact.value}
                    {fact.qualification ? ` ${fact.qualification}` : ""} ·{" "}
                    {fact.evidenceType}
                    {fact.checkedAt
                      ? ` · source checked ${fact.checkedAt}`
                      : ""}
                  </span>
                  {fact.sourceReferences.map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.title} ↗
                    </a>
                  ))}
                </div>
              ))}
              {app.payload.sources.map((s) => (
                <a key={s.id} href={s.url} target="_blank" rel="noreferrer">
                  {s.title} ↗
                </a>
              ))}
              {app.payload.venueKind === "research" && (
                <VenueEnquiry
                  name={app.venue_name}
                  contacts={app.payload.contacts}
                  brief={app.brief}
                  questions={app.payload.questions}
                />
              )}
              <small>
                No Backstage submission or booking authority is verified for
                this research lead.
              </small>
            </div>
          )}
          {app.proposed && (
            <p className="ops-callout">
              Host proposed {app.proposed.date}, {app.proposed.startTime}–
              {app.proposed.endTime}. It remains unallocated until you accept
              and the host approves.
            </p>
          )}
          {role === "organizer" && app.status === "needs-information" && (
            <div className="inline-action">
              <label className="ops-field">
                Reply to the host
                <textarea
                  value={reply}
                  rows={2}
                  onChange={(e) => setReply(e.target.value)}
                />
              </label>
              <button
                className="button button-light"
                disabled={busy || !reply.trim()}
                onClick={() =>
                  void act({
                    type: "respond-information",
                    applicationId: app.id,
                    reply,
                  })
                }
              >
                Send response
              </button>
            </div>
          )}
          {app.status === "alternative-proposed" && role === "organizer" && (
            <button
              className="button button-dark"
              disabled={busy}
              onClick={() =>
                void act({ type: "accept-alternative", applicationId: app.id })
              }
            >
              Accept proposed alternative
            </button>
          )}
          {role === "organizer" && app.status === "draft" && onEdit && (
            <button
              className="button button-light"
              type="button"
              onClick={() => onEdit(app)}
            >
              Edit this draft
            </button>
          )}
          {role === "host" &&
            ["submitted", "needs-information", "held"].includes(app.status) && (
              <div className="application-actions">
                {app.status === "submitted" && (
                  <>
                    <button
                      className="button button-light"
                      disabled={busy}
                      onClick={() =>
                        void act({
                          type: "hold",
                          applicationId: app.id,
                          venueId: app.venue_id,
                        })
                      }
                    >
                      Hold resources 15 min
                    </button>
                    <button
                      className="button button-dark"
                      disabled={busy}
                      onClick={() =>
                        void act({
                          type: "approve",
                          applicationId: app.id,
                          venueId: app.venue_id,
                        })
                      }
                    >
                      Approve &amp; allocate
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        void act({
                          type: "request-information",
                          applicationId: app.id,
                          note:
                            note ||
                            "Please clarify your setup and arrival needs.",
                        })
                      }
                    >
                      Request information
                    </button>
                    <button
                      className="text-button danger-text"
                      disabled={busy}
                      onClick={() =>
                        void act({
                          type: "reject",
                          applicationId: app.id,
                          note:
                            note ||
                            "The host is unable to accept this request.",
                        })
                      }
                    >
                      Reject request
                    </button>
                  </>
                )}
                {app.status === "held" && (
                  <>
                    <button
                      className="button button-dark"
                      disabled={busy}
                      onClick={() =>
                        void act({
                          type: "approve",
                          applicationId: app.id,
                          venueId: app.venue_id,
                        })
                      }
                    >
                      Approve &amp; allocate
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        void act({
                          type: "request-information",
                          applicationId: app.id,
                          note:
                            note ||
                            "Please clarify your setup and arrival needs.",
                        })
                      }
                    >
                      Request information
                    </button>
                    <button
                      className="text-button danger-text"
                      disabled={busy}
                      onClick={() =>
                        void act({
                          type: "reject",
                          applicationId: app.id,
                          note:
                            note ||
                            "The host is unable to accept this request.",
                        })
                      }
                    >
                      Reject request
                    </button>
                  </>
                )}
                {app.status === "needs-information" && (
                  <button
                    className="text-button danger-text"
                    disabled={busy}
                    onClick={() =>
                      void act({
                        type: "reject",
                        applicationId: app.id,
                        note:
                          note || "The host is unable to accept this request.",
                      })
                    }
                  >
                    Reject request
                  </button>
                )}
                {app.status === "submitted" && (
                  <div className="alternative-fields">
                    <label className="ops-field">
                      Proposed date
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </label>
                    <label className="ops-field">
                      From
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </label>
                    <label className="ops-field">
                      Until
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </label>
                    <button
                      className="button button-light"
                      disabled={busy || !date}
                      onClick={() =>
                        void act({
                          type: "propose-alternative",
                          applicationId: app.id,
                          date,
                          startTime,
                          endTime,
                        })
                      }
                    >
                      Propose this slot
                    </button>
                  </div>
                )}
                <label className="ops-field">
                  Internal response note
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional note to organizer"
                  />
                </label>
              </div>
            )}
          {role === "organizer" &&
            [
              "submitted",
              "needs-information",
              "alternative-proposed",
              "held",
              "approved",
            ].includes(app.status) && (
              <button
                className="text-button danger-text"
                disabled={busy}
                onClick={() =>
                  void act({
                    type: "cancel-application",
                    applicationId: app.id,
                  })
                }
              >
                Cancel request
              </button>
            )}
          {app.acceptedBrief && (
            <section className="accepted-brief">
              <strong>Accepted brief snapshot</strong>
              <span>
                {app.acceptedBrief.date} · {app.acceptedBrief.startTime}–
                {app.acceptedBrief.endTime}; later edits do not change this
                allocation.
              </span>
            </section>
          )}
          <Checklist app={app} role={role} act={act} busy={busy} />
          <details className="application-history">
            <summary>Request history ({app.history.length})</summary>
            <ol>
              {app.history.map((event, i) => (
                <li key={i}>
                  <strong>{event.to_status.replaceAll("-", " ")}</strong> ·{" "}
                  {event.actor} ·{" "}
                  {new Date(event.created_at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST{event.note && <small>{event.note}</small>}
                </li>
              ))}
            </ol>
          </details>
        </div>
      </details>
    </article>
  );
}

function Checklist({
  app,
  role,
  act,
  busy,
}: {
  app: AppRow;
  role: "organizer" | "host";
  act: (body: Record<string, unknown>) => Promise<unknown>;
  busy: boolean;
}) {
  return app.checklist?.length > 0 ? (
    <section className="checklist">
      <h5>Shared preparation checklist</h5>
      {app.checklist.map((item) => (
        <label key={item.id} className={item.completed_at ? "check-done" : ""}>
          <input
            type="checkbox"
            aria-label={`${item.owner} task: ${item.label}`}
            checked={Boolean(item.completed_at)}
            disabled={role !== item.owner || app.status !== "approved" || busy}
            onChange={() =>
              void act({
                type: "toggle-checklist",
                applicationId: app.id,
                itemId: item.id,
              })
            }
          />
          <span>{item.label}</span>
          <small>
            {item.owner} · due{" "}
            {item.due_at
              ? `${localDate(item.due_at)} ${localTime(item.due_at)} IST`
              : "date pending"}
            {item.history.length > 0 ? ` · ${item.history.length} updates` : ""}
            {item.completed_at
              ? ` · completed by ${item.history.at(-1)?.actor || item.owner}`
              : ""}
          </small>
        </label>
      ))}
    </section>
  ) : null;
}
