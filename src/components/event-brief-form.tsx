"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { City, EventBrief } from "@/types";

const STORAGE_KEY = "backstage.event-brief.v1";
const emptyForm = {
  title: "",
  city: "Delhi NCR" as City,
  eventType: "",
  date: "",
  startTime: "10:00",
  endTime: "12:00",
  audience: "",
  headcount: "",
  budgetAmount: "",
  rooms: "",
  equipment: "",
  essential: "",
  flexible: "",
  setupMinutes: "30",
  cleanupMinutes: "30",
};

type FormValues = typeof emptyForm;

function csv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function EventBriefForm() {
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const rawDraft = window.localStorage.getItem(STORAGE_KEY);
        if (rawDraft) {
          const draft = JSON.parse(rawDraft) as EventBrief;
          setValues({
            title: draft.title,
            city: draft.city,
            eventType: draft.eventType,
            date: draft.date,
            startTime: draft.startTime,
            endTime: draft.endTime,
            audience: draft.audience,
            headcount: String(draft.headcount),
            budgetAmount: String(draft.budgetAmount),
            rooms: draft.roomRequirements.join(", "),
            equipment: draft.equipmentRequirements.join(", "),
            essential: draft.essentialRequirements.join(", "),
            flexible: draft.flexibleRequirements.join(", "),
            setupMinutes: String(draft.setupMinutes),
            cleanupMinutes: String(draft.cleanupMinutes),
          });
          setSaved(true);
        }
      } catch {
        setError("We couldn’t read the saved draft in this browser. You can start a new one below.");
      } finally {
        setReady(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function update(field: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setSaved(false);
    setError("");
  }

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (values.endTime <= values.startTime) {
      setError("Choose an end time that comes after the start time.");
      return;
    }

    const draft: EventBrief = {
      id: crypto.randomUUID(),
      title: values.title.trim(),
      city: values.city,
      eventType: values.eventType,
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      audience: values.audience.trim(),
      headcount: Number(values.headcount),
      budgetAmount: Number(values.budgetAmount),
      currency: "INR",
      roomRequirements: csv(values.rooms),
      equipmentRequirements: csv(values.equipment),
      essentialRequirements: csv(values.essential),
      flexibleRequirements: csv(values.flexible),
      setupMinutes: Number(values.setupMinutes) || 0,
      cleanupMinutes: Number(values.cleanupMinutes) || 0,
      savedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setSaved(true);
      setError("");
    } catch {
      setSaved(false);
      setError("This browser couldn’t save your draft. Check its storage settings and try again.");
    }
  }

  const field = (name: keyof FormValues, value: string) => update(name, value);

  return (
    <form className="brief-form" onSubmit={saveDraft}>
      <div className="form-progress"><span className="progress-step current"><b>01</b><span>Event basics</span></span><span className="progress-line" /><span className="progress-step"><b>02</b><span>Space &amp; needs</span></span><span className="progress-later">MATCHING COMES NEXT</span></div>
      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {saved && <p className="form-message success-message" role="status">Your event brief is saved in this browser. You can come back and edit it any time.</p>}

      <div className="form-columns">
        <section className="form-section" aria-labelledby="event-basics-title">
          <div className="form-section-heading"><span className="form-section-number">01</span><div><h2 id="event-basics-title">The gathering</h2><p>Start with the shape of the day.</p></div></div>
          <div className="field-stack">
            <label className="field"><span>What are you calling it? <i>Required</i></span><input required maxLength={100} value={values.title} onChange={(e) => field("title", e.target.value)} placeholder="e.g. Sunday makers’ table" autoComplete="off" /></label>
            <div className="field-row">
              <label className="field"><span>City <i>Required</i></span><select value={values.city} onChange={(e) => field("city", e.target.value)}><option>Delhi NCR</option><option>Bengaluru</option></select></label>
              <label className="field"><span>Kind of gathering <i>Required</i></span><select required value={values.eventType} onChange={(e) => field("eventType", e.target.value)}><option value="">Choose one</option><option>Workshop</option><option>Community meetup</option><option>Talk or panel</option><option>Screening</option><option>Retreat</option><option>Other</option></select></label>
            </div>
            <label className="field"><span>Who’s coming? <i>Required</i></span><input required maxLength={120} value={values.audience} onChange={(e) => field("audience", e.target.value)} placeholder="e.g. Independent designers and makers" /></label>
            <div className="field-row">
              <label className="field"><span>Event date <i>Required</i></span><input required type="date" value={values.date} onChange={(e) => field("date", e.target.value)} /></label>
              <label className="field"><span>Expected guests <i>Required</i></span><input required type="number" min="1" max="10000" step="1" value={values.headcount} onChange={(e) => field("headcount", e.target.value)} placeholder="30" /></label>
            </div>
            <div className="field-row">
              <label className="field"><span>Doors open <i>Required</i></span><input required type="time" value={values.startTime} onChange={(e) => field("startTime", e.target.value)} /></label>
              <label className="field"><span>Wrap up <i>Required</i></span><input required type="time" value={values.endTime} onChange={(e) => field("endTime", e.target.value)} /></label>
            </div>
            <label className="field"><span>Budget for the space <i>INR · Required</i></span><div className="input-prefix"><span aria-hidden="true">₹</span><input required type="number" min="0" step="500" value={values.budgetAmount} onChange={(e) => field("budgetAmount", e.target.value)} placeholder="15000" /></div></label>
          </div>
        </section>

        <section className="form-section setup-section" aria-labelledby="space-needs-title">
          <div className="form-section-heading"><span className="form-section-number">02</span><div><h2 id="space-needs-title">The space &amp; details</h2><p>Help us picture what will make it work.</p></div></div>
          <div className="field-stack">
            <label className="field"><span>Rooms or areas</span><input value={values.rooms} onChange={(e) => field("rooms", e.target.value)} placeholder="Comma-separated · e.g. main room, breakout space" /><small>List spaces you’ll need, if you know.</small></label>
            <label className="field"><span>Equipment or setup</span><input value={values.equipment} onChange={(e) => field("equipment", e.target.value)} placeholder="e.g. projector, 2 mics, moveable chairs" /><small>Shared resources matter too.</small></label>
            <fieldset className="field"><legend>What’s essential?</legend><label className="field"><span className="sr-only">Essential requirements</span><input value={values.essential} onChange={(e) => field("essential", e.target.value)} placeholder="Comma-separated · must-haves" /></label><small>We’ll treat these as non-negotiable.</small></fieldset>
            <fieldset className="field"><legend>What could flex?</legend><label className="field"><span className="sr-only">Flexible requirements</span><input value={values.flexible} onChange={(e) => field("flexible", e.target.value)} placeholder="Comma-separated · nice-to-haves" /></label><small>Useful context when the perfect setup doesn’t exist.</small></fieldset>
            <div className="field-row">
              <label className="field"><span>Setup time <i>Minutes</i></span><input type="number" min="0" max="1440" step="5" value={values.setupMinutes} onChange={(e) => field("setupMinutes", e.target.value)} /></label>
              <label className="field"><span>Clear-up time <i>Minutes</i></span><input type="number" min="0" max="1440" step="5" value={values.cleanupMinutes} onChange={(e) => field("cleanupMinutes", e.target.value)} /></label>
            </div>
            <div className="form-footnote"><span aria-hidden="true">↳</span><p>Setup and clear-up count as part of your time at a venue. We’ll remember to make room for them.</p></div>
          </div>
        </section>
      </div>
      <div className="form-submit"><p>Your brief is saved only on this device. Recommendations and booking requests are not available yet.</p><button className="button button-dark" type="submit" disabled={!ready}>Save event brief <span className="arrow-circle" aria-hidden="true">↗</span></button></div>
    </form>
  );
}
