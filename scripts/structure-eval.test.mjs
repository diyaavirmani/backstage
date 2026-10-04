import assert from "node:assert/strict";
import test from "node:test";
import {catalog} from "./catalog-lib.mjs";
import {keywordVerdict, runStructureEval, venuesFromCatalog} from "./structure-eval.mjs";
import {structureEvalCases} from "./structure-eval-cases.mjs";

const rows = runStructureEval(venuesFromCatalog(catalog), structureEvalCases);

test("the structured verifier never claims what the sources do not establish", () => {
  const falsePositives = rows.filter((row) => row.expected === "not established" && row.structured === "established");
  assert.deepEqual(falsePositives.map((row) => row.id), []);
  assert.ok(rows.filter((row) => row.structuredCorrect).length > rows.filter((row) => row.keywordCorrect).length);
});

test("keyword matching is fooled by negation, unstated layouts, audience conditions and years", () => {
  for (const id of ["ofis-sohna-outside-food", "saiacs-300-seats", "shifu-free-students", "paytm-200"]) {
    const row = rows.find((item) => item.id === id);
    assert.equal(row.keyword, "established", id);
    assert.equal(row.structured, "not established", id);
  }
  assert.equal(keywordVerdict("approximately 350 seats", "Capacity for 300 guests"), false, "a count alone without the key term is not a match");
});

test("documented facts behind a caveat are still found, but high-stakes subjects stay strict", () => {
  for (const id of ["ofis-noida-screens", "ofis-noida-workshops", "ofis-sohna-catering", "saiacs-wifi", "saiacs-parking"]) assert.equal(rows.find((row) => row.id === id).structured, "established", id);
  assert.equal(rows.find((row) => row.id === "ofis-sohna-backstage-booking").structured, "not established");
});
