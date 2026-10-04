import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {contactScopes, contactTypes, contactValueIsValid} from "./venue-contacts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** Reviewed, additive enrichment for published research venues. It never edits venue claims or Knowledge Base content. */
export const enrichment = JSON.parse(fs.readFileSync(path.join(root, "src/data/venue-enrichment.json"), "utf8"));

const isDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const keyedReference = (id) => ({_key: id, _type: "reference", _ref: id});

export function validateEnrichment(catalogData, data = enrichment) {
  const errors = [];
  const add = (where, message) => errors.push(`${where}: ${message}`);
  const venues = new Map((catalogData.venues || []).map((venue) => [venue.id, venue]));
  const catalogSourceIds = new Set((catalogData.sources || []).map((source) => source.id));
  const sources = new Map((catalogData.sources || []).map((source) => [source.id, source]));
  const ids = new Set();
  const unique = (id, where) => {
    if (!id) add(where, "stable document ID is required");
    else if (ids.has(id) || venues.has(id)) add(where, `duplicate stable document ID ${id}`);
    else ids.add(id);
  };
  if (!isDate(data.checkedAt)) add("enrichment", "checkedAt must be YYYY-MM-DD");
  for (const source of data.sources || []) {
    unique(source.id, "enrichment source");
    if (catalogSourceIds.has(source.id)) add(source.id, "enrichment must not replace an existing research source");
    if (!source.title || !source.publisher || !isDate(source.checkedAt) || source.sourceType !== "official-page" || !source.reviewNote) add(source.id, "title, publisher, official-page type, checked date and review note are required");
    try { if (new URL(source.url).protocol !== "https:") throw new Error(); } catch { add(source.id, "source URL must be an absolute HTTPS URL"); }
    sources.set(source.id, source);
  }
  for (const contact of data.contacts || []) {
    unique(contact.id, "contact");
    const source = sources.get(contact.sourceId);
    if (!source) add(contact.id, `unknown source ${contact.sourceId}`);
    if (!Array.isArray(contact.venueIds) || !contact.venueIds.length || new Set(contact.venueIds).size !== contact.venueIds.length) add(contact.id, "at least one distinct venue is required");
    for (const venueId of contact.venueIds || []) if (!venues.has(venueId)) add(contact.id, `unknown venue ${venueId}`);
    if (!contactTypes.includes(contact.type) || !contactScopes.includes(contact.scope)) add(contact.id, "unsupported contact type or scope");
    if (contact.scope === "venue-specific" && contact.venueIds?.length !== 1) add(contact.id, "a venue-specific contact must belong to exactly one venue");
    const organizations = new Set((contact.venueIds || []).map((venueId) => venues.get(venueId)?.hostOrganizationId));
    if (organizations.size > 1) add(contact.id, "an organization-wide contact cannot span different host organizations");
    if (!contact.purpose?.trim() || contact.purpose.length > 300 || !isDate(contact.checkedAt)) add(contact.id, "published purpose (≤300 characters) and checked date are required");
    if (!contactValueIsValid(contact.type, contact.value, source ? [source.url] : [])) add(contact.id, "contact value is malformed or an enquiry page differs from its source");
  }
  return errors;
}

export function enrichmentDocuments(data = enrichment) {
  return [
    ...(data.sources || []).map((source) => ({_id: source.id, _type: "sourceReference", title: source.title, url: source.url, publisher: source.publisher, sourceType: source.sourceType, checkedAt: source.checkedAt, reviewNote: source.reviewNote})),
    ...(data.contacts || []).map((contact) => ({_id: contact.id, _type: "venueContact", venues: contact.venueIds.map(keyedReference), type: contact.type, value: contact.value, purpose: contact.purpose, scope: contact.scope, checkedAt: contact.checkedAt, sourceReferences: [keyedReference(contact.sourceId)]})),
  ];
}

const comparable = (value) => JSON.stringify(value, (key, item) => (item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).filter(([field]) => !field.startsWith("_") || field === "_ref" || field === "_type").sort(([a], [b]) => a.localeCompare(b))) : item));

/** Fields in an existing document that differ from the reviewed version. Differences are reported, never overwritten. */
export function differingFields(expected, actual) {
  if (!actual) return ["(missing)"];
  return Object.keys(expected).filter((field) => !field.startsWith("_") || field === "_type").filter((field) => comparable(expected[field]) !== comparable(actual[field]));
}
