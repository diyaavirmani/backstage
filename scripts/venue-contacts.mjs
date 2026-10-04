export const contactTypes = ["phone", "email", "enquiry-page"];
export const contactScopes = ["venue-specific", "organization-wide"];

const isDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const parseUrl = (value) => { try { return new URL(value); } catch { return null; } };
const isHttpUrl = (value) => ["http:", "https:"].includes(parseUrl(value)?.protocol);
const samePage = (a, b) => {
  const left = parseUrl(a), right = parseUrl(b);
  return Boolean(left && right && left.origin === right.origin && left.pathname.replace(/\/$/, "") === right.pathname.replace(/\/$/, ""));
};

/** An enquiry page must be HTTPS and must be the cited page itself, so a route cannot point somewhere its source does not. */
export function contactValueIsValid(type, value, sourceUrls = []) {
  if (typeof value !== "string") return false;
  if (type === "phone") return /^\+\d{10,15}$/.test(value);
  if (type === "email") return /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(value);
  if (type === "enquiry-page") return parseUrl(value)?.protocol === "https:" && sourceUrls.some((url) => samePage(url, value));
  return false;
}

export const contactProjection = `"contacts": *[_type == "venueContact" && ^._id in venues[]._ref]{_id, "venueIds": venues[]._ref, type, value, purpose, scope, checkedAt, "sourceReferences": sourceReferences[]->{_id, title, url, checkedAt}}`;

const typeOrder = {"enquiry-page": 0, phone: 1, email: 2};

/**
 * Server-side gate for published contact records. Only well-formed, sourced routes linked to this exact
 * venue identity survive; a venue-specific route can never be shared between venues.
 */
export function normalizeContacts(records, venueId) {
  return (Array.isArray(records) ? records : []).filter((record) => {
    if (!record || !Array.isArray(record.venueIds) || !record.venueIds.includes(venueId)) return false;
    if (!contactTypes.includes(record.type) || !contactScopes.includes(record.scope)) return false;
    if (record.scope === "venue-specific" && record.venueIds.length !== 1) return false;
    if (typeof record.purpose !== "string" || !record.purpose.trim() || record.purpose.length > 300 || !isDate(record.checkedAt)) return false;
    const sources = Array.isArray(record.sourceReferences) ? record.sourceReferences : [];
    if (!sources.length || sources.some((source) => !source?._id || !source.title || !isHttpUrl(source.url))) return false;
    return contactValueIsValid(record.type, record.value, sources.map((source) => source.url));
  }).map((record) => ({
    id: record._id,
    venueIds: record.venueIds,
    type: record.type,
    value: record.value,
    purpose: record.purpose.trim(),
    scope: record.scope,
    checkedAt: record.checkedAt,
    sourceReferences: record.sourceReferences.map((source) => ({id: source._id, title: source.title, url: source.url, checkedAt: source.checkedAt})),
  })).sort((a, b) => (a.scope === b.scope ? 0 : a.scope === "venue-specific" ? -1 : 1) || typeOrder[a.type] - typeOrder[b.type] || a.id.localeCompare(b.id));
}

/** Builds the same records from reviewed JSON for the explicitly labelled local preview. */
export function reviewedContactRecords(enrichment, catalogSources = []) {
  const sources = new Map([...catalogSources, ...(enrichment.sources || [])].map((source) => [source.id, source]));
  return (enrichment.contacts || []).map(({id, sourceId, ...contact}) => {
    const source = sources.get(sourceId);
    return {...contact, _id: id, sourceReferences: source ? [{_id: source.id, title: source.title, url: source.url, checkedAt: source.checkedAt}] : []};
  });
}

export function formatContactValue(contact) {
  const indian = contact.type === "phone" && contact.value.match(/^\+91(\d{5})(\d{5})$/);
  return indian ? `+91 ${indian[1]} ${indian[2]}` : contact.value;
}

export function contactHref(contact) {
  if (contact.type === "phone") return `tel:${contact.value}`;
  if (contact.type === "email") return `mailto:${contact.value}`;
  return contact.value;
}
