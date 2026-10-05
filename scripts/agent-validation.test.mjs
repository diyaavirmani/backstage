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

test("keeps a requirement unknown when its source claims conflict", () => {
  const conflictedVenue = {...venue, claims: [...venue.claims, {
    _key: "claim-food-conflict", subject: "hosting-conditions", claim: "Outside food permission", value: "Sources conflict on outside food permission", evidenceType: "conflicting", sources: [source],
  }]};
  const result = validateAgentRecommendations({
    output: outputFor(), venues: [conflictedVenue], brief: {...brief, essentialRequirements: ["food allowed"]}, evidence: {checks: [validCheck]},
  });
  const coverage = result.recommendations[0].requirementCoverage.find((item) => item.requirement === "food allowed");
  assert.equal(coverage.status, "unknown");
  assert.equal(coverage.evidence.some((item) => item.evidenceType === "conflicting"), true);
});

test("does not infer founder-community eligibility for a general student gathering", () => {
  const shifu = {...venue, _id: "venue-shifu-den-bengaluru", name: "Shifu Den", city: "Bengaluru", locality: "Bengaluru", claims: [
    {_key: "shifu-audience", subject: "eligibility", claim: "The public description addresses founders, operators, and builders; the space is open to founders.", value: "Detailed eligibility criteria are unknown.", evidenceType: "public-documentation", sources: [source]},
    {_key: "shifu-access", subject: "access-model", claim: "The Den is pro bono for founders and events are free for the founder community.", value: "This does not confirm eligibility for other organizers.", evidenceType: "public-documentation", sources: [source]},
  ]};
  const result = validateAgentRecommendations({
    output: {recommendations: [{venueId: shifu._id, locality: shifu.locality, entryPaths: [entry.path]}]},
    venues: [shifu], brief: {...brief, city: "Bengaluru", audience: "general university students", essentialRequirements: ["pro bono access"]}, evidence: {checks: [{...validCheck, venue: shifu}]},
  });
  const audience = result.recommendations[0].requirementCoverage.find((item) => item.requirement === "Audience: general university students");
  const access = result.recommendations[0].requirementCoverage.find((item) => item.requirement === "pro bono access");
  assert.equal(audience.status, "unknown");
  assert.equal(access.status, "unknown");
  assert.match(access.evidence[0].claim, /pro bono for founders/);
});

test("does not treat one described room as proof of two requested breakout rooms", () => {
  const venueWithRooms = {...venue, claims: [...venue.claims, {
    _key: "room-evidence", subject: "hosting-conditions", claim: "The source describes two microphones and one breakout room.", value: "Room count and allocation are not specified.", evidenceType: "public-documentation", sources: [source],
  }]};
  const result = validateAgentRecommendations({
    output: outputFor(), venues: [venueWithRooms], brief: {...brief, roomRequirements: ["two breakout rooms"]}, evidence: {checks: [validCheck]},
  });
  const coverage = result.recommendations[0].requirementCoverage.find((item) => item.requirement === "two breakout rooms");
  assert.equal(coverage.status, "unknown");
  assert.match(coverage.evidence[0].value, /not specified/);
});

test("supports a room quantity only when the count is attached to the requested room type", () => {
  const venueWithRooms = {...venue, claims: [...venue.claims, {
    _key: "room-evidence", subject: "hosting-conditions", claim: "Two breakout rooms are described for workshops.", value: "Two breakout rooms are publicly documented.", evidenceType: "public-documentation", sources: [source],
  }]};
  const result = validateAgentRecommendations({
    output: outputFor(), venues: [venueWithRooms], brief: {...brief, roomRequirements: ["two breakout rooms"]}, evidence: {checks: [validCheck]},
  });
  const coverage = result.recommendations[0].requirementCoverage.find((item) => item.requirement === "two breakout rooms");
  assert.equal(coverage.status, "supported");
});

test("does not support an activity from an explicit negative permission statement", () => {
  const restrictedVenue = {...venue, claims: [...venue.claims, {
    _key: "food-prohibited", subject: "hosting-conditions", claim: "Outside food permission", value: "Outside food is not permitted.", evidenceType: "public-documentation", sources: [source],
  }]};
  const result = validateAgentRecommendations({
    output: outputFor(), venues: [restrictedVenue], brief: {...brief, essentialRequirements: ["outside food allowed"]}, evidence: {checks: [validCheck]},
  });
  const coverage = result.recommendations[0].requirementCoverage.find((item) => item.requirement === "outside food allowed");
  assert.equal(coverage.status, "contradicted");
  assert.match(coverage.evidence[0].value, /not permitted/);
});

