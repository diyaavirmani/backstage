import {validateAgentRecommendations} from "./agent-validation.mjs";

/**
 * Compares the production structured verifier with a transparent keyword matcher over the same published text.
 * Cases are hand-written from real records to probe known failure modes (negation, unstated layouts, audience
 * conditions, past events); they are a demonstration, not a general accuracy benchmark.
 */

const stopWords = new Set(["for", "the", "and", "with", "from", "that", "this", "our", "your", "guests", "people", "attendees", "able", "allowed", "venue", "event", "events"]);
const words = (value) => String(value ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
const stem = (word) => word.replace(/(?:ing|es|s)$/, "");

/** Published records in the shape the discovery handler reads from Sanity. */
export function venuesFromCatalog(catalog) {
  const sources = new Map(catalog.sources.map((source) => [source.id, {_id: source.id, title: source.title, url: source.url, sourceType: source.sourceType}]));
  return catalog.venues.map((venue) => ({
    _id: venue.id, name: venue.name, city: venue.city, locality: venue.locality, relationshipStatus: venue.relationshipStatus, summary: venue.summary,
    sources: venue.sourceIds.map((id) => sources.get(id)),
    claims: venue.claims.map((claim) => ({_key: claim.id, subject: claim.claimType, claim: claim.claim, value: claim.value, evidenceType: claim.evidenceType, checkedAt: claim.checkedAt, historicalDate: claim.historicalDate, layout: claim.layout, qualification: claim.qualification, appliesToSpaceId: claim.appliesToSpaceId, sources: claim.sourceIds.map((id) => sources.get(id))})),
    spaces: (venue.spaces || []).map((space) => ({_id: space.id, name: space.name, layout: space.layout, capacity: space.capacity})),
  }));
}

/** Everything a keyword index would see for one venue: summary, every claim, qualification and source title. */
export function venueText(venue) {
  return [venue.name, venue.summary, ...venue.claims.flatMap((claim) => [claim.claim, claim.value, claim.qualification]), ...venue.sources.map((source) => source.title)].filter(Boolean).join(" ");
}

/** Keyword rule: every key term appears, and any requested count is met by some number in the text. */
export function keywordVerdict(text, requirement) {
  const textWords = new Set(words(text).map(stem));
  const terms = words(requirement).filter((word) => !/^\d+$/.test(word) && word.length > 2 && !stopWords.has(word)).map(stem);
  const counts = words(requirement).filter((word) => /^\d+$/.test(word)).map(Number);
  const numbers = words(text).filter((word) => /^\d+$/.test(word)).map(Number);
  const termsFound = terms.every((term) => textWords.has(term));
  const countMet = !counts.length || numbers.some((number) => number >= Math.max(...counts));
  return termsFound && countMet;
}

/** Runs the real verifier for one venue and brief, treating the venue's Knowledge Base entry as already verified. */
export function structuredStatus(venue, brief, requirement) {
  const path = `eval/${venue._id}`;
  const evidence = {checks: [{venue, path, valid: true, citationLabels: [{sourceIds: venue.sources.map((source) => source._id)}]}]};
  const result = validateAgentRecommendations({output: {recommendations: [{venueId: venue._id, locality: venue.locality, entryPaths: [path]}]}, venues: [venue], brief: {...brief, city: venue.city}, evidence});
  return result.recommendations[0].requirementCoverage.find((item) => item.requirement === requirement)?.status ?? "missing";
}

export function runStructureEval(venues, cases) {
  return cases.map((item) => {
    const venue = venues.find((candidate) => candidate._id === item.venueId);
    if (!venue) throw new Error(`Evaluation case ${item.id} names an unknown venue ${item.venueId}`);
    const keyword = keywordVerdict(venueText(venue), item.requirement) ? "established" : "not established";
    const status = structuredStatus(venue, item.brief, item.requirement);
    if (status === "missing") throw new Error(`Evaluation case ${item.id} does not request "${item.requirement}"`);
    const structured = status === "supported" ? "established" : status === "contradicted" ? "contradicted" : "not established";
    const correct = (verdict) => verdict === item.expected || (item.expected === "not established" && verdict === "contradicted");
    return {...item, venueName: venue.name, keyword, structured, status, keywordCorrect: correct(keyword), structuredCorrect: correct(structured)};
  });
}

export function evalMarkdown(rows) {
  const score = (key, subset = rows) => `${subset.filter((row) => row[key]).length}/${subset.length}`;
  const heldOut = rows.filter((row) => row.heldOut);
  return [
    `| Organizer question | Venue | What the sources establish | Keyword match | Backstage (structured) |`,
    `|---|---|---|---|---|`,
    ...rows.map((row) => `| ${row.question}${row.heldOut ? " †" : ""} | ${row.venueName} | ${row.expected}: ${row.why} | ${row.keywordCorrect ? "✓" : "✗"} ${row.keyword} | ${row.structuredCorrect ? "✓" : "✗"} ${row.structured} |`),
    ``,
    `Keyword match correct: **${score("keywordCorrect")}**. Backstage structured verifier correct: **${score("structuredCorrect")}**.`,
    ...(heldOut.length ? [``, `Final round († — ${heldOut.length} cases written after the last tuning fix and never tuned on): keyword ${score("keywordCorrect", heldOut)}, structured ${score("structuredCorrect", heldOut)}.`] : []),
  ].join("\n");
}
