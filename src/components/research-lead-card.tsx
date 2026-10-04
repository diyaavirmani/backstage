"use client";
import { useState } from "react";
import type { VenueRecommendation } from "@/types";
import { Badge, Button, DetailDialog, SourceLink } from "@/components/ui";

export function ResearchLeadCard({
  venue,
  onPrepare,
}: {
  venue: VenueRecommendation;
  onPrepare: () => void;
}) {
  const [open, setOpen] = useState(false);
  const qualifications = [
    ...new Set(
      venue.requirementCoverage
        .flatMap((item) =>
          item.evidence.map((claim) =>
            claim.qualification
              ? `${claim.value} ${claim.qualification}`
              : /eligib|access|audience|community|founder|pro.bono/i.test(
                    `${item.requirement} ${claim.claim}`,
                  )
                ? claim.value
                : "",
          ),
        )
        .filter(Boolean),
    ),
  ];
  return (
    <article className="recommendation-card" data-venue-id={venue.venueId}>
      <div className="venue-card-top">
        <Badge>Research lead · not onboarded</Badge>
        <span className="venue-city">{venue.city}</span>
      </div>
      <h3>{venue.name}</h3>
      <p className="venue-locality">{venue.locality}</p>
      {venue.historical && (
        <p className="historical-note">
          Historical event evidence. Current access and booking permission are
          unknown.
        </p>
      )}
      <section className="lead-summary">
        <h4 className="sr-only">Documented evidence and qualifications</h4>
        {venue.documentedFacts.map((fact, index) => (
          <p key={index}>
            <strong>{fact.claim}</strong>
            <span>
              {fact.value} {fact.qualification || ""}
            </span>
          </p>
        ))}
        {qualifications.map((qualification, index) => (
          <p className="qualification-note" key={index}>
            {qualification}
          </p>
        ))}
      </section>
      <div className="lead-unknowns">
        <h4>Needs confirmation</h4>
        <ul>
          {venue.importantUnknowns.slice(0, 2).map((item, index) => (
            <li key={index}>
              {item.claim}: {item.value}
            </li>
          ))}
          {!venue.importantUnknowns.length && (
            <li>
              Current availability, prices, and Backstage booking authority
              remain unconfirmed.
            </li>
          )}
        </ul>
      </div>
      {venue.documentedConflicts.map((item, index) => (
        <p className="conflict-note" key={index}>
          <strong>Conflict: {item.claim}</strong> {item.value}
        </p>
      ))}
      <section
        className="requirement-summary"
        aria-label="Event requirement coverage"
      >
        {venue.requirementCoverage.slice(0, 3).map((item) => (
          <div key={item.requirement}>
            <Badge
              tone={
                item.status === "contradicted" ? "conflicting" : item.status
              }
            >
              {item.status === "supported"
                ? "Supported"
                : item.status === "contradicted"
                  ? "Conflicting evidence"
                  : "Unknown"}
            </Badge>
            <span>{item.requirement}</span>
          </div>
        ))}
      </section>
      <section className="recommendation-sources">
        <h4>Original sources</h4>
        {venue.sourceReferences.map((source) => (
          <SourceLink key={source.id || source.url} url={source.url}>
            {source.title}
          </SourceLink>
        ))}
      </section>
      <div className="card-actions">
        <Button variant="secondary" type="button" onClick={() => setOpen(true)}>
          View evidence
        </Button>
        <Button type="button" onClick={onPrepare}>
          Create private draft
        </Button>
      </div>
      <DetailDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`${venue.name} — evidence for your brief`}
      >
        <p className="venue-locality">
          {venue.city} · {venue.locality}
        </p>
        <Badge>Research lead · draft only</Badge>
        {venue.historical && (
          <p className="historical-note">
            Past hosting does not establish current availability or Backstage
            booking authority.
          </p>
        )}
        <section className="coverage-section">
          <h3>Documented facts</h3>
          {venue.documentedFacts.map((fact, index) => (
            <div className="evidence-row" key={index}>
              <Badge
                tone={
                  fact.evidenceType === "historical-event"
                    ? "historical"
                    : "supported"
                }
              >
                {fact.evidenceType === "historical-event"
                  ? `Historical${fact.historicalDate ? ` · ${fact.historicalDate}` : ""}`
                  : "Documented"}
              </Badge>
              <h4>{fact.claim}</h4>
              <p>
                {fact.value} {fact.qualification || ""}
              </p>
            </div>
          ))}
        </section>
        <section className="coverage-section">
          <h3>Every event requirement</h3>
          <ul>
            {venue.requirementCoverage.map((item) => (
              <li key={item.requirement}>
                <Badge
                  tone={
                    item.status === "contradicted" ? "conflicting" : item.status
                  }
                >
                  {item.status === "contradicted"
                    ? "Conflicting evidence"
                    : item.status === "supported"
                      ? "Supported"
                      : "Unknown"}
                </Badge>
                <strong>{item.requirement}</strong>
                {item.evidence.map((claim, index) => (
                  <p key={index}>
                    {claim.claim}: {claim.value} {claim.qualification || ""}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </section>
        <section className="coverage-section">
          <h3>Unknowns and conflicts</h3>
          <ul>
            {[...venue.importantUnknowns, ...venue.documentedConflicts].map(
              (item, index) => (
                <li key={index}>
                  <strong>{item.claim}</strong>
                  <p>{item.value}</p>
                </li>
              ),
            )}
          </ul>
        </section>
        <p className="recommendation-next">
          <strong>Suggested next step</strong>
          {venue.nextStep}
        </p>
        <section className="recommendation-sources">
          <h3>Original sources verified for this lead</h3>
          {venue.sourceReferences.map((source) => (
            <SourceLink key={source.id || source.url} url={source.url}>
              {source.title}
            </SourceLink>
          ))}
        </section>
        <p className="ops-muted">
          These citations come from verified venue evidence. A source URL does
          not establish live availability, price terms, or permission to book.
        </p>
        <Button
          type="button"
          onClick={() => {
            setOpen(false);
            onPrepare();
          }}
        >
          Create private draft
        </Button>
      </DetailDialog>
    </article>
  );
}
