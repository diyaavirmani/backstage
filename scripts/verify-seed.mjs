import "./load-env.mjs";
import {createClient} from "@sanity/client";
import {buildDocuments, catalog} from "./catalog-lib.mjs";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_PROJECT_READ_TOKEN;
if (!projectId || !dataset || !token || projectId.startsWith("replace-") || dataset.startsWith("replace-") || token.startsWith("replace-")) {
  throw new Error("Set NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, and SANITY_PROJECT_READ_TOKEN in .env.local to verify the published seed.");
}

const expected = buildDocuments();
const expectedById = new Map(expected.map((doc) => [doc._id, doc]));
const client = createClient({projectId, dataset, token, apiVersion: "2025-02-19", useCdn: false});
const documents = await client.getDocuments([
  ...expected.map(({_id}) => _id),
  ...expected.map(({_id}) => `drafts.${_id}`),
]);
const byId = new Map(documents.filter(Boolean).map((doc) => [doc._id, doc]));
const missing = expected.filter(({_id}) => !byId.has(_id)).map(({_id}) => _id);
const drafts = expected.filter(({_id}) => byId.has(`drafts.${_id}`)).map(({_id}) => _id);
if (missing.length) throw new Error(`Published seed is missing ${missing.length}/${expected.length} expected documents: ${missing.join(", ")}`);
if (drafts.length) throw new Error(`Unexpected seed drafts found: ${drafts.join(", ")}`);

let referenceCount = 0;
const unresolvedReferences = [];
function inspectReferences(value, fromId) {
  if (Array.isArray(value)) {
    for (const item of value) inspectReferences(item, fromId);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (value._type === "reference") {
    referenceCount += 1;
    if (!expectedById.has(value._ref) || !byId.has(value._ref)) unresolvedReferences.push(`${fromId} → ${value._ref}`);
    return;
  }
  for (const nested of Object.values(value)) inspectReferences(nested, fromId);
}
for (const { _id } of expected) inspectReferences(byId.get(_id), _id);
if (unresolvedReferences.length) throw new Error(`Seed has ${unresolvedReferences.length} unresolved or out-of-catalog references: ${unresolvedReferences.join(", ")}`);

const typeCounts = new Map();
for (const {_id} of expected) {
  const doc = byId.get(_id);
  const expectedDoc = expectedById.get(_id);
  if (doc._type !== expectedDoc._type) throw new Error(`Document ${_id} has type ${doc._type}; expected ${expectedDoc._type}`);
  typeCounts.set(doc._type, (typeCounts.get(doc._type) || 0) + 1);
}
const venues = catalog.venues.map((venue) => byId.get(venue.id));
for (const venue of venues) {
  if (!venue || venue.isDemonstration !== false || venue.knowledgeBaseEligible !== true || venue.relationshipStatus !== "research-lead") {
    throw new Error(`Venue ${venue?._id || "unknown"} has an unexpected publication or Knowledge Base eligibility state`);
  }
  const unknownSubjects = new Set((venue.claims || []).filter((claim) => claim.evidenceType === "unknown" && /unknown/i.test(claim.value || "")).map((claim) => claim.subject));
  for (const required of ["price", "capacity", "availability", "booking-authority"]) {
    if (!unknownSubjects.has(required)) throw new Error(`Venue ${venue._id} does not retain unknown ${required} evidence`);
  }
}
const demos = await client.fetch('*[_type == "venue" && isDemonstration == true]._id');
if (demos.length) throw new Error(`Unexpected demonstration venue documents are published: ${demos.join(", ")}`);

console.log(`Published seed verified: ${expected.length}/${expected.length} expected documents; ${venues.length} research venues; ${typeCounts.get("sourceReference") || 0} source references; ${referenceCount} document references resolve; ${drafts.length} drafts; ${demos.length} demonstration venues.`);
console.log(`Document types: ${[...typeCounts.entries()].map(([type, count]) => `${type}=${count}`).join(", ")}`);
