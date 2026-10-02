import assert from "node:assert/strict";
import test from "node:test";
import {parseContextOutline} from "./context-outline.mjs";

test("preserves extensionless paths, markdown paths, and core/peripheral tags", () => {
  const outline = `Knowledge base id: kbVenue123
## Backstage — venue knowledge
4 entries.
venues/delhi/masters-union [core]
  Publicly documented facilities and hosting terms
  topics: Facilities, Eligibility
venues/bengaluru/shifu-den.md [peripheral]
  Historical event evidence
sources/references.md
  Original source URLs and research dates`;

  assert.deepEqual(parseContextOutline(outline), [
    {knowledgeBase: "kbVenue123", path: "venues/delhi/masters-union", tag: "core"},
    {knowledgeBase: "kbVenue123", path: "venues/bengaluru/shifu-den.md", tag: "peripheral"},
    {knowledgeBase: "kbVenue123", path: "sources/references.md", tag: null},
  ]);
});

test("ignores summaries, related-path annotations, and source URLs", () => {
  const outline = `Knowledge base id: kbOne
## Knowledge
2 entries.
events/paytm-office
  Hosted an event at https://example.com/events/paytm
  related: venues/paytm-office
  source: https://example.com/source
venues/paytm-office`;

  assert.deepEqual(parseContextOutline(outline), [
    {knowledgeBase: "kbOne", path: "events/paytm-office", tag: null},
    {knowledgeBase: "kbOne", path: "venues/paytm-office", tag: null},
  ]);
});

test("associates each path with its own Knowledge Base across multiple outlines", () => {
  const outline = `Knowledge base id: \`kbDelhi\`
## Delhi — organizer venue information
1 entry.
venues/delhi/index [core]
  Venue summary
Knowledge base id: \`kbBengaluru\`
## Bengaluru — organizer venue information
1 entry.
venues/bengaluru/index [core]
  Venue summary`;

  assert.deepEqual(parseContextOutline(outline), [
    {knowledgeBase: "kbDelhi", path: "venues/delhi/index", tag: "core"},
    {knowledgeBase: "kbBengaluru", path: "venues/bengaluru/index", tag: "core"},
  ]);
});
