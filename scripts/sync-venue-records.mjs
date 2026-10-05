import "./load-env.mjs";
import {execFileSync} from "node:child_process";
import {createClient} from "@sanity/client";
import {buildDocuments, validateCatalog} from "./catalog-lib.mjs";
import {differingFields} from "./venue-enrichment.mjs";

// Additive sync for existing published venue documents, which the seed skips. Missing claims, source references and
// spaces are appended. An existing claim is replaced only when named with --replace=<claim id> AND the published copy
// still equals the previously reviewed version (git HEAD), so an editor's change is never overwritten.
const dryRun = process.argv.includes("--dry-run");
const replace = new Set(process.argv.filter((arg) => arg.startsWith("--replace=")).flatMap((arg) => arg.slice(10).split(",")));
const issues = validateCatalog();
if (issues.length) throw new Error(`Refusing invalid catalog:\n- ${issues.join("\n- ")}`);
const previous = JSON.parse(execFileSync("git", ["show", "HEAD:src/data/research-catalog.json"], {encoding: "utf8"}));
const previousDocs = new Map(buildDocuments(previous).filter((doc) => doc._type === "venue").map((doc) => [doc._id, doc]));
const expected = buildDocuments().filter((doc) => doc._type === "venue");
const client = createClient({projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET, token: process.env.SANITY_PROJECT_IMPORT_TOKEN, apiVersion: "2025-02-19", useCdn: false});
const clean = (value) => JSON.parse(JSON.stringify(value));
let failures = 0;
for (const doc of expected) {
  const published = await client.getDocument(doc._id);
  if (!published) { console.log(`${doc._id}: not published; run the seed first.`); failures += 1; continue; }
  const refs = (items) => new Set((items || []).map((item) => item._ref));
  const missingSources = doc.sourceReferences.filter((item) => !refs(published.sourceReferences).has(item._ref));
  const missingSpaces = doc.spaces.filter((item) => !refs(published.spaces).has(item._ref));
  const publishedClaims = new Map((published.claims || []).map((claim) => [claim._key, claim]));
  const missingClaims = doc.claims.filter((claim) => !publishedClaims.has(claim._key));
  const differing = doc.claims.filter((claim) => publishedClaims.has(claim._key) && differingFields(clean(claim), publishedClaims.get(claim._key)).length);
  const replacements = [];
  for (const claim of differing) {
    const before = previousDocs.get(doc._id)?.claims.find((item) => item._key === claim._key);
    const untouched = before && !differingFields(clean(before), publishedClaims.get(claim._key)).length;
    if (replace.has(claim._key) && untouched) replacements.push(claim);
    else console.log(`${doc._id}: preserved differing claim ${claim._key}${replace.has(claim._key) ? " (published copy was edited since review)" : ""}`);
  }
  if (!missingSources.length && !missingSpaces.length && !missingClaims.length && !replacements.length) continue;
  console.log(`${doc._id}: append ${missingClaims.length} claims, ${missingSources.length} sources, ${missingSpaces.length} spaces; replace ${replacements.map((claim) => claim._key).join(", ") || "none"}`);
  if (dryRun) continue;
  // A patch carries a single array insert, so each append is its own revision-checked patch.
  let revision = published._rev;
  const apply = async (build) => { revision = (await build(client.patch(doc._id).ifRevisionId(revision)).commit({visibility: "sync"}))._rev; };
  if (missingSources.length) await apply((patch) => patch.setIfMissing({sourceReferences: []}).append("sourceReferences", missingSources.map((item) => ({...item, _key: item._ref}))));
  if (missingSpaces.length) await apply((patch) => patch.setIfMissing({spaces: []}).append("spaces", missingSpaces.map((item) => ({...item, _key: item._ref}))));
  if (missingClaims.length) await apply((patch) => patch.setIfMissing({claims: []}).append("claims", clean(missingClaims)));
  for (const claim of replacements) await apply((patch) => patch.set({[`claims[_key=="${claim._key}"]`]: clean(claim)}));
  const after = await client.getDocument(doc._id);
  const afterClaims = new Map((after.claims || []).map((claim) => [claim._key, claim]));
  const wrong = [...missingClaims, ...replacements].filter((claim) => differingFields(clean(claim), afterClaims.get(claim._key)).length).map((claim) => claim._key);
  for (const [field, items] of [["sourceReferences", missingSources], ["spaces", missingSpaces]]) if (items.some((item) => !refs(after[field]).has(item._ref))) wrong.push(field);
  if (wrong.length) { console.error(`${doc._id}: verification failed for ${wrong.join(", ")}`); failures += 1; }
  else console.log(`${doc._id}: verified`);
}
if (failures) process.exitCode = 1;
console.log(dryRun ? "Dry run complete; nothing was written." : "Venue sync complete.");
