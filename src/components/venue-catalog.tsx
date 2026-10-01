"use client";

import {useMemo, useState} from "react";
import catalog from "@/data/research-catalog.json";

type CatalogVenue = (typeof catalog.venues)[number];

export default function VenueCatalog() {
  const [city, setCity] = useState("All cities");
  const venues = useMemo(() => city === "All cities" ? catalog.venues : catalog.venues.filter((venue) => venue.city === city), [city]);
  const sources = new Map(catalog.sources.map((source) => [source.id, source]));

  return <main className="venue-page page-wrap">
    <div className="workflow-intro venue-intro">
      <div className="workflow-heading"><p className="eyebrow"><span className="eyebrow-dot" /> SOURCE-BACKED RESEARCH</p><h1>Places with<br /><em>potential.</em></h1><p>Explore public information about spaces in Delhi NCR and Bengaluru. Each profile links back to its source and keeps unanswered questions visible.</p></div>
      <aside className="venue-origin"><strong>Local research preview</strong><span>This catalogue is loaded from reviewed project data, not a live Sanity connection.</span><span>Sources checked {catalog.researchDate} · {catalog.venues.length} research leads</span></aside>
    </div>
    <div className="catalog-toolbar"><label htmlFor="city-filter">Filter by city</label><select id="city-filter" value={city} onChange={(event) => setCity(event.target.value)}><option>All cities</option><option>Delhi NCR</option><option>Bengaluru</option></select><span aria-live="polite">{venues.length} {venues.length === 1 ? "profile" : "profiles"}</span></div>
    <div className="venue-grid">{venues.map((venue: CatalogVenue) => <article className="venue-card" key={venue.id}>
      <div className="venue-card-top"><span className="venue-city">{venue.city}</span><span className="lead-badge">Research lead · not onboarded</span></div>
      <h2>{venue.name}</h2><p className="venue-locality">{venue.locality}</p><p className="venue-summary">{venue.summary}</p>
      {venue.spaces.length > 0 && <section className="venue-section"><h3>Publicly described spaces</h3><ul>{venue.spaces.map((space) => <li key={space.id}><strong>{space.name}</strong><span>{space.summary}</span>{space.capacity === null && <small>Capacity and layout: unknown</small>}</li>)}</ul></section>}
      {venue.resources.length > 0 && <section className="venue-section"><h3>Facilities mentioned</h3><ul>{venue.resources.map((resource) => <li key={resource.id}><strong>{resource.name}</strong><span>{resource.summary}</span></li>)}</ul></section>}
      <section className="venue-section evidence-section"><h3>What the sources say</h3><ul>{venue.claims.filter((claim) => claim.evidenceType !== "unknown").map((claim) => <li key={claim.id}>
        <span className="evidence-label">{claim.evidenceType === "historical-event" ? `Historical event · ${(claim as {historicalDate?: string}).historicalDate}` : claim.evidenceType === "public-documentation" ? "Public documentation" : claim.evidenceType}</span>
        <strong>{claim.claim}</strong><span>{claim.value}</span><small>Checked {claim.checkedAt}</small>
        {claim.sourceIds.map((id) => { const source = sources.get(id); return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer">Source: {source.title} <span aria-hidden="true">↗</span></a> : null; })}
      </li>)}</ul></section>
      {venue.claims.some((claim) => claim.evidenceType === "historical-event") && <p className="historical-note">Historical event evidence only: {(venue.claims.find((claim) => claim.evidenceType === "historical-event") as {historicalDate?: string} | undefined)?.historicalDate}. This does not establish current availability or booking permission.</p>}
      <details className="unknowns"><summary>Important unknowns</summary><ul>{venue.claims.filter((claim) => claim.evidenceType === "unknown").map((claim) => <li key={claim.id}><strong>{claim.claim}</strong><span>{claim.value}</span></li>)}</ul></details>
      <section className="venue-sources"><h3>Sources checked {catalog.researchDate}</h3>{venue.sourceIds.map((id) => { const source = sources.get(id); return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer">{source.title} <span aria-hidden="true">↗</span></a> : null; })}</section>
      <p className="venue-disclaimer">A public event mention is not a partnership, live availability, or permission for Backstage to submit a booking.</p>
    </article>)}</div>
  </main>;
}
