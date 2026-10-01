import {createClient} from "@sanity/client";
import {buildDocuments, catalog, validateCatalog} from "./catalog-lib.mjs";

const dryRun = process.argv.includes("--dry-run");
const issues = validateCatalog();
if (issues.length) throw new Error(`Refusing to import invalid catalogue:\n- ${issues.join("\n- ")}`);
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_PROJECT_IMPORT_TOKEN;
const docs = buildDocuments();
if (docs.some((doc) => doc._type === "venue" && (doc.isDemonstration !== false || doc.knowledgeBaseEligible !== true))) throw new Error("Refusing a demonstration or ineligible venue document");
if (dryRun) {
  console.log(`Dry run: validated ${docs.length} stable-ID published research documents from ${catalog.venues.length} venues. No Sanity connection or writes performed.`);
  process.exit(0);
}
if (!projectId || !dataset || !token || projectId.startsWith("replace-") || dataset.startsWith("replace-") || token.startsWith("replace-")) throw new Error("Set NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, and SANITY_PROJECT_IMPORT_TOKEN in .env.local. The project import token stays server-side; a dry run needs no credentials.");
const client = createClient({projectId, dataset, token, apiVersion: "2025-02-19", useCdn: false});
const publishedIds = docs.map((doc) => doc._id);
const existing = await client.getDocuments([...publishedIds, ...publishedIds.map((id) => `drafts.${id}`)]);
const occupied = new Set(existing.filter(Boolean).map((doc) => doc._id.replace(/^drafts\./, "")));
const toCreate = docs.filter((doc) => !occupied.has(doc._id));
for (const doc of toCreate) await client.createIfNotExists(doc);
console.log(`Seed complete: ${toCreate.length} published documents created; ${docs.length - toCreate.length} existing documents skipped to preserve host edits. No drafts or demonstration inventory were imported.`);
