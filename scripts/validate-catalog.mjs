import {catalog, validateCatalog} from "./catalog-lib.mjs";
import {enrichment} from "./venue-enrichment.mjs";
import fs from "node:fs";

const errors = validateCatalog();
const query = fs.readFileSync(new URL("../sanity/knowledge-base-query.groq", import.meta.url), "utf8");
const setupGuide = fs.readFileSync(new URL("../docs/sanity-setup.md", import.meta.url), "utf8");
const documentedQuery = setupGuide.match(/```groq\n([\s\S]*?)\n```/)?.[1];
if (documentedQuery?.trim() !== query.trim()) errors.push("Knowledge Base GROQ query in docs/sanity-setup.md must match sanity/knowledge-base-query.groq");
if (!query.trimStart().startsWith('*[_type == "venue"')) errors.push("Knowledge Base query must start with a complete GROQ venue dataset query");
for (const guard of ['knowledgeBaseEligible == true', 'isDemonstration == false', 'relationshipStatus != "demonstration"']) if (!query.includes(guard)) errors.push(`Knowledge Base query is missing exclusion/eligibility guard: ${guard}`);
if (/\b(organizerProfile|eventBrief|bookingRequest|operationalBooking)\b/i.test(query)) errors.push("Knowledge Base query must not include private organizer or operational booking data");
if (!query.includes('sourceReferences[]->{title, url')) errors.push("Knowledge Base query must include dereferenced original source URLs");
if (errors.length) {
  console.error(`Catalog validation failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`Catalog valid: ${catalog.venues.length} source-backed research profiles, ${catalog.sources.length} sources, ${enrichment.sources.length} enquiry sources and ${enrichment.contacts.length} reviewed contact routes, no demonstration inventory; unsupported capacities, availability, prices, and booking authority remain unknown.`);
}
