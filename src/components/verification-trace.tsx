"use client";
import type { DiscoveryVerification } from "@/types";

/** Shows what the agent actually read and what the server verified before any lead was published. */
export function VerificationTrace({
  verification,
  leadCount,
  city,
}: {
  verification: DiscoveryVerification;
  leadCount: number;
  city: string;
}) {
  const filter = [
    ...verification.localityFilter.included.map((place) => `only ${place}`),
    ...verification.localityFilter.excluded.map((place) => `excluding ${place}`),
  ].join(", ");
  const passed = verification.citationChecks.filter((check) => check.valid);
  const failed = verification.citationChecks.filter((check) => !check.valid);
  return (
    <details className="verification-trace">
      <summary>
        <strong>How these leads were verified</strong>
        <span>
          Read {verification.entriesRead.length} Knowledge Base entr
          {verification.entriesRead.length === 1 ? "y" : "ies"} ·{" "}
          {passed.length} citation check{passed.length === 1 ? "" : "s"} passed
          · {verification.rejectedCandidateCount} model suggestion
          {verification.rejectedCandidateCount === 1 ? "" : "s"} rejected
        </span>
      </summary>
      <ol>
        <li>
          <strong>Outline.</strong> Sanity Context listed{" "}
          {verification.outlineEntryCount} entries in Knowledge Base{" "}
          <code>{verification.knowledgeBaseIds.join(", ")}</code>;{" "}
          {verification.scopedEntryCount} matched {city}
          {filter ? ` (${filter})` : ""}. Only those could be read.
        </li>
        <li>
          <strong>Reads.</strong> The model made {verification.readToolCalls}{" "}
          read call{verification.readToolCalls === 1 ? "" : "s"} through MCP
          before answering:
          <ul>
            {verification.entriesRead.map((entry) => (
              <li key={entry.path}>
                <code>{entry.path}</code>
                {entry.tag ? ` · ${entry.tag}` : ""}
              </li>
            ))}
          </ul>
        </li>
        <li>
          <strong>Citations.</strong> Each venue section&apos;s footnotes were
          matched to that venue&apos;s published Sanity source records and
          original URLs.
          <ul>
            {verification.citationChecks.map((check) => (
              <li key={`${check.venueId}-${check.path}`}>
                {check.valid ? "✓" : "✗"} <code>{check.path}</code> →{" "}
                {check.sourceIds.join(", ") || "no matched source"}
                {check.valid ? "" : " (not used)"}
              </li>
            ))}
          </ul>
          {failed.length > 0 && (
            <p className="helper-text">
              Entries that failed this check cannot support a lead.
            </p>
          )}
        </li>
        <li>
          <strong>Selection.</strong> The model proposed{" "}
          {verification.modelCandidateCount} lead
          {verification.modelCandidateCount === 1 ? "" : "s"};{" "}
          {verification.rejectedCandidateCount} failed identity, locality or
          citation checks; {leadCount} {leadCount === 1 ? "is" : "are"} shown.
        </li>
        <li>
          <strong>Requirements.</strong> Statuses come from structured rules
          over published claims, not from the model. Capacity needs a named
          room and layout; eligibility must match your audience; a past event
          stays historical; anything unstated stays unknown.
        </li>
      </ol>
    </details>
  );
}
