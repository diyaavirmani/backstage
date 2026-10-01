import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const catalog = JSON.parse(fs.readFileSync(path.join(root, "src/data/research-catalog.json"), "utf8"));

export function validateCatalog(data = catalog) {
  const errors = [];
  const sources = new Map((data.sources || []).map((source) => [source.id, source]));
  const organizations = new Map((data.hostOrganizations || []).map((item) => [item.id, item]));
  const recordIds = new Set();
  const add = (where, message) => errors.push(`${where}: ${message}`);
  const uniqueId = (id, where) => {
    if (!id) add(where, "stable document ID is required");
    else if (recordIds.has(id)) add(where, `duplicate stable document ID ${id}`);
    else recordIds.add(id);
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.researchDate || "")) add("catalog", "researchDate must be YYYY-MM-DD");
  if (!Array.isArray(data.demonstrationInventory) || data.demonstrationInventory.length !== 0) add("catalog", "demonstrationInventory must be empty and excluded from research content");
  for (const source of data.sources || []) {
    uniqueId(source.id, "source");
    if (!source.id || !source.title || !source.publisher || !source.checkedAt) add(source.id || "source", "title, publisher and checkedAt are required");
    try { const url = new URL(source.url); if (!["http:", "https:"].includes(url.protocol)) throw Error(); } catch { add(source.id, "source URL must be an absolute HTTP(S) URL"); }
  }
  for (const org of data.hostOrganizations || []) {
    uniqueId(org.id, "host organization");
    for (const sourceId of org.sourceIds || []) if (!sources.has(sourceId)) add(org.id, `unknown source ${sourceId}`);
  }
  for (const venue of data.venues || []) {
    uniqueId(venue.id, "venue");
    if (!venue.name || !["Delhi NCR", "Bengaluru"].includes(venue.city) || !venue.summary) add(venue.id, "name, supported city, and summary are required");
    if (!organizations.has(venue.hostOrganizationId)) add(venue.id, `unknown host organization ${venue.hostOrganizationId}`);
    if (venue.relationshipStatus !== "research-lead") add(venue.id, "research records must remain research-lead");
    if (!venue.sourceIds?.length) add(venue.id, "venue must have source references");
    for (const sourceId of venue.sourceIds || []) if (!sources.has(sourceId)) add(venue.id, `unknown source ${sourceId}`);
    for (const claim of venue.claims || []) {
      uniqueId(claim.id, "claim");
      if (claim.subjectId !== venue.id) add(claim.id, "claim subject must match owning venue");
      if (!claim.claim || !claim.value || !claim.checkedAt || !claim.evidenceType) add(claim.id, "claim, value, evidenceType and checkedAt are required");
      if (!claim.sourceIds?.length) add(claim.id, "every claim must have at least one source reference, including explicit unknown claims");
      for (const sourceId of claim.sourceIds || []) if (!sources.has(sourceId)) add(claim.id, `unknown source ${sourceId}`);
      if (claim.evidenceType === "historical-event" && !claim.historicalDate) add(claim.id, "historical evidence must preserve its event date");
      if (claim.appliesToSpaceId && !(venue.spaces || []).some((space) => space.id === claim.appliesToSpaceId)) add(claim.id, `claim references a space outside its venue: ${claim.appliesToSpaceId}`);
      if (["price", "capacity", "availability", "booking-authority"].includes(claim.claimType) && claim.evidenceType === "unknown" && !/unknown/i.test(claim.value)) add(claim.id, `${claim.claimType} unknown must remain explicit`);
    }
    const types = new Set((venue.claims || []).filter((claim) => claim.evidenceType === "unknown").map((claim) => claim.claimType));
    for (const required of ["price", "capacity", "availability", "booking-authority"]) if (!types.has(required)) add(venue.id, `missing explicit unknown ${required} claim`);
    for (const space of venue.spaces || []) {
      uniqueId(space.id, "space");
      if (!space.name || !space.summary || !space.sourceIds?.length) add(space.id, "space name, summary, and sources are required");
      for (const sourceId of space.sourceIds || []) if (!sources.has(sourceId)) add(space.id, `unknown source ${sourceId}`);
      if (space.capacity && (!Number.isInteger(space.capacity.guestCount) || space.capacity.guestCount < 1 || !space.capacity.layout || !space.capacity.sourceIds?.length || !space.capacity.checkedAt)) add(space.id, "capacity requires positive count, room, layout, evidence, and checked date");
      if (space.capacity) for (const sourceId of space.capacity.sourceIds) if (!sources.has(sourceId)) add(space.id, `unknown capacity source ${sourceId}`);
      if (space.capacity !== null && space.capacity !== undefined) add(space.id, "capacity must be null unless room and layout-specific evidence is present");
    }
    for (const resource of venue.resources || []) {
      uniqueId(resource.id, "resource");
      if (!resource.name || !resource.summary || !resource.sourceIds?.length) add(resource.id, "resource name, summary, and sources are required");
      for (const sourceId of resource.sourceIds || []) if (!sources.has(sourceId)) add(resource.id, `unknown source ${sourceId}`);
      if (resource.availability !== "unknown") add(resource.id, "research inventory availability must remain unknown");
    }
    const opportunity = venue.opportunity;
    if (opportunity) uniqueId(opportunity.id, "opportunity");
    if (!opportunity?.sourceIds?.length || opportunity.fulfillmentModel !== "unknown" || opportunity.availability !== "unknown" || opportunity.relationshipStatus !== "research-lead") add(venue.id, "opportunity must retain sources, unknown booking/availability, and research-lead status");
    if (!opportunity || !["paid", "sponsored", "pro-bono", "unknown"].includes(opportunity.accessModel)) add(venue.id, "opportunity requires a separate valid access model");
    for (const sourceId of opportunity?.sourceIds || []) if (!sources.has(sourceId)) add(opportunity.id, `unknown source ${sourceId}`);
    if (["paid", "sponsored", "pro-bono"].includes(opportunity?.accessModel) && !venue.claims.some((claim) => claim.claimType === "access-model" && claim.evidenceType === "public-documentation")) add(venue.id, "specific access model requires a public claim");
    for (const policy of venue.policies || []) {
      uniqueId(policy.id, "policy");
      if (!policy.title || !policy.statement || !policy.checkedAt || !policy.sourceIds?.length) add(policy.id, "policy requires title, statement, checked date, and sources");
      for (const sourceId of policy.sourceIds || []) if (!sources.has(sourceId)) add(policy.id, `unknown source ${sourceId}`);
    }
  }
  return errors;
}

