import "./load-env.mjs";
import {createClient} from "@sanity/client";
import {catalog, validateCatalog} from "./catalog-lib.mjs";
import {differingFields, enrichmentDocuments} from "./venue-enrichment.mjs";

// Additive and idempotent: creates missing reviewed documents only. Existing published documents or drafts
// that differ are reported and left untouched, so editorial changes and existing provenance are preserved.
const dryRun = process.argv.includes("--dry-run");
const issues = validateCatalog();
if (issues.length) throw new Error(`Refusing invalid enrichment:\n- ${issues.join("\n- ")}`);
const docs = enrichmentDocuments();
const types = [...new Set(docs.map((doc) => doc._type))];
const describe = (list) => types.map((type) => `${type}=${list.filter((doc) => doc._type === type).length}`).join(", ");
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_PROJECT_IMPORT_TOKEN;
const configured = [projectId, dataset, token].every((value) => value && !value.startsWith("replace-"));
if (!configured) {
  if (dryRun) {
    console.log(`Dry run (offline): ${docs.length} reviewed enrichment documents validated (${describe(docs)}). No Sanity connection or writes performed.`);
    process.exit(0);
  }
  throw new Error("Set NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, and SANITY_PROJECT_IMPORT_TOKEN in ignored .env.local.");
}

const client = createClient({projectId, dataset, token, apiVersion: "2025-02-19", useCdn: false});
const references = (value) => Array.isArray(value) ? value.flatMap(references) : value && typeof value === "object" ? (value._type === "reference" ? [value._ref] : Object.values(value).flatMap(references)) : [];
const referencedIds = [...new Set(docs.flatMap(references))];
async function inspect() {
  const found = await client.getDocuments([...docs.map((doc) => doc._id), ...docs.map((doc) => `drafts.${doc._id}`), ...referencedIds]);
  return new Map(found.filter(Boolean).map((doc) => [doc._id, doc]));
}
try {
  let existing = await inspect();
  const missingReferences = referencedIds.filter((id) => !existing.has(id) && !docs.some((doc) => doc._id === id));
  if (missingReferences.length) throw new Error(`Referenced published documents are missing: ${missingReferences.join(", ")}`);
  for (const venue of catalog.venues.filter((item) => referencedIds.includes(item.id))) {
    const published = existing.get(venue.id);
    if (published.isDemonstration !== false || published.relationshipStatus !== "research-lead" || published.knowledgeBaseEligible !== true) throw new Error(`Venue ${venue.id} is not an eligible published research lead.`);
  }
  const plan = {create: [], unchanged: [], conflicts: [], drafts: []};
  for (const doc of docs) {
    const published = existing.get(doc._id);
    if (existing.has(`drafts.${doc._id}`)) plan.drafts.push(doc);
    if (!published && !existing.has(`drafts.${doc._id}`)) plan.create.push(doc);
    else if (published && differingFields(doc, published).length) plan.conflicts.push({doc, fields: differingFields(doc, published)});
    else if (published) plan.unchanged.push(doc);
  }
  console.log(`${dryRun ? "Dry run" : "Enrichment plan"}: create ${plan.create.length} (${describe(plan.create)}); unchanged ${plan.unchanged.length}; differing published ${plan.conflicts.length}; pending drafts ${plan.drafts.length}.`);
  for (const id of plan.create.map((doc) => doc._id)) console.log(`  create ${id}`);
  for (const {doc, fields} of plan.conflicts) console.log(`  preserved differing ${doc._id}: ${fields.join(", ")}`);
  for (const doc of plan.drafts) console.log(`  preserved draft drafts.${doc._id}`);
  if (dryRun) process.exit(0);

  if (plan.create.length) {
    // Sources first so every reference target exists; the transaction is atomic and create() fails on a race.
    const transaction = client.transaction();
    for (const doc of [...plan.create].sort((a, b) => Number(b._type === "sourceReference") - Number(a._type === "sourceReference"))) transaction.create(doc);
    await transaction.commit({visibility: "sync"});
  }
  existing = await inspect();
  const failures = docs.filter((doc) => !plan.conflicts.some((item) => item.doc._id === doc._id) && differingFields(doc, existing.get(doc._id)).length).map((doc) => doc._id);
  const resolved = await client.fetch(`*[_type == "venueContact" && _id in $ids]{_id, "venues": venues[]->{_id, relationshipStatus, isDemonstration}, "sources": sourceReferences[]->url}`, {ids: docs.filter((doc) => doc._type === "venueContact").map((doc) => doc._id)});
  for (const contact of resolved) if (contact.venues.some((venue) => !venue || venue.isDemonstration !== false || venue.relationshipStatus !== "research-lead") || !contact.sources.length || contact.sources.some((url) => !url)) failures.push(`${contact._id} (unresolved reference)`);
  const galleries = await client.fetch(`*[_type == "venueGallery" && _id in $ids]{_id, "venue": venue->{_id, relationshipStatus, isDemonstration}, "gallery": officialGallerySource->url, "photoSources": photos[].sourceReference->url}`, {ids: docs.filter((doc) => doc._type === "venueGallery").map((doc) => doc._id)});
  for (const gallery of galleries) if (!gallery.venue || gallery.venue.isDemonstration !== false || gallery.venue.relationshipStatus !== "research-lead" || !gallery.gallery || (gallery.photoSources || []).some((url) => !url)) failures.push(`${gallery._id} (unresolved reference)`);
  const counts = await client.fetch(`{"venueContact": count(*[_type == "venueContact" && !(_id in path("drafts.**"))]), "venueGallery": count(*[_type == "venueGallery" && !(_id in path("drafts.**"))]), "sourceReference": count(*[_type == "sourceReference" && !(_id in path("drafts.**"))]), "venue": count(*[_type == "venue" && !(_id in path("drafts.**"))])}`);
  if (failures.length) {
    console.error(`Enrichment verification failed for: ${failures.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log(`Enrichment verified: created ${plan.create.length}; ${docs.length - plan.conflicts.length}/${docs.length} reviewed documents match; ${plan.conflicts.length} differing documents preserved. Published counts: ${Object.entries(counts).map(([type, count]) => `${type}=${count}`).join(", ")}. Venue claims and the Knowledge Base query were not changed.`);
  }
} catch (error) {
  console.error(`Sanity enrichment stopped: ${error instanceof Error ? error.message : "unknown error"}. Nothing was overwritten.`);
  process.exitCode = 1;
}
