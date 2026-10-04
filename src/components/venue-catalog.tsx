"use client";

import {useMemo, useState} from "react";
import Link from "next/link";
import type {PublishedVenue} from "@/lib/sanity-venue-data";

export default function VenueCatalog({venues,origin}:{venues:PublishedVenue[];origin:"live"|"preview"}) {
  const [city,setCity]=useState("All cities");
  const visible=useMemo(()=>city==="All cities"?venues:venues.filter((venue)=>venue.city===city),[city,venues]);
  return <main className="venue-page page-wrap">
    <div className="workflow-intro venue-intro"><div className="workflow-heading"><p className="eyebrow"><span className="eyebrow-dot"/> SOURCE-BACKED RESEARCH</p><h1>Venue leads</h1><p>Explore researched venues in Delhi NCR and Bengaluru. Source evidence and open questions stay visible.</p></div>
      <aside className="venue-origin"><strong>{origin==="live"?"Published Sanity content":"Local research preview"}</strong><span>{origin==="live"?"Fetched at request time from published, eligible research venue records.":"Sanity is not available; this fallback is checked-in research JSON, not a live connection."}</span><span>{venues.length} researched leads · none onboarded for Backstage bookings</span></aside></div>
    <div className="catalog-toolbar"><label htmlFor="city-filter">Filter by city</label><select id="city-filter" value={city} onChange={(event)=>setCity(event.target.value)}><option>All cities</option><option>Delhi NCR</option><option>Bengaluru</option></select><span aria-live="polite">{visible.length} {visible.length===1?"profile":"profiles"}</span></div>
    <div className="venue-grid">{visible.map((venue)=>{
      const documented=venue.claims.filter((claim)=>claim.evidenceType!=="unknown"&&claim.evidenceType!=="conflicting");
      const unknown=venue.claims.filter((claim)=>claim.evidenceType==="unknown");
      const conflicts=venue.claims.filter((claim)=>claim.evidenceType==="conflicting");
      return <article className="venue-card" key={venue.id}>
        <div className="venue-card-top"><span className="venue-city">{venue.city}</span><span className="lead-badge">Researched lead · not onboarded</span></div>
        <h2>{venue.name}</h2><p className="venue-locality">{venue.locality}</p><p className="venue-summary">{venue.summary}</p>
        <div className="venue-statuses" aria-label="Evidence summary"><span className="status-chip supported">Supported · {documented.length}</span><span className="status-chip unknown">Unknown · {unknown.length}</span>{conflicts.length>0&&<span className="status-chip conflicting">Conflicting · {conflicts.length}</span>}</div>
        {documented.slice(0,2).map((claim)=><div className="venue-highlight" key={claim.id}><span className="evidence-label">{claim.evidenceType==="historical-event"?`Past event${claim.historicalDate?` · ${claim.historicalDate}`:""}`:claim.evidenceType==="host-confirmed"?"Host confirmed":"Publicly documented"}</span><strong>{claim.claim}</strong><span>{claim.value}{claim.qualification?` ${claim.qualification}`:""}</span></div>)}
        {(unknown.length>0||conflicts.length>0)&&<section className="venue-unknowns"><h3>Needs confirmation</h3><ul>{[...unknown,...conflicts].slice(0,2).map((claim)=><li key={claim.id}><span className={`status-chip ${claim.evidenceType==="conflicting"?"conflicting":"unknown"}`}>{claim.evidenceType==="conflicting"?"Conflicting":"Unknown"}</span><strong>{claim.claim}</strong><span>{claim.value}{claim.qualification?` ${claim.qualification}`:""}</span></li>)}</ul></section>}
        {venue.claims.some((claim)=>claim.evidenceType==="historical-event")&&<p className="historical-note">Past event evidence does not establish current availability or permission to book through Backstage.</p>}
        <details className="venue-details"><summary>Facilities, evidence, and source notes</summary>
          {(unknown.length>0||conflicts.length>0)&&<section className="venue-section"><h3>All unknowns and conflicts</h3><ul>{[...unknown,...conflicts].map((claim)=><li key={claim.id}><span className={`status-chip ${claim.evidenceType==="conflicting"?"conflicting":"unknown"}`}>{claim.evidenceType==="conflicting"?"Conflicting":"Unknown"}</span><strong>{claim.claim}</strong><span>{claim.value}{claim.qualification?` ${claim.qualification}`:""}</span></li>)}</ul></section>}
          {venue.spaces?.length>0&&<section className="venue-section"><h3>Publicly described spaces</h3><ul>{venue.spaces.map((space)=><li key={space.id}><strong>{space.name}</strong><span>{space.summary}</span><small>{space.capacity?`${space.capacity.guestCount} guests · ${space.capacity.layout} · source checked ${space.capacity.checkedAt||"date not recorded"}`:`Capacity and layout: unknown`}</small>{space.sourceReferences?.map((source)=><a key={source.id} href={source.url} target="_blank" rel="noreferrer">Source: {source.title} ↗</a>)}</li>)}</ul></section>}
          {venue.resources?.length>0&&<section className="venue-section"><h3>Facilities mentioned</h3><ul>{venue.resources.map((resource)=><li key={resource.id}><strong>{resource.name}</strong><span>{resource.summary}</span><small>Operational availability: {resource.availability||"unknown"}</small>{resource.sourceReferences?.map((source)=><a key={source.id} href={source.url} target="_blank" rel="noreferrer">Source: {source.title} ↗</a>)}</li>)}</ul></section>}
          <section className="venue-section evidence-section"><h3>What the sources say</h3><ul>{documented.map((claim)=><li key={claim.id}><span className="evidence-label">{claim.evidenceType==="historical-event"?`Historical event${claim.historicalDate?` · ${claim.historicalDate}`:""}`:claim.evidenceType==="public-documentation"?"Public documentation":claim.evidenceType}</span><strong>{claim.claim}</strong><span>{claim.value}{claim.qualification?` ${claim.qualification}`:""}</span><small>Source checked {claim.checkedAt||"date not recorded"}</small>{claim.sourceReferences.map((source)=><a key={source.id} href={source.url} target="_blank" rel="noreferrer">Source: {source.title} ↗</a>)}</li>)}</ul></section>
        </details>
        <section className="venue-sources"><h3>Source</h3>{venue.sourceReferences.slice(0,1).map((source)=><a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title}{source.checkedAt?` · checked ${source.checkedAt}`:""} ↗</a>)}</section>
        <Link className="button button-light venue-next-action" href="/organizer">Start an event brief <span aria-hidden="true">→</span></Link>
        <p className="venue-disclaimer">Public information is not a partnership, live availability, or permission for Backstage to submit a booking.</p>
      </article>;
    })}</div>
  </main>;
}
