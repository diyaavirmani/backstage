"use client";

import Link from "next/link";
import type { PublishedVenue } from "@/lib/sanity-venue-data";
import {
  Badge,
  Button,
  DetailDialog,
  EmptyState,
  Notice,
  PageHeader,
  SourceLink,
} from "@/components/ui";
import { setQueryValues, useQueryValues } from "@/lib/workspace-navigation";

export default function VenueCatalog({
  venues,
  origin,
}: {
  venues: PublishedVenue[];
  origin: "live" | "preview";
}) {
  const query = useQueryValues(),
    city = query.get("city") || "All cities",
    search = query.get("q") || "";
  const selected = venues.find((venue) => venue.id === query.get("venue"));
  const visible = venues.filter(
    (venue) =>
      (city === "All cities" || venue.city === city) &&
      `${venue.name} ${venue.city} ${venue.locality} ${venue.summary}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const close = () => setQueryValues({ venue: null });
  return (
    <main id="main-content" className="venue-page">
      <PageHeader
        cover="/images/campus-centre.jpg"
        title="Venue research"
        description="Published research in Delhi NCR and Bengaluru. Potential hosts to investigate, with evidence and open questions."
        label="Research leads · not onboarded"
      />
      <Notice tone={origin === "live" ? "info" : "warning"}>
        <strong>
          {origin === "live"
            ? "Published Sanity content"
            : "Local research preview"}
        </strong>
        <p>
          {origin === "live"
            ? "Published venue records, related facilities, and original source references. Source-check dates reflect the research date, not this fetch."
            : "Sanity is unavailable. This explicitly labeled fallback comes from checked-in research JSON; it is not a live connection."}
        </p>
        <p>
          All {venues.length} leads remain private-draft only. Current
          availability, prices, and booking authority need confirmation.
        </p>
      </Notice>
      <div className="catalog-toolbar">
        <label className="field" htmlFor="city-filter">
          <span>Filter by city</span>
          <select
            id="city-filter"
            value={city}
            onChange={(event) => setQueryValues({ city: event.target.value })}
          >
            <option>All cities</option>
            <option>Delhi NCR</option>
            <option>Bengaluru</option>
          </select>
        </label>
        <label className="field" htmlFor="venue-search">
          <span>Search venues or locality</span>
          <input
            id="venue-search"
            type="search"
            value={search}
            onChange={(event) =>
              setQueryValues({ q: event.target.value || null }, true)
            }
          />
        </label>
        <span aria-live="polite">{visible.length} profiles</span>
      </div>
      {!visible.length && (
        <EmptyState title="No research leads for this filter">
          <Button
            variant="secondary"
            onClick={() => setQueryValues({ city: null, q: null })}
          >
            Clear filters
          </Button>
        </EmptyState>
      )}
      <div className="venue-grid">
        {visible.map((venue) => {
          const documented = venue.claims.filter(
            (claim) => !["unknown", "conflicting"].includes(claim.evidenceType),
          );
          const unknown = venue.claims.filter((claim) =>
            ["unknown", "conflicting"].includes(claim.evidenceType),
          );
          const qualifications = documented.filter(
            (claim) =>
              claim.qualification ||
              claim.evidenceType === "historical-event" ||
              /eligib|access/i.test(claim.claim),
          );
          return (
            <article
              className="venue-card"
              data-venue-id={venue.id}
              key={venue.id}
            >
              <div className="venue-card-top">
                <Badge>Research lead · not onboarded</Badge>
                {documented.some(
                  (claim) => claim.evidenceType === "historical-event",
                ) && <Badge tone="historical">Past event evidence</Badge>}
              </div>
              <h2>{venue.name}</h2>
              <p className="venue-locality">
                {venue.city} · {venue.locality}
              </p>
              <p>{venue.summary}</p>
              <div className="venue-statuses">
                <Badge tone="supported">Documented evidence</Badge>
                <Badge tone="unknown">Requirements need confirmation</Badge>
              </div>
              {qualifications.slice(0, 2).map((claim) => (
                <p className="qualification-note" key={claim.id}>
                  <strong>{claim.claim}:</strong> {claim.value}{" "}
                  {claim.qualification}
                </p>
              ))}
              {!qualifications.length &&
                documented.slice(0, 1).map((claim) => (
                  <p key={claim.id}>
                    <strong>{claim.claim}:</strong> {claim.value}
                  </p>
                ))}
              <p className="helper-text">
                <strong>Needs confirmation:</strong>{" "}
                {unknown
                  .slice(0, 2)
                  .map((claim) => claim.claim)
                  .join("; ") ||
                  "Current availability, price terms, and booking authority"}
                .
              </p>
              <div className="venue-sources">
                {venue.sourceReferences.slice(0, 1).map((source) => (
                  <SourceLink key={source.id} url={source.url}>
                    {source.title}
                    {source.checkedAt ? ` · checked ${source.checkedAt}` : ""}
                  </SourceLink>
                ))}
              </div>
              <div className="card-actions">
                <Button
                  variant="secondary"
                  onClick={() => setQueryValues({ venue: venue.id })}
                >
                  View evidence
                </Button>
                <Link className="text-link" href="/organizer">
                  Start an event brief →
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      <DetailDialog
        open={Boolean(selected)}
        onClose={close}
        title={selected?.name || "Venue evidence"}
      >
        {selected && (
          <>
            <p className="venue-locality">
              {selected.city} · {selected.locality}
            </p>
            <Notice>
              Research lead · not onboarded. Public evidence is not a
              partnership, current availability, or permission for Backstage to
              book.
            </Notice>
            <p>{selected.summary}</p>
            <h3>Claims and their original sources</h3>
            <ul className="evidence-list">
              {selected.claims.map((claim) => (
                <li key={claim.id}>
                  <Badge
                    tone={
                      claim.evidenceType === "unknown"
                        ? "unknown"
                        : claim.evidenceType === "conflicting"
                          ? "conflicting"
                          : claim.evidenceType === "historical-event"
                            ? "historical"
                            : "supported"
                    }
                  >
                    {claim.evidenceType.replaceAll("-", " ")}
                  </Badge>
                  <h4>{claim.claim}</h4>
                  <p>{claim.value}</p>
                  {claim.qualification && (
                    <p className="qualification-note">{claim.qualification}</p>
                  )}
                  {claim.historicalDate && (
                    <p>Historical event date: {claim.historicalDate}</p>
                  )}
                  <small>
                    Source checked {claim.checkedAt || "date not recorded"}
                  </small>
                  {claim.sourceReferences.map((source) => (
                    <SourceLink key={source.id} url={source.url}>
                      {source.title}
                    </SourceLink>
                  ))}
                </li>
              ))}
            </ul>
            {selected.spaces.length > 0 && (
              <section>
                <h3>Documented spaces</h3>
                {selected.spaces.map((space) => (
                  <div className="evidence-item" key={space.id}>
                    <h4>{space.name}</h4>
                    <p>{space.summary}</p>
                    <p>
                      {space.capacity
                        ? `${space.capacity.guestCount} guests · ${space.capacity.layout}`
                        : "Room/layout capacity: unknown"}
                    </p>
                    {space.sourceReferences.map((source) => (
                      <SourceLink key={source.id} url={source.url}>
                        {source.title}
                      </SourceLink>
                    ))}
                  </div>
                ))}
              </section>
            )}
            {selected.resources.length > 0 && (
              <section>
                <h3>Facilities mentioned</h3>
                {selected.resources.map((resource) => (
                  <div className="evidence-item" key={resource.id}>
                    <h4>{resource.name}</h4>
                    <p>{resource.summary}</p>
                    <p>
                      Operational availability:{" "}
                      {resource.availability || "unknown"}
                    </p>
                    {resource.sourceReferences.map((source) => (
                      <SourceLink key={source.id} url={source.url}>
                        {source.title}
                      </SourceLink>
                    ))}
                  </div>
                ))}
              </section>
            )}
            {selected.policies.length > 0 && (
              <section>
                <h3>Hosting conditions</h3>
                {selected.policies.map((policy) => (
                  <div className="evidence-item" key={policy.id}>
                    <h4>{policy.title}</h4>
                    <p>{policy.statement}</p>
                    <small>
                      {policy.evidenceType} · source checked{" "}
                      {policy.checkedAt || "date not recorded"}
                    </small>
                    {policy.sourceReferences.map((source) => (
                      <SourceLink key={source.id} url={source.url}>
                        {source.title}
                      </SourceLink>
                    ))}
                  </div>
                ))}
              </section>
            )}
            <Link className="button button-dark" href="/organizer">
              Create an event brief
            </Link>
          </>
        )}
      </DetailDialog>
    </main>
  );
}
