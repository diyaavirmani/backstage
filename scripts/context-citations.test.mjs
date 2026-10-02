import assert from "node:assert/strict";
import test from "node:test";
import {inspectVenueCitations} from "./context-citations.mjs";

const venues = [
  {id: "shifu", name: "Shifu Den", city: "Bengaluru", sourceIds: ["shifu-source"]},
  {id: "saiacs", name: "SAIACS CEO Centre", city: "Bengaluru", sourceIds: ["saiacs-source"]},
];
const sources = [
  {id: "shifu-source", url: "https://den.shifuventures.com/"},
  {id: "saiacs-source", url: "https://saiacs-ceocenter.com/"},
];

test("associates footnotes with the source label in the same venue section", () => {
const entry = `## Shifu Den
The pro bono statement is documented [2] (https://den.shifuventures.com/).
## SAIACS CEO Centre
The campus facilities are documented [1] (https://saiacs-ceocenter.com/).
## Sources
1. SAIACS CEO Centre — Dataset
2. Shifu Den — Dataset`;
  const result = inspectVenueCitations(entry, venues, sources);
  assert.equal(result.length, 2);
  assert.equal(result[0].valid, true);
  assert.equal(result[1].valid, true);
  assert.equal(result[0].associations[0].label, "Shifu Den");
  assert.deepEqual(result[0].matchedSourceUrls, ["https://den.shifuventures.com/"]);
});

test("flags citation labels attached to the wrong venue", () => {
const entry = `## Shifu Den
The pro bono statement is documented [1] (https://den.shifuventures.com/).
## SAIACS CEO Centre
Facilities are documented [2] (https://saiacs-ceocenter.com/).
## Sources
1. SAIACS CEO Centre — Dataset
2. Shifu Den — Dataset`;
  const result = inspectVenueCitations(entry, venues, sources);
  assert.deepEqual(result.map(({valid}) => valid), [false, false]);
  assert.deepEqual(result.map(({associations}) => associations[0].label), ["SAIACS CEO Centre", "Shifu Den"]);
});

test("does not accept a venue section that omits its original source URL", () => {
  const entry = `## Shifu Den
The pro bono statement is documented [1].
## Sources
1. Shifu Den — Dataset`;
  const result = inspectVenueCitations(entry, venues, sources);
  assert.equal(result[0].associations[0].matchesVenue, true);
  assert.equal(result[0].valid, false);
  assert.deepEqual(result[0].matchedSourceUrls, []);
});
