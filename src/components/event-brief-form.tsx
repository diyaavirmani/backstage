"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { EventBrief, VenueRecommendation } from "@/types";
import { publishResearchApplicationHandoff } from "@/lib/application-handoff";
import {
  BRIEF_STORAGE_KEY,
  emptyBriefForm,
  briefFromValues,
  valuesFromStoredBrief,
  validateBriefForm,
  sameBriefContents,
  type BriefField,
  type BriefFormValues,
} from "@/lib/brief-draft";
import {
  setQueryValues,
  useQueryValues,
  useWorkspaceView,
} from "@/lib/workspace-navigation";
import { Badge, Button, EmptyState, Notice } from "@/components/ui";
import {
  AudienceInput,
  RequirementPicker,
} from "@/components/brief-input-controls";
import { suggestEventSetup } from "../../scripts/brief-controls.mjs";
import { ResearchLeadCard } from "@/components/research-lead-card";

type Turn = { role: "user" | "assistant"; content: string };
type Example = "delhi-hackathon" | "bengaluru-founders" | "demo-workshop";
const basics: BriefField[] = [
  "title",
  "city",
  "eventType",
  "audience",
  "date",
  "headcount",
  "startTime",
  "endTime",
];
const labels: Record<BriefField, string> = {
  title: "Event name",
  city: "City",
  eventType: "Gathering type",
  audience: "Audience or community",
  date: "Event date",
  headcount: "Attendees",
  startTime: "Start time",
  endTime: "End time",
  budgetAmount: "Venue budget (INR)",
  rooms: "Required rooms or areas",
  equipment: "Equipment and setup",
  essential: "Essential requirements",
  flexible: "Nice to have — optional",
  setupMinutes: "Setup time (minutes)",
  cleanupMinutes: "Clear-up time (minutes)",
};
function futureDate(days: number, weekday = false) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  if (weekday)
    while (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function EventBriefForm() {
  const [values, setValues] = useState<BriefFormValues>(emptyBriefForm);
  const [ready, setReady] = useState(false);
  const [savedBrief, setSavedBrief] = useState<EventBrief | null>(null);
  const [errors, setErrors] = useState<Partial<Record<BriefField, string>>>({});
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState("");
  const [rawRecovery, setRawRecovery] = useState("");
  const [example, setExample] = useState<Example>("delhi-hackathon");
  const [exampleMessage, setExampleMessage] = useState("");
  const [conversation, setConversation] = useState<Turn[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [recommendations, setRecommendations] = useState<
    VenueRecommendation[] | null
  >(null);
  const [agentMessage, setAgentMessage] = useState("");
  const [agentError, setAgentError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastBrief, setLastBrief] = useState<EventBrief | null>(null);
  const [manualRooms, setManualRooms] = useState(false);
  const [setup, setSetup] = useState<ReturnType<
    typeof suggestEventSetup
  > | null>(null);
  const [setupRooms, setSetupRooms] = useState("");
  const [setupMessage, setSetupMessage] = useState("");
  const [handoffMessage, setHandoffMessage] = useState("");
  const [retrySeconds, setRetrySeconds] = useState<number | null>(null);
  const requestId = useRef(0);
  const request = useRef<AbortController | null>(null);
  const requestBusy = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const view = useWorkspaceView("organizer");
  const params = useQueryValues();
  const step =
    Number(params.get("step")) === 2
      ? 2
      : Number(params.get("step")) === 3
        ? 3
        : 1;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(BRIEF_STORAGE_KEY);
        if (raw) {
          setRawRecovery(raw);
          const stored = JSON.parse(raw);
          const restored = valuesFromStoredBrief(stored);
          setValues(restored.values);
          if (restored.complete) setSavedBrief(stored as EventBrief);
          else
            setRecovery(
              "We recovered fields from an older or incomplete brief. Review them before saving. The original stored data has been retained.",
            );
        }
      } catch {
        setRecovery(
          "The stored brief could not be read. Its original data is still in this browser; download it before replacing it.",
        );
      } finally {
        setReady(true);
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
      request.current?.abort();
    };
  }, []);
  const current = briefFromValues(values, "preview", "");
  const saved = Boolean(savedBrief && sameBriefContents(savedBrief, current));
  const changedSinceDiscovery = Boolean(
    lastBrief && !sameBriefContents(lastBrief, current),
  );
  function update(name: BriefField, value: string) {
    setValues((old) => ({ ...old, [name]: value }));
    setErrors((old) => ({ ...old, [name]: undefined }));
    setError("");
    setExampleMessage("");
  }
  function focusInvalid(found: Partial<Record<BriefField, string>>) {
    const field = Object.keys(found)[0] as BriefField | undefined;
    if (!field) return;
    setQueryValues({ view: "brief", step: basics.includes(field) ? "1" : "2" });
    window.setTimeout(
      () => document.getElementById(`brief-${field}`)?.focus(),
      0,
    );
  }
  function validate(which: 1 | 2 | 3) {
    const found = validateBriefForm(values, which);
    setErrors(found);
    if (Object.keys(found).length) {
      focusInvalid(found);
      return false;
    }
    return true;
  }
  function goStep(next: 1 | 2 | 3) {
    if (next > step && !validate(next === 3 ? 3 : 1)) return;
    setQueryValues({ view: "brief", step: String(next) });
    window.setTimeout(
      () => document.getElementById("wizard-heading")?.focus(),
      0,
    );
  }
  function saveBrief(): EventBrief | null {
    if (!validate(3)) return null;
    const draft = briefFromValues(
      values,
      savedBrief?.id || crypto.randomUUID(),
      new Date().toISOString(),
    );
    try {
      localStorage.setItem(BRIEF_STORAGE_KEY, JSON.stringify(draft));
      setSavedBrief(draft);
      setError("");
      setRecovery("");
      window.dispatchEvent(new Event("backstage:brief-saved"));
      return draft;
    } catch {
      setError(
        "This browser could not save the brief. Check its storage settings and try again.",
      );
      return null;
    }
  }
  function loadExample() {
    const examples: Record<Example, BriefFormValues> = {
      "delhi-hackathon": {
        ...emptyBriefForm,
        title: "Delhi NCR community hackathon",
        city: "Delhi NCR",
        eventType: "Other",
        date: futureDate(12),
        startTime: "09:00",
        endTime: "18:00",
        audience: "Student and independent builder teams",
        headcount: "80",
        budgetAmount: "15000",
        rooms: "Main event room, breakout rooms",
        equipment: "Projector, microphones, reliable Wi-Fi",
        essential:
          "Capacity for 80 in a documented room layout, suitable equipment, within budget",
        flexible: "Room arrangement",
        setupMinutes: "60",
        cleanupMinutes: "45",
      },
      "bengaluru-founders": {
        ...emptyBriefForm,
        title: "Bengaluru founder gathering",
        city: "Bengaluru",
        eventType: "Community meetup",
        date: futureDate(14),
        startTime: "17:00",
        endTime: "20:00",
        audience: "Early-stage founders and startup operators",
        headcount: "28",
        budgetAmount: "0",
        rooms: "Gathering room",
        equipment: "Projector",
        essential: "Explore pro-bono access and founder-community eligibility",
        flexible: "Weekday evening",
        setupMinutes: "30",
        cleanupMinutes: "30",
      },
      "demo-workshop": {
        ...emptyBriefForm,
        title: "Fictional host workshop demo",
        city: "Delhi NCR",
        eventType: "Workshop",
        date: futureDate(14, true),
        startTime: "11:00",
        endTime: "13:00",
        audience: "Local community makers",
        headcount: "20",
        budgetAmount: "0",
        rooms: "Workshop Studio",
        equipment: "Projector",
        essential: "Workshop Studio and projector",
        flexible: "Start time",
        setupMinutes: "30",
        cleanupMinutes: "30",
      },
    };
    setValues(examples[example]);
    setErrors({});
    setError("");
    setQueryValues({ view: "brief", step: "1" });
    setExampleMessage(
      "Example loaded into the form. Save it when ready; no application or reservation was created.",
    );
  }
  async function runDiscovery(draft: EventBrief, turns: Turn[]) {
    if (requestBusy.current) return;
    requestBusy.current = true;
    const id = ++requestId.current;
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 65_000);
    if (lastBrief && !sameBriefContents(lastBrief, draft)) {
      setRecommendations(null);
      setAgentMessage("");
    }
    setLoading(true);
    setAgentError("");
    setRetrySeconds(null);
    setLastBrief(draft);
    setConversation(turns);
    setQueryValues({ view: "research" });
    try {
      const response = await fetch("/api/venue-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: draft, conversation: turns.slice(-8) }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        recommendations?: VenueRecommendation[];
        retryAfterSeconds?: number;
        suggestedSetup?: ReturnType<typeof suggestEventSetup>;
      };
      if (id !== requestId.current) return;
      if (!response.ok) {
        setRetrySeconds(payload.retryAfterSeconds || null);
        throw new Error(
          payload.error ||
            "Venue discovery could not be completed. Your brief is preserved.",
        );
      }
      if (!Array.isArray(payload.recommendations))
        throw new Error(
          "The venue response could not be read. No new leads were published.",
        );
      setRecommendations(payload.recommendations);
      const proposed = payload.suggestedSetup || suggestEventSetup(draft);
      setSetup(proposed);
      setSetupRooms(proposed.rooms.join(", "));
      setSetupMessage("");
      setAgentMessage(
        payload.message || "Source-verified research leads for your event.",
      );
      if (payload.message)
        setConversation(
          [
            ...turns,
            { role: "assistant" as const, content: payload.message },
          ].slice(-8),
        );
      setFollowUp("");
    } catch (caught) {
      if (id === requestId.current)
        setAgentError(
          caught instanceof Error && caught.name === "AbortError"
            ? "The search was cancelled or timed out. Your brief is preserved; try again when ready."
            : caught instanceof Error
              ? caught.message
              : "Discovery is unavailable. Your brief is preserved.",
        );
    } finally {
      window.clearTimeout(timeout);
      if (id === requestId.current) {
        requestBusy.current = false;
        setLoading(false);
      }
    }
  }
  function findVenues() {
    if (requestBusy.current) return;
    const draft = saveBrief();
    if (draft)
      void runDiscovery(draft, [
        {
          role: "user",
          content: "Find suitable venue leads for my saved event brief.",
        },
      ]);
  }
  function sendFollowUp(event: FormEvent) {
    event.preventDefault();
    if (!lastBrief || !followUp.trim() || requestBusy.current) return;
    void runDiscovery(
      lastBrief,
      [
        ...conversation,
        { role: "user" as const, content: followUp.trim() },
      ].slice(-8),
    );
  }
  function prepare(venue: VenueRecommendation) {
    if (!lastBrief) return;
    const questions = venue.requirementCoverage
      .filter((item) => item.status !== "supported")
      .map(
        (item) =>
          `${item.requirement}: ${item.status === "contradicted" ? "documented mismatch or conflicting evidence" : "needs confirmation"}`,
      );
    questions.push(
      ...venue.importantUnknowns.map((item) => `${item.claim}: ${item.value}`),
    );
    publishResearchApplicationHandoff({
      venueId: venue.venueId,
      venueName: venue.name,
      brief: lastBrief,
      questions: [...new Set(questions)],
      recommendation: venue,
      createdAt: new Date().toISOString(),
    });
    setHandoffMessage(
      `Private draft prepared for ${venue.name} using “${lastBrief.title}”. Review before saving.`,
    );
    setQueryValues({ view: "drafts" });
  }
  const field = (
    name: BriefField,
    options: {
      type?: string;
      required?: boolean;
      min?: number;
      max?: number;
      maxLength?: number;
      helper?: string;
    } = {},
  ) => (
    <label className="field" key={name} htmlFor={`brief-${name}`}>
      <span>
        {labels[name]}
        {options.required && <span className="required-label">Required</span>}
      </span>
      <input
        id={`brief-${name}`}
        name={name}
        type={options.type || "text"}
        required={options.required}
        min={options.min}
        max={options.max}
        maxLength={options.maxLength}
        step={
          options.type === "number"
            ? name === "budgetAmount"
              ? "any"
              : "1"
            : undefined
        }
        value={values[name]}
        onChange={(event) => update(name, event.target.value)}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={
          errors[name]
            ? `error-${name}`
            : options.helper
              ? `help-${name}`
              : undefined
        }
      />
      {options.helper && <small id={`help-${name}`}>{options.helper}</small>}
      {errors[name] && (
        <small className="field-error" id={`error-${name}`}>
          {errors[name]}
        </small>
      )}
    </label>
  );
  const select = (name: "city" | "eventType", options: string[]) => (
    <label className="field" htmlFor={`brief-${name}`}>
      <span>
        {labels[name]}
        <span className="required-label">Required</span>
      </span>
      <select
        id={`brief-${name}`}
        required
        value={values[name]}
        onChange={(event) => update(name, event.target.value)}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `error-${name}` : undefined}
      >
        {name === "eventType" && (
          <option value="">Choose a gathering type</option>
        )}
        {values[name] && !options.includes(values[name]) && (
          <option>{values[name]}</option>
        )}
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      {errors[name] && (
        <small className="field-error" id={`error-${name}`}>
          {errors[name]}
        </small>
      )}
    </label>
  );
  return (
    <>
      <section hidden={view !== "brief"} id="event-brief">
        <div className="view-heading">
          <h2>Event brief</h2>
          <Badge tone={saved ? "supported" : "neutral"}>
            {!ready
              ? "Restoring brief…"
              : saved
                ? "Saved in this browser"
                : "Unsaved form changes"}
          </Badge>
        </div>
        {recovery && (
          <Notice tone="warning" role="status">
            <p>{recovery}</p>
            {rawRecovery && (
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([rawRecovery], { type: "application/json" }),
                  );
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "backstage-stored-brief.json";
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download stored brief
              </Button>
            )}
          </Notice>
        )}
        {error && (
          <Notice tone="error" role="alert">
            {error}
          </Notice>
        )}
        {exampleMessage && <Notice role="status">{exampleMessage}</Notice>}
        <div className="example-brief-row">
          <label className="field">
            <span>
              Try an example <small>Optional</small>
            </span>
            <select
              aria-label="Try an example"
              value={example}
              onChange={(event) => setExample(event.target.value as Example)}
            >
              <option value="delhi-hackathon">
                Delhi NCR hackathon · research unknowns
              </option>
              <option value="bengaluru-founders">
                Bengaluru founders · qualified eligibility
              </option>
              <option value="demo-workshop">
                Fictional host workshop · operations demo
              </option>
            </select>
          </label>
          <Button
            variant="secondary"
            type="button"
            onClick={loadExample}
            disabled={!ready}
          >
            Load example
          </Button>
          <p>
            Fills the form only. Your applications and reservations stay
            separate.
          </p>
        </div>
        <form
          className="brief-form"
          ref={formRef}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (step < 3) goStep((step + 1) as 2 | 3);
            else saveBrief();
          }}
        >
          <nav className="wizard-steps" aria-label="Event brief steps">
            {["Event details", "Space and requirements", "Review"].map(
              (label, index) => (
                <a
                  key={label}
                  href={`?view=brief&step=${index + 1}`}
                  aria-current={step === index + 1 ? "step" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    goStep((index + 1) as 1 | 2 | 3);
                  }}
                >
                  <span>{index + 1}</span>
                  {label}
                </a>
              ),
            )}
          </nav>
          <div className="wizard-layout">
            <div className="wizard-fields">
              <h3 id="wizard-heading" tabIndex={-1}>
                {step === 1
                  ? "Tell us about your event"
                  : step === 2
                    ? "Define the space and setup"
                    : "Review your complete brief"}
              </h3>
              <section hidden={step !== 1} className="field-stack">
                {field("title", { required: true, maxLength: 100 })}
                <div className="field-row">
                  {select("city", ["Delhi NCR", "Bengaluru"])}
                  {select("eventType", [
                    "Workshop",
                    "Community meetup",
                    "Talk or panel",
                    "Screening",
                    "Retreat",
                    "Other",
                  ])}
                </div>
                <AudienceInput
                  value={values.audience}
                  onChange={(value) => update("audience", value)}
                  error={errors.audience}
                />
                <div className="field-row">
                  {field("date", { type: "date", required: true })}
                  {field("headcount", {
                    type: "number",
                    required: true,
                    min: 1,
                    max: 10000,
                  })}
                </div>
                <div className="field-row">
                  {field("startTime", { type: "time", required: true })}
                  {field("endTime", { type: "time", required: true })}
                </div>
                <p className="helper-text">
                  Event times are in Asia/Kolkata (IST). Start and end must be
                  on the same day.
                </p>
              </section>
              <section hidden={step !== 2} className="field-stack">
                {field("budgetAmount", {
                  type: "number",
                  required: true,
                  min: 0,
                  max: 100000000,
                  helper:
                    "Use 0 when exploring sponsored or pro-bono access; access conditions still require evidence.",
                })}
                <label className="choice-control">
                  <input
                    type="checkbox"
                    checked={manualRooms || Boolean(values.rooms)}
                    onChange={(e) => {
                      setManualRooms(e.target.checked);
                      if (!e.target.checked) update("rooms", "");
                    }}
                  />
                  I already know the spaces I need
                </label>
                {(manualRooms || Boolean(values.rooms)) &&
                  field("rooms", {
                    helper:
                      "Optional. Separate explicit spaces with commas. Existing requirements are retained.",
                  })}
                <RequirementPicker
                  equipmentValue={values.equipment}
                  essentialValue={values.essential}
                  onEquipment={(v) => update("equipment", v)}
                  onEssential={(v) => update("essential", v)}
                />
                {errors.equipment && (
                  <small className="field-error">{errors.equipment}</small>
                )}
                {field("essential", {
                  helper:
                    "Comma-separated must-haves; unknowns will remain unknown.",
                })}
                {field("flexible", {
                  helper:
                    "Helpful extras. Missing these will not automatically rule out a venue.",
                })}
                <div className="field-row">
                  {field("setupMinutes", { type: "number", min: 0, max: 1440 })}
                  {field("cleanupMinutes", {
                    type: "number",
                    min: 0,
                    max: 1440,
                  })}
                </div>
                <Notice>
                  Setup and clear-up add to the occupied event interval. They do
                  not change guest arrival or end time.
                </Notice>
              </section>
              <section hidden={step !== 3}>
                <div className="review-section">
                  <div className="section-title">
                    <h4>Event details</h4>
                    <a
                      href="?view=brief&step=1"
                      onClick={(event) => {
                        event.preventDefault();
                        goStep(1);
                      }}
                    >
                      Edit event details
                    </a>
                  </div>
                  <dl className="brief-review">
                    {basics.map((name) => (
                      <div key={name}>
                        <dt>{labels[name]}</dt>
                        <dd>{values[name] || "Not provided"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="review-section">
                  <div className="section-title">
                    <h4>Space and requirements</h4>
                    <a
                      href="?view=brief&step=2"
                      onClick={(event) => {
                        event.preventDefault();
                        goStep(2);
                      }}
                    >
                      Edit requirements
                    </a>
                  </div>
                  <dl className="brief-review">
                    {(
                      [
                        "budgetAmount",
                        "rooms",
                        "equipment",
                        "essential",
                        "flexible",
                        "setupMinutes",
                        "cleanupMinutes",
                      ] as BriefField[]
                    ).map((name) => (
                      <div key={name}>
                        <dt>{labels[name]}</dt>
                        <dd>{values[name] || "None specified"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <Notice>
                  Research returns potential leads with source-backed facts and
                  explicit unknowns. It does not reserve a venue. Finding venues
                  also saves this brief in your browser.
                </Notice>
              </section>
            </div>
            <aside className="brief-live-summary">
              <p className="eyebrow">Your event at a glance</p>
              <h3>{values.title || "Untitled event"}</h3>
              <p>
                {values.city} · {values.headcount || "—"} attendees
              </p>
              <p>
                {values.date || "Date to choose"}
                <br />
                {values.startTime}–{values.endTime} IST
              </p>
              <dl>
                <dt>Venue budget</dt>
                <dd>
                  {values.budgetAmount !== ""
                    ? `₹${Number(values.budgetAmount).toLocaleString("en-IN")}`
                    : "To specify"}
                </dd>
                <dt>Occupied buffers</dt>
                <dd>
                  {values.setupMinutes || "0"} min setup ·{" "}
                  {values.cleanupMinutes || "0"} min clear-up
                </dd>
              </dl>
              <p className="helper-text">
                Browser-saved briefs and server-saved application drafts are
                separate.
              </p>
            </aside>
          </div>
          <div className="form-submit">
            <div>
              {step > 1 && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => goStep((step - 1) as 1 | 2)}
                >
                  Back
                </Button>
              )}
              <span className="helper-text">Step {step} of 3</span>
            </div>
            <div className="form-action-group">
              {step < 3 ? (
                <Button type="submit" disabled={!ready}>
                  Continue
                </Button>
              ) : (
                <>
                  <Button variant="secondary" type="submit" disabled={!ready}>
                    Save event brief
                  </Button>
                  <Button
                    type="button"
                    onClick={findVenues}
                    disabled={!ready || loading}
                  >
                    {loading ? "Finding venues…" : "Find suitable venues"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
        {saved && (
          <p className="saved-status" role="status">
            Your event brief is saved in this browser.
          </p>
        )}
      </section>
      <section
        hidden={view !== "research"}
        id="venue-leads"
        className="discovery-panel"
        aria-busy={loading}
        aria-labelledby="discovery-heading"
      >
        <div className="view-heading">
          <div>
            <h2 id="discovery-heading">Venue research</h2>
            <p className="ops-muted">
              Potential hosts for your brief. Research leads are not onboarded
              for bookings.
            </p>
          </div>
          <a
            className="button button-light"
            href="?view=brief&step=3"
            onClick={(event) => {
              event.preventDefault();
              setQueryValues({ view: "brief", step: "3" });
            }}
          >
            Review event brief
          </a>
        </div>
        {lastBrief && (
          <div className="discovery-snapshot">
            <Badge>Discovery brief snapshot</Badge>
            <p>
              <strong>{lastBrief.title}</strong> · {lastBrief.city} ·{" "}
              {lastBrief.headcount} attendees · {lastBrief.date} ·{" "}
              {lastBrief.startTime}–{lastBrief.endTime} IST
            </p>
          </div>
        )}
        {changedSinceDiscovery && (
          <Notice tone="warning">
            The form has changed since these results were requested. Follow-ups
            and private drafts keep the discovery snapshot above. Review the
            edited brief to start a new search.
          </Notice>
        )}
        {loading && (
          <Notice role="status">
            Retrieving and validating published venue evidence…
            {recommendations &&
              " Previous verified results are retained until the response succeeds."}
          </Notice>
        )}
        {agentError && (
          <Notice tone="error" role="alert">
            <p>{agentError}</p>
            {retrySeconds ? (
              <p>
                Try after the daily reset (about{" "}
                {Math.ceil(retrySeconds / 3600)} hours). This retry will use the
                same discovery brief.
              </p>
            ) : null}
            <Button
              variant="secondary"
              type="button"
              disabled={loading || !lastBrief || Boolean(retrySeconds)}
              onClick={() =>
                lastBrief && void runDiscovery(lastBrief, conversation)
              }
            >
              Retry venue search
            </Button>
          </Notice>
        )}
        {handoffMessage && (
          <Notice tone="success" role="status">
            {handoffMessage}
          </Notice>
        )}
        {!recommendations && !loading && !agentError && (
          <EmptyState title="Start with your event brief">
            Complete the three steps and choose Find suitable venues. Discovery
            runs only when you ask.
          </EmptyState>
        )}
        {recommendations && (
          <>
            <p role="status" className="agent-message">
              {agentMessage}
            </p>
            {setup && (
              <section
                className="review-section"
                aria-labelledby="suggested-setup-heading"
              >
                <h3 id="suggested-setup-heading">Suggested event setup</h3>
                <p>{setup.reason}</p>
                <p>{setup.equipmentPlacement}</p>
                <ul>
                  {setup.assumptions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <label className="field">
                  <span>Adjust proposed spaces</span>
                  <input
                    value={setupRooms}
                    onChange={(e) => setSetupRooms(e.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const next = { ...values, rooms: setupRooms };
                    const found = validateBriefForm(next, 2);
                    if (found.rooms) {
                      setSetupMessage(found.rooms);
                      return;
                    }
                    update("rooms", setupRooms);
                    setManualRooms(true);
                    setSetupMessage(
                      "Setup applied to the editable form only. Review and save it explicitly; these discovery results and existing drafts keep their original brief.",
                    );
                  }}
                >
                  Use this setup in my brief
                </Button>
                {setupMessage && <p role="status">{setupMessage}</p>}
              </section>
            )}
            {recommendations.length === 0 ? (
              <EmptyState title="No verified leads returned">
                Refine your requirements with a follow-up or review your brief.
                Missing evidence is not a confirmed match.
              </EmptyState>
            ) : (
              <div className="recommendation-grid">
                {recommendations.map((venue) => (
                  <ResearchLeadCard
                    key={venue.venueId}
                    venue={venue}
                    onPrepare={() => prepare(venue)}
                  />
                ))}
              </div>
            )}
            <form className="followup-form" onSubmit={sendFollowUp}>
              <label htmlFor="venue-followup">Ask a follow-up question</label>
              <p className="helper-text">
                Uses the discovery brief snapshot, including its original
                requirements.
              </p>
              <div>
                <input
                  id="venue-followup"
                  value={followUp}
                  maxLength={500}
                  onChange={(event) => setFollowUp(event.target.value)}
                  disabled={loading}
                  placeholder="e.g. Exclude Noida; show only Gurugram."
                />
                <Button type="submit" disabled={loading || !followUp.trim()}>
                  Refine leads
                </Button>
              </div>
            </form>
          </>
        )}
      </section>
    </>
  );
}
