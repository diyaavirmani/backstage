import assert from "node:assert/strict";
import test from "node:test";
import {validateAgentRecommendations} from "./agent-validation.mjs";

const source = {_id: "masters-public-source", title: "Masters Union Companies", url: "https://mastersunion.org/for-companies"};
const venue = {
  _id: "venue-masters-union-gurugram", name: "Masters’ Union Campus", city: "Delhi NCR", locality: "DLF Cyber Park, Udyog Vihar Phase III, Gurugram", relationshipStatus: "research-lead",
  sources: [source],
  claims: [
    {_key: "claim-capacity-unknown", subject: "capacity", claim: "Room and layout capacity", value: "Unknown", evidenceType: "unknown", sources: [source]},
    {_key: "claim-hosting", subject: "hosting-conditions", claim: "Public hosting invitation", value: "Publicly described hosting invitation; food permissions are not specified", evidenceType: "public-documentation", sources: [source]},
  ],
  spaces: [],
};
const brief = {
  city: "Delhi NCR", headcount: 80, date: "2026-11-10", startTime: "10:00", endTime: "17:00", budgetAmount: 10000, currency: "INR",
  essentialRequirements: ["capacity for 80"], flexibleRequirements: [], roomRequirements: [], equipmentRequirements: [],
};
const entry = {knowledgeBase: "kbExample", path: "venues/masters_union", tag: "core", text: "reviewed venue source evidence"};
const validCheck = {venue, path: entry.path, valid: true, citationLabels: [{sourceIds: [source._id]}]};
const outputFor = (overrides = {}) => ({recommendations: [{
  venueId: venue._id, locality: venue.locality, entryPaths: [entry.path],
  ...overrides,
}]});

test("keeps room capacity unknown without a documented room, layout, and sufficient count", () => {
  const result = validateAgentRecommendations({output: outputFor(), venues: [venue], brief, readEntries: [entry], evidence: {checks: [validCheck]}});
  const capacity = result.recommendations[0].requirementCoverage.find((item) => item.requirement === "capacity for 80");
  assert.equal(capacity.status, "unknown");
  assert.equal(capacity.evidence[0].evidenceType, "unknown");
});

test("rejects a recommendation attached to another venue's Knowledge Base path", () => {
  assert.throws(() => validateAgentRecommendations({output: outputFor({entryPaths: ["venues/ofis_noida"]}), venues: [venue], brief, readEntries: [entry], evidence: {checks: [validCheck]}}), /do not provide validated evidence/);
});

test("rejects a locality-swapped venue identity", () => {
  assert.throws(() => validateAgentRecommendations({
    output: outputFor({locality: "Sector 62, Noida"}), venues: [venue], brief, readEntries: [entry], evidence: {checks: [validCheck]},
  }), /locality that does not match/);
});

test("rejects a venue from a different city instead of silently mixing localities", () => {
  const bengaluru = {...venue, _id: "venue-shifu-den-bengaluru", name: "Shifu Den Bengaluru", city: "Bengaluru", locality: "Bengaluru"};
  assert.throws(() => validateAgentRecommendations({
    output: {recommendations: [{venueId: bengaluru._id, locality: bengaluru.locality, entryPaths: [entry.path], requirementCoverage: []}]},
    venues: [bengaluru], brief, readEntries: [entry], evidence: {checks: [{...validCheck, venue: bengaluru}]},
  }), /from Bengaluru for a Delhi NCR brief/);
});

test("an invalid/swapped citation check cannot authorize a venue card", () => {
  const invalidCheck = {...validCheck, valid: false};
  assert.throws(() => validateAgentRecommendations({output: outputFor(), venues: [venue], brief, readEntries: [entry], evidence: {checks: [invalidCheck]}}), /do not provide validated evidence/);
});

test("builds citations from published records rather than model-supplied URLs", () => {
  const result = validateAgentRecommendations({
    output: outputFor({sourceReferences: [{id: "fake", title: "Fake source", url: "https://attacker.example/"}]}),
    venues: [venue], brief, readEntries: [entry], evidence: {checks: [validCheck]},
  });
  assert.deepEqual(result.recommendations[0].sourceReferences, [{id: source._id, title: source.title, url: source.url}]);
});

test("does not convert a published statement of an unknown food policy into permission", () => {
  const foodBrief = {...brief, essentialRequirements: ["food allowed"]};
  const output = {recommendations: [{
    venueId: venue._id, locality: venue.locality, entryPaths: [entry.path],
  }]};
  const result = validateAgentRecommendations({output, venues: [venue], brief: foodBrief, evidence: {checks: [validCheck]}});
  const food = result.recommendations[0].requirementCoverage.find((item) => item.requirement === "food allowed");
  assert.equal(food.status, "unknown");
  assert.match(food.evidence[0].value, /not specified/);
});

test("marks an event condition supported only from a source-linked published claim", () => {
  const documentedVenue = {...venue, claims: [...venue.claims, {
    _key: "claim-workshops", subject: "hosting-conditions", claim: "Workshop events", value: "Workshops are described as permitted", evidenceType: "public-documentation", sources: [source],
  }]};
  const result = validateAgentRecommendations({
    output: outputFor(), venues: [documentedVenue], brief: {...brief, essentialRequirements: ["workshops permitted"]}, evidence: {checks: [validCheck]},
  });
  const coverage = result.recommendations[0].requirementCoverage.find((item) => item.requirement === "workshops permitted");
  assert.equal(coverage.status, "supported");
  assert.equal(coverage.evidence[0].claim, "Workshop events");
});

test("keeps Backstage booking permission unknown when a public page says it does not authorize it", () => {
  const bookingVenue = {...venue, claims: [...venue.claims, {
    _key: "claim-booking-unknown", subject: "booking-authority", claim: "Backstage booking authority", value: "Direct enquiries do not authorize reservations through Backstage", evidenceType: "public-documentation", sources: [source],
  }]};
  const result = validateAgentRecommendations({
    output: outputFor(), venues: [bookingVenue], brief: {...brief, essentialRequirements: ["Backstage booking authorized"]}, evidence: {checks: [validCheck]},
  });
  const coverage = result.recommendations[0].requirementCoverage.find((item) => item.requirement === "Backstage booking authorized");
  assert.equal(coverage.status, "unknown");
  assert.match(coverage.evidence[0].value, /do not authorize/);
});

test("marks a requirement contradicted only when a source-linked claim is explicitly conflicting", () => {
  const conflictedVenue = {...venue, claims: [...venue.claims, {
    _key: "claim-food-conflict", subject: "hosting-conditions", claim: "Outside food permission", value: "Sources conflict on outside food permission", evidenceType: "conflicting", sources: [source],
  }]};
  const result = validateAgentRecommendations({
    output: outputFor(), venues: [conflictedVenue], brief: {...brief, essentialRequirements: ["food allowed"]}, evidence: {checks: [validCheck]},
  });
  const coverage = result.recommendations[0].requirementCoverage.find((item) => item.requirement === "food allowed");
  assert.equal(coverage.status, "contradicted");
  assert.equal(coverage.evidence[0].evidenceType, "conflicting");
});
