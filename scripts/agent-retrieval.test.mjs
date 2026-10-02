import assert from "node:assert/strict";
import test from "node:test";
import {assertContextTools, assertContextOutline, assertKnowledgeReads} from "./agent-retrieval.mjs";

test("requires the live Knowledge Base outline and read tools", () => {
  assert.throws(() => assertContextTools(["groq_query"]), /initial_context/);
  assert.throws(() => assertContextTools(["initial_context"]), /knowledge_base_read/);
  assert.doesNotThrow(() => assertContextTools(["initial_context", "knowledge_base_read"]));
});

test("rejects empty, invalid, or unbounded outlines", () => {
  assert.throws(() => assertContextOutline([]), /no Knowledge Base entry paths/);
  assert.throws(() => assertContextOutline([{knowledgeBase: "", path: "venues/a"}]), /invalid/);
  assert.throws(() => assertContextOutline(Array.from({length: 81}, (_, index) => ({knowledgeBase: "kb1", path: `venues/${index}`}))), /bounded/);
});

test("refuses recommendations after a failed or empty entry read", () => {
  assert.throws(() => assertKnowledgeReads([], 1), /did not read/);
  assert.throws(() => assertKnowledgeReads([{knowledgeBase: "kb1", path: "venues/a", text: "  "}], 1), /empty or incomplete/);
  assert.throws(() => assertKnowledgeReads([{knowledgeBase: "kb1", path: "venues/a", text: "venue source material"}], 0), /did not read/);
  assert.doesNotThrow(() => assertKnowledgeReads([{knowledgeBase: "kb1", path: "venues/a", text: "venue source material"}], 1));
});
