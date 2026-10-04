"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { City, EventBrief, VenueRecommendation } from "@/types";
import {publishResearchApplicationHandoff} from "@/lib/application-handoff";

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
type Recommendation = VenueRecommendation;
type ConversationTurn = {role: "user" | "assistant"; content: string};
type ExampleKey="delhi-hackathon"|"bengaluru-founders"|"demo-workshop";

function csv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function EventBriefForm() {
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [agentMessage, setAgentMessage] = useState("");
  const [agentError, setAgentError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastBrief, setLastBrief] = useState<EventBrief | null>(null);
  const [handoffMessage,setHandoffMessage]=useState("");
  const [example,setExample]=useState<ExampleKey>("delhi-hackathon");

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
    setLastBrief(null);
    setConversation([]);
    setRecommendations(null);
    setAgentMessage("");
    setAgentError("");
  }

  function createDraft(source:FormValues=values): EventBrief | null {
    if (source.endTime <= source.startTime) {
      setError("Choose an end time that comes after the start time.");
      return null;
    }

    const draft: EventBrief = {
      id: crypto.randomUUID(),
      title: source.title.trim(),
      city: source.city,
      eventType: source.eventType,
      date: source.date,
      startTime: source.startTime,
      endTime: source.endTime,
      audience: source.audience.trim(),
      headcount: Number(source.headcount),
      budgetAmount: Number(source.budgetAmount),
      currency: "INR",
      roomRequirements: csv(source.rooms),
      equipmentRequirements: csv(source.equipment),
      essentialRequirements: csv(source.essential),
      flexibleRequirements: csv(source.flexible),
      setupMinutes: Number(source.setupMinutes) || 0,
      cleanupMinutes: Number(source.cleanupMinutes) || 0,
      savedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setSaved(true);
      setError("");
      setLastBrief(draft);
      return draft;
    } catch {
      setSaved(false);
      setError("This browser couldn’t save your draft. Check its storage settings and try again.");
      return null;
    }
  }

  function exampleDate(days:number,weekday=false) {
    const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    const date=new Date(`${today}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);
    if(weekday)while(date.getUTCDay()===0)date.setUTCDate(date.getUTCDate()+1);
    return date.toISOString().slice(0,10);
  }
  function loadExample() {
    const examples:Record<ExampleKey,FormValues>={
      "delhi-hackathon":{...emptyForm,title:"Delhi NCR community hackathon",city:"Delhi NCR",eventType:"Other",date:exampleDate(12),startTime:"09:00",endTime:"18:00",audience:"Student and independent builder teams",headcount:"80",budgetAmount:"15000",rooms:"Main event room, breakout rooms",equipment:"Projector, microphones, reliable Wi-Fi",essential:"Capacity for 80 in a documented room layout, suitable equipment, within budget",flexible:"Room arrangement",setupMinutes:"60",cleanupMinutes:"45"},
      "bengaluru-founders":{...emptyForm,title:"Bengaluru founder gathering",city:"Bengaluru",eventType:"Community meetup",date:exampleDate(14),startTime:"17:00",endTime:"20:00",audience:"Early-stage founders and startup operators",headcount:"28",budgetAmount:"0",rooms:"Gathering room",equipment:"Projector",essential:"Explore pro-bono access and founder-community eligibility",flexible:"Weekday evening",setupMinutes:"30",cleanupMinutes:"30"},
      "demo-workshop":{...emptyForm,title:"Fictional host workshop demo",city:"Delhi NCR",eventType:"Workshop",date:exampleDate(14,true),startTime:"11:00",endTime:"13:00",audience:"Local community makers",headcount:"20",budgetAmount:"0",rooms:"Workshop Studio",equipment:"Projector",essential:"Workshop Studio and projector",flexible:"Start time",setupMinutes:"30",cleanupMinutes:"30"},
    };
    const next=examples[example];setValues(next);setConversation([]);setRecommendations(null);setLastBrief(null);setAgentError("");setAgentMessage("");setHandoffMessage("");
    const brief=createDraft(next);if(brief){setSaved(true);setAgentMessage("Example brief loaded. No application or reservation was created.");}
  }

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createDraft();
  }

  async function runDiscovery(draft: EventBrief, turns: ConversationTurn[]) {
    setLoading(true);
    setAgentError("");
    setRecommendations(null);
    try {
      const response = await fetch("/api/venue-discovery", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({brief: draft, conversation: turns.slice(-8)}),
      });
      const payload = await response.json() as {error?: string; message?: string; recommendations?: Recommendation[]};
      if (!response.ok) throw new Error(payload.error || "Venue discovery could not be completed. Please retry.");
      setRecommendations(payload.recommendations || []);
      setAgentMessage(payload.message || "Here are the researched venue leads I could verify.");
      if (payload.message) setConversation((current) => [...current, {role: "assistant" as const, content: payload.message!}].slice(-8));
    } catch (caught) {
      setAgentError(caught instanceof Error ? caught.message : "Venue discovery could not be completed. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  function findVenues() {
    if (!formRef.current?.reportValidity()) return;
    const draft = createDraft();
    if (!draft) return;
    setConversation([]);
    const turns = [{role: "user" as const, content: "Find suitable venue leads for my saved event brief."}];
    setConversation(turns);
    setLastBrief(draft);
    void runDiscovery(draft, turns);
  }

  function sendFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!followUp.trim() || !lastBrief || loading) return;
    const turns = [...conversation, {role: "user" as const, content: followUp.trim()}].slice(-8);
    setConversation(turns);
    setFollowUp("");
    void runDiscovery(lastBrief, turns);
  }

  function prepareApplication(venue:Recommendation) {
    if(!lastBrief) return;
    const questions=venue.requirementCoverage.filter((item)=>item.status!=="supported").map((item)=>`${item.requirement}: ${item.status==="contradicted"?"sources conflict or document a mismatch":"needs confirmation"}`);
    for(const item of venue.importantUnknowns) questions.push(`${item.claim}: ${item.value}`);
    publishResearchApplicationHandoff({venueId:venue.venueId,venueName:venue.name,brief:lastBrief,questions:[...new Set(questions)],recommendation:venue,createdAt:new Date().toISOString()});
    setHandoffMessage(`Application builder prepared for ${venue.name} using “${lastBrief.title}”. Review the discovery snapshot and current application before saving.`);
    document.getElementById("application-builder")?.scrollIntoView({behavior:"smooth",block:"start"});
  }

  const field = (name: keyof FormValues, value: string) => update(name, value);

  return (
    <>
    <form id="event-brief" className="brief-form" ref={(element) => { formRef.current = element; }} onSubmit={saveDraft}>
      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {saved && <p className="form-message success-message" role="status">Your event brief is saved in this browser. You can come back and edit it any time.</p>}

      <div className="example-brief-row">
        <label className="field example-control"><span>Try an example <i>Optional</i></span><select aria-label="Try an example" value={example} onChange={(event)=>setExample(event.target.value as ExampleKey)}><option value="delhi-hackathon">Delhi NCR hackathon · research unknowns</option><option value="bengaluru-founders">Bengaluru founders · qualified eligibility</option><option value="demo-workshop">Fictional host workshop · operations demo</option></select></label>
        <button className="button button-light" type="button" onClick={loadExample} disabled={!ready}>Load example</button>
        <p>Examples fill the brief only. They never create an application or reservation.</p>
      </div>

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
      <div className="form-submit"><p>Your brief stays saved in this browser. Venue leads are evidence to investigate, not booking confirmations.</p><div className="form-action-group"><button className="button button-light" type="submit" disabled={!ready}>Save event brief</button><button className="button button-dark" type="button" onClick={findVenues} disabled={!ready || loading}>{loading ? "Looking into venues…" : "Find suitable venues"} <span className="arrow-circle" aria-hidden="true">↗</span></button></div></div>
    </form>
    <section id="venue-leads" className="discovery-panel" aria-live="polite" aria-busy={loading} aria-labelledby="discovery-heading">
      <div className="discovery-heading"><p className="eyebrow"><span className="eyebrow-dot" /> SOURCE-BACKED VENUE LEADS</p><h2 id="discovery-heading">Venue leads</h2><p>Each lead includes source links, requirement status, qualifications, and open questions. Availability and booking authority remain unconfirmed.</p></div>
      {loading && <p className="discovery-state" role="status">Checking the event brief against published venue knowledge…</p>}
      {agentError && <div className="discovery-state error-message" role="alert"><p>{agentError}</p><button className="button button-light" type="button" onClick={() => lastBrief && void runDiscovery(lastBrief, conversation)} disabled={!lastBrief || loading}>Retry venue search</button></div>}
      {!loading && recommendations && recommendations.length === 0 && <p className="discovery-state" role="status">{agentMessage} Try refining the event brief or asking a follow-up question below.</p>}
      {!loading && recommendations && recommendations.length > 0 && <>
        <p className="discovery-state" role="status">{agentMessage}</p>
        {handoffMessage&&<p className="form-message success-message" role="status">{handoffMessage}</p>}
        <div className="recommendation-grid">{recommendations.map((venue) => <article className="recommendation-card" key={venue.venueId}>
          <div className="venue-card-top"><span className="venue-city">{venue.city}</span><span className="lead-badge">POTENTIAL HOST · NOT ONBOARDED</span></div>
          <h3>{venue.name}</h3><p className="venue-locality">{venue.locality}</p>
          {venue.historical && <p className="historical-note">The cited record includes past event hosting. It does not establish current access or permission to book.</p>}
          {venue.documentedFacts.length > 0 && <section className="coverage-section"><h4>Published venue notes</h4><ul>{venue.documentedFacts.map((fact, index) => <li key={index}><span className="coverage-status supported">{fact.evidenceType === "historical-event" ? `Historical${fact.historicalDate ? ` · ${fact.historicalDate}` : ""}` : fact.evidenceType === "host-confirmed" ? "Host confirmed" : "Publicly documented"}</span><strong>{fact.claim}</strong><small>{fact.value}{fact.qualification ? ` ${fact.qualification}` : ""}</small></li>)}</ul></section>}
          {venue.importantUnknowns.length > 0 && <section className="coverage-section"><h4>Important unknowns</h4><ul>{venue.importantUnknowns.map((item, index) => <li key={index}><strong>{item.claim}</strong><small>{item.value}</small></li>)}</ul></section>}
          <section className="coverage-section" aria-label="Event requirement coverage"><h4>How it relates to your brief</h4><ul>{venue.requirementCoverage.map((item) => <li key={item.requirement}><span className={`coverage-status ${item.status}`}>{item.status === "supported" ? "Supported" : item.status === "contradicted" ? "Conflicting evidence" : "Unknown"}</span><strong>{item.requirement}</strong>{item.evidence.map((claim, index) => <small key={`${item.requirement}-${index}`}>{claim.claim} {claim.qualification ? claim.qualification : claim.value}</small>)}</li>)}</ul></section>
          {venue.documentedConflicts.length > 0 && <section className="coverage-section"><h4>Documented conflicts</h4><ul>{venue.documentedConflicts.map((conflict, index) => <li key={index}><strong>{conflict.claim}</strong><small>{conflict.value}</small></li>)}</ul></section>}
          <p className="recommendation-next"><strong>Suggested next step</strong>{venue.nextStep}</p>
          <section className="recommendation-sources"><h4>Original sources</h4>{venue.sourceReferences.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title}<span aria-hidden="true"> ↗</span></a>)}</section>
          <button className="button button-light" type="button" onClick={()=>prepareApplication(venue)} disabled={!lastBrief}>Prepare application draft</button>
        </article>)}</div>
      </>}
      {!loading && recommendations && <form className="followup-form" onSubmit={sendFollowUp}><label htmlFor="venue-followup">Ask a follow-up question</label><div><input id="venue-followup" value={followUp} onChange={(event) => setFollowUp(event.target.value)} maxLength={500} placeholder="e.g. What about the Noida option?" disabled={loading}/><button className="button button-dark" type="submit" disabled={loading || !followUp.trim()}>Refine leads <span className="arrow-circle" aria-hidden="true">↗</span></button></div></form>}
    </section>
    </>
  );
}
