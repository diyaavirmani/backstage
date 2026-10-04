import test from "node:test";
import assert from "node:assert/strict";
import {
  parseAudience,
  serializeAudience,
  deduplicateRequirements,
  suggestEventSetup,
} from "./brief-controls.mjs";
test("audience roundtrips legacy detail and community without inventing eligibility", () => {
  for (const value of [
    "Students",
    "Student developers from a local club",
    "Founders; community: Example community",
  ])
    assert.equal(serializeAudience(parseAudience(value)), value);
  assert.equal(parseAudience("General student gathering").choice, "Other");
});
test("requirements deduplicate spelling but retain quantities and qualifications", () =>
  assert.deepEqual(
    deduplicateRequirements([
      "Projector",
      " projector ",
      "2 projectors",
      "Projector with HDMI",
      "wireless microphone",
    ]),
    ["Projector", "2 projectors", "Projector with HDMI", "wireless microphone"],
  ));
test("setup is a proposal, preserves brief, and does not infer breakouts from headcount", () => {
  const brief = {
    eventType: "Community meetup",
    title: "Developer gathering",
    headcount: 100,
    equipmentRequirements: ["2 projectors"],
    essentialRequirements: [],
  };
  const before = JSON.stringify(brief);
  const setup = suggestEventSetup(brief);
  assert.equal(setup.rooms.length, 1);
  assert.match(setup.assumptions.join(" "), /not documented venue inventory/);
  assert.equal(JSON.stringify(brief), before);
  assert.equal(
    suggestEventSetup({
      ...brief,
      essentialRequirements: ["Parallel coding sessions"],
    }).rooms.length,
    2,
  );
});