test("supports pro-bono eligibility only when the organizer audience matches the documented condition", () => {
  const shifu = {...venue, _id: "venue-shifu-den-bengaluru", name: "Shifu Den", city: "Bengaluru", locality: "Bengaluru", claims: [
    {_key: "shifu-access", subject: "access-model", claim: "The Den is pro bono for founders and events are free for the founder community.", value: "Pro bono access for founders.", evidenceType: "public-documentation", sources: [source]},
  ]};
  const result = validateAgentRecommendations({
    output: {recommendations: [{venueId: shifu._id, locality: shifu.locality, entryPaths: [entry.path]}]},
    venues: [shifu], brief: {...brief, city: "Bengaluru", audience: "startup founders", essentialRequirements: ["pro bono access"]}, evidence: {checks: [{...validCheck, venue: shifu}]},
  });
  const access = result.recommendations[0].requirementCoverage.find((item) => item.requirement === "pro bono access");
  assert.equal(access.status, "supported");
  assert.match(access.evidence[0].qualification || access.evidence[0].claim, /founder/i);
});

test("documented facts link only verified claim sources and keep their subject for labelling", () => {
  const unverified = {_id: "unverified-source", title: "Unverified", url: "https://example.test/"};
  const mixed = {...venue, claims: venue.claims.map((claim) => claim._key === "claim-hosting" ? {...claim, checkedAt: "2026-10-02", sources: [source, unverified]} : claim)};
  const result = validateAgentRecommendations({output: outputFor(), venues: [mixed], brief, evidence: {checks: [validCheck]}});
  const fact = result.recommendations[0].documentedFacts.find((item) => item.claim === "Public hosting invitation");
  assert.equal(fact.subject, "hosting-conditions");
  assert.equal(fact.checkedAt, "2026-10-02");
  assert.deepEqual(fact.sourceReferences.map((item) => item.id), [source._id]);
  assert.equal(result.recommendations[0].contacts, undefined, "contacts are attached by the server handler from Sanity, not by model validation");
});

test("caveats are scoped to their clause and terms match whole words only", () => {
  const facilities = {...venue, claims: [...venue.claims, {_key: "claim-av", subject: "equipment", claim: "The page describes AV systems and display screens", value: "Exact inventory and room assignment remain unknown", evidenceType: "public-documentation", sources: [source]}]};
  const run = (requirement) => validateAgentRecommendations({output: outputFor(), venues: [facilities], brief: {...brief, essentialRequirements: [requirement]}, evidence: {checks: [validCheck]}}).recommendations[0].requirementCoverage.find((item) => item.requirement === requirement).status;
  assert.equal(run("Display screens"), "supported", "a caveat on inventory does not hide documented screens");
  assert.equal(run("Projector"), "unknown", "an unnamed item stays unknown");
  assert.equal(run("Main room"), "unknown", "\"main\" does not match \"remain\"");
});

test("capacity needs a named room in a layout that suits the activity, and names relevant conflicts", () => {
  const halls = {...venue, spaces: [{_id: "space-hall-a", name: "Hall A"}, {_id: "space-hall-b", name: "Hall B"}], claims: [...venue.claims,
    {_key: "a-cluster", subject: "capacity", claim: "Hall A cluster-style capacity.", value: "60 guests in cluster style.", evidenceType: "public-documentation", appliesToSpaceId: "space-hall-a", layout: "cluster", sources: [source]},
    {_key: "a-theatre", subject: "capacity", claim: "Hall A theatre-style capacity.", value: "100 guests in theatre style.", evidenceType: "public-documentation", appliesToSpaceId: "space-hall-a", layout: "theatre", sources: [source]},
    {_key: "b-theatre", subject: "capacity", claim: "Hall B theatre-style capacity.", value: "70 guests in theatre style.", evidenceType: "public-documentation", appliesToSpaceId: "space-hall-b", layout: "theatre", sources: [source]},
    {_key: "conflict", subject: "capacity", claim: "Largest cluster-style hall capacity.", value: "Sources conflict: 60 versus 80.", evidenceType: "conflicting", sources: [source]},
  ]};
  const capacity = (headcount, eventType) => validateAgentRecommendations({output: outputFor(), venues: [halls], brief: {...brief, headcount, eventType, title: "Test", essentialRequirements: []}, evidence: {checks: [validCheck]}}).recommendations[0].requirementCoverage.find((item) => item.requirement === `Capacity for ${headcount} guests`);
  const workshop80 = capacity(80, "Workshop");
  assert.equal(workshop80.status, "unknown", "100 theatre seats do not seat 80 at workshop tables");
  assert.match(workshop80.basis, /Largest documented room for cluster or classroom seating: Hall A, 60; 80 needed\. Sources conflict on: largest cluster-style hall capacity/);
  const talk80 = capacity(80, "Talk or panel");
  assert.equal(talk80.status, "supported");
  assert.equal(talk80.basis, "Hall A: 100 in theatre style — enough for 80 in theatre-style seating.", "the cluster conflict is irrelevant to a talk");
  assert.equal(capacity(50, "Workshop").status, "supported");
  assert.equal(capacity(120, "Community meetup").status, "unknown");
});
