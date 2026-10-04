"use client";
import { useState } from "react";
import type { EventBrief, VenueRecommendation } from "@/types";
import {
  Badge,
  Button,
  DetailDialog,
  FactBadge,
  SourceLink,
  formatEvidenceDate,
} from "@/components/ui";
import { ContactRoutes, VenueEnquiry } from "@/components/venue-enquiry";
import {
  confirmationQuestions,
  labelledSources,
  orderVenueFacts,
} from "../../scripts/evidence-presentation.mjs";

export function ResearchLeadCard({
  venue,
  onPrepare,
  brief,
}: {
  venue: VenueRecommendation;
  /** The discovery snapshot that produced this lead; never the live, edited form. */
  brief?: EventBrief;
  onPrepare: () => void;
}) {
  const [open, setOpen] = useState(false);
  const facts = orderVenueFacts(venue.documentedFacts, brief);
  const sources = labelledSources(
    venue.documentedFacts,
    venue.sourceReferences,
    brief,
  );
  const questions = confirmationQuestions(venue);
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
      <section className="lead-summary">
        <h4>Why consider this venue</h4>
        {venue.historical && (
          <p className="historical-note">
            Historical event evidence. A past event does not establish current
            availability, booking permission, or a Backstage partnership.
          </p>
        )}
        <ul className="evidence-highlights">
          {facts.slice(0, 3).map((fact, index) => (
            <li key={index}>
              <FactBadge
                evidenceType={fact.evidenceType}
                historicalDate={fact.historicalDate}
              />
              <strong>{fact.claim}</strong>
              <span>
                {fact.value} {fact.qualification || ""}
              </span>
            </li>
          ))}
        </ul>
        {facts.length > 3 && (
          <p className="helper-text">
            {facts.length - 3} more documented fact
            {facts.length === 4 ? "" : "s"} in the evidence view.
          </p>
        )}
        {qualifications.map((qualification, index) => (
          <p className="qualification-note" key={index}>
            {qualification}
          </p>
        ))}
      </section>
      {venue.documentedConflicts.map((item, index) => (
        <p className="conflict-note" key={index}>
          <strong>Conflict: {item.claim}</strong> {item.value}
        </p>
      ))}
      <section className="recommendation-sources">
        <h4>Original sources</h4>
        {sources.map((source) => (
          <SourceLink key={source.id || source.url} url={source.url}>
            <span className="source-label">{source.label}</span>{" "}
            {source.title}
          </SourceLink>
        ))}
      </section>
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
      <section className="lead-unknowns">
        <h4>Needs confirmation</h4>
        <ul>
          {questions.slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
          {!questions.length && (
            <li>
              Current availability, prices, and Backstage booking authority
              remain unconfirmed.
            </li>
          )}
        </ul>
        {questions.length > 3 && (
          <p className="helper-text">
            {questions.length - 3} more in the evidence view and the enquiry.
          </p>
        )}
        <VenueEnquiry
          name={venue.name}
          contacts={venue.contacts}
          brief={brief}
          questions={questions}
        />
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
          {facts.map((fact, index) => (
            <div className="evidence-row" key={index}>
              <FactBadge
                evidenceType={fact.evidenceType}
                historicalDate={fact.historicalDate}
              />
              <h4>{fact.claim}</h4>
              <p>
                {fact.value} {fact.qualification || ""}
              </p>
              {fact.sourceReferences?.map((source) => (
                <SourceLink key={source.id || source.url} url={source.url}>
                  {source.title}
                  {fact.checkedAt
                    ? ` · checked ${formatEvidenceDate(fact.checkedAt)}`
                    : ""}
                </SourceLink>
              ))}
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
        <section className="coverage-section">
          <h3>Public enquiry routes</h3>
          {venue.contacts?.length ? (
            <ContactRoutes contacts={venue.contacts} />
          ) : (
            <p>No public event-enquiry route was found in the reviewed sources.</p>
          )}
          <p className="ops-muted">
            A published contact does not confirm capacity, eligibility,
            availability, or booking authority.
          </p>
        </section>
        <section className="recommendation-sources">
          <h3>Original sources verified for this lead</h3>
          {sources.map((source) => (
            <SourceLink key={source.id || source.url} url={source.url}>
              <span className="source-label">{source.label}</span>{" "}
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