export function reference(id) { return {_type: "reference", _ref: id}; }

export function buildDocuments(data = catalog) {
  const docs = [];
  for (const source of data.sources) docs.push({_id: source.id, _type: "sourceReference", title: source.title, url: source.url, publisher: source.publisher, sourceType: source.sourceType, checkedAt: source.checkedAt, reviewNote: source.reviewNote});
  for (const org of data.hostOrganizations) docs.push({_id: org.id, _type: "hostOrganization", name: org.name, website: org.website, sourceReferences: org.sourceIds.map(reference)});
  for (const venue of data.venues) {
    for (const space of venue.spaces || []) docs.push({_id: space.id, _type: "venueSpace", name: space.name, venue: reference(venue.id), spaceType: space.spaceType, summary: space.summary, layout: space.layout, sourceReferences: space.sourceIds.map(reference)});
    for (const resource of venue.resources || []) docs.push({_id: resource.id, _type: "venueResource", name: resource.name, venue: reference(venue.id), resourceType: resource.resourceType, summary: resource.summary, availability: "unknown", sourceReferences: resource.sourceIds.map(reference)});
    for (const policy of venue.policies || []) docs.push({_id: policy.id, _type: "hostingPolicy", title: policy.title, venue: reference(venue.id), statement: policy.statement, evidenceType: policy.evidenceType, sourceReferences: (policy.sourceIds || []).map(reference), checkedAt: policy.checkedAt});
    const opportunity = venue.opportunity;
    docs.push({_id: opportunity.id, _type: "hostingOpportunity", title: opportunity.title, venue: reference(venue.id), summary: opportunity.summary, preferredEventTypes: opportunity.preferredEventTypes, accessModel: opportunity.accessModel, fulfillmentModel: opportunity.fulfillmentModel, availability: opportunity.availability, relationshipStatus: "research-lead", sourceReferences: opportunity.sourceIds.map(reference)});
    const claimReferences = (venue.claims || []).map((claim) => ({_key: claim.id, subject: claim.claimType, claim: claim.claim, value: claim.value, evidenceType: claim.evidenceType === "public-documentation" ? "public-documentation" : claim.evidenceType, sourceReferences: claim.sourceIds.map(reference), checkedAt: claim.checkedAt, historicalDate: claim.historicalDate, appliesToSpace: claim.appliesToSpaceId ? reference(claim.appliesToSpaceId) : undefined, layout: claim.layout, qualification: claim.qualification}));
    docs.push({_id: venue.id, _type: "venue", name: venue.name, city: venue.city, locality: venue.locality, summary: venue.summary, hostOrganization: venue.hostOrganizationId ? reference(venue.hostOrganizationId) : undefined, relationshipStatus: "research-lead", isDemonstration: false, knowledgeBaseEligible: true, sourceReferences: venue.sourceIds.map(reference), claims: claimReferences, spaces: (venue.spaces || []).map((item) => reference(item.id)), resources: (venue.resources || []).map((item) => reference(item.id)), policies: (venue.policies || []).map((item) => reference(item.id)), opportunities: [reference(opportunity.id)]});
  }
  return docs;
}
