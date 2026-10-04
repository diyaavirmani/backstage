import assert from "node:assert/strict";
import test from "node:test";
import {buildDocuments, catalog} from "./catalog-lib.mjs";
import {differingFields, enrichment, enrichmentDocuments, validateEnrichment} from "./venue-enrichment.mjs";
import {normalizeContacts, reviewedContactRecords, formatContactValue, contactHref} from "./venue-contacts.mjs";
import {composeEnquiry, confirmationQuestions, labelledSources, orderVenueFacts, orderVenueLeads} from "./evidence-presentation.mjs";

const records = reviewedContactRecords(enrichment, catalog.sources);
const contactsFor = (venueId) => normalizeContacts(records, venueId);
const noida = "venue-ofis-noida-sector-62", gurugram = "venue-ofis-gurugram-sohna-road";

test("reviewed enrichment validates and is additive to the research catalog", () => {
  assert.deepEqual(validateEnrichment(catalog), []);
  const docs = enrichmentDocuments();
  assert.equal(docs.length, enrichment.sources.length + enrichment.contacts.length);
  const ids = new Set(buildDocuments().map((doc) => doc._id));
  for (const doc of docs) assert.ok(ids.has(doc._id), `${doc._id} is part of the expected seed documents`);
  for (const contact of docs.filter((doc) => doc._type === "venueContact")) {
    for (const reference of [...contact.venues, ...contact.sourceReferences]) assert.ok(ids.has(reference._ref), `${contact._id} → ${reference._ref} resolves`);
  }
  assert.ok(docs.every((doc) => doc._type !== "venue"), "enrichment never rewrites venue claims");
});

test("contacts stay attached to the correct venue identity and scope", () => {
  const noidaContacts = contactsFor(noida), gurugramContacts = contactsFor(gurugram);
  assert.deepEqual(gurugramContacts.map((item) => item.id).sort(), ["contact-ofis-sales-phone", "contact-ofis-workspace-phone"]);
  assert.ok(gurugramContacts.every((item) => item.scope === "organization-wide"), "shared Ofis routes are labelled organization-wide");
  assert.deepEqual(noidaContacts.filter((item) => item.scope === "venue-specific").map((item) => item.value), ["hello@ofissquare.com"]);
  assert.equal(noidaContacts[0].scope, "venue-specific", "venue-specific routes are listed first");
  assert.deepEqual(contactsFor("venue-paytm-office-noida"), [], "Paytm keeps no contact; customer support is not a booking route");
  const saiacs = contactsFor("venue-saiacs-ceo-centre-bengaluru");
  assert.deepEqual(saiacs.map((item) => item.value).sort(), ["+919606008031", "+919606008032", "ceoenquiry@saiacs-ceocenter.com"]);
  assert.ok(saiacs.every((item) => item.sourceReferences[0].url === "https://saiacs-ceocenter.com/contact-hotel-in-bengaluru.html"));
  const masters = contactsFor("venue-masters-union-gurugram");
  assert.ok(masters.every((item) => !/admission|careers?|media/i.test(`${item.value} ${item.purpose}`)), "admissions/media routes are never venue contacts");
  assert.ok(contactsFor("venue-shifu-den-bengaluru").every((item) => item.type !== "phone"), "no Shifu phone number is invented");
  assert.equal(formatContactValue(gurugramContacts.find((item) => item.type === "phone")), "+91 82879 91481");
  assert.equal(contactHref({type: "email", value: "hello@ofissquare.com"}), "mailto:hello@ofissquare.com");
});

test("server-side normalization rejects forged, malformed, or unsourced contact records", () => {
  const sales = records.find((item) => item._id === "contact-ofis-sales-phone");
  const shifu = records.find((item) => item._id === "contact-shifu-den-host-form");
  for (const [label, forged, venueId] of [
    ["venue-specific route shared between venues", {...sales, scope: "venue-specific"}, noida],
    ["route for another venue", sales, "venue-paytm-office-noida"],
    ["malformed phone", {...sales, value: "+91 82879"}, noida],
    ["missing source", {...sales, sourceReferences: []}, noida],
    ["broken source reference", {...sales, sourceReferences: [null]}, noida],
    ["non-HTTP source", {...sales, sourceReferences: [{...sales.sourceReferences[0], url: "javascript:alert(1)"}]}, noida],
    ["unsupported type", {...sales, type: "whatsapp"}, noida],
    ["enquiry page outside its cited page", {...shifu, value: "https://example.test/form"}, "venue-shifu-den-bengaluru"],
    ["script enquiry page", {...shifu, value: "javascript:alert(1)"}, "venue-shifu-den-bengaluru"],
    ["missing checked date", {...sales, checkedAt: ""}, noida],
  ]) assert.deepEqual(normalizeContacts([forged], venueId), [], label);
});

test("enrichment validation catches unreviewed relationships before any write", () => {
  const base = structuredClone(enrichment);
  const variant = (change) => { const data = structuredClone(base); change(data); return validateEnrichment(catalog, data); };
  assert.match(variant((data) => { data.contacts[0].venueIds.push("venue-paytm-office-noida"); }).join(" "), /different host organizations/);
  assert.match(variant((data) => { data.contacts[0].venueIds = ["venue-unknown"]; }).join(" "), /unknown venue/);
  assert.match(variant((data) => { data.contacts[0].sourceId = "source-missing"; }).join(" "), /unknown source/);
  assert.match(variant((data) => { data.sources[0].id = "source-ofis-events"; }).join(" "), /must not replace an existing research source/);
  assert.match(variant((data) => { data.contacts.find((item) => item.type === "enquiry-page").value = "https://example.test/"; }).join(" "), /differs from its source/);
});

test("differing published fields are reported, ignoring Sanity system fields", () => {
  const [doc] = enrichmentDocuments().filter((item) => item._type === "venueContact");
  assert.deepEqual(differingFields(doc, {...doc, _rev: "x", _createdAt: "now", venues: doc.venues.map((reference) => ({_type: reference._type, _ref: reference._ref}))}), []);
  assert.deepEqual(differingFields(doc, {...doc, value: "+910000000000"}), ["value"]);
  assert.deepEqual(differingFields(doc, null), ["(missing)"]);
});

const brief = {id: "brief-1", savedAt: "2026-10-05T00:00:00Z", title: "Builder workshop", city: "Delhi NCR", eventType: "Workshop", audience: "Students; community: Example coding club", date: "2026-10-20", startTime: "10:00", endTime: "13:00", headcount: 60, budgetAmount: 15000, currency: "INR", roomRequirements: [], equipmentRequirements: ["Projector"], essentialRequirements: ["Outside-food permission"], flexibleRequirements: ["Parking"], setupMinutes: 30, cleanupMinutes: 30};
const ofisEvents = {id: "source-ofis-events", title: "Ofis events", url: "https://ofissquare.com/events-spaces/", sourceType: "official-page"};
const gdg = {id: "source-gdg", title: "GDG listing", url: "https://gdg.community.dev/events/details/x/", sourceType: "historical-event-listing"};

test("evidence ordering puts official hosting and historical events first without hiding qualifications", () => {
  const facts = [
    {subject: "location", claim: "Address", value: "Sector 62", evidenceType: "public-documentation"},
    {subject: "eligibility", claim: "Founder community", value: "For founders", qualification: "Criteria unknown", evidenceType: "public-documentation"},
    {subject: "historical-event", claim: "Past meetup", value: "Hosted a meetup", evidenceType: "historical-event", historicalDate: "2026-09-12", sourceReferences: [gdg]},
    {subject: "equipment", claim: "AV systems", value: "Display screens", evidenceType: "public-documentation", sourceReferences: [ofisEvents]},
    {subject: "hosting-conditions", claim: "Hosts workshops", value: "Seminars and workshops", evidenceType: "public-documentation", sourceReferences: [ofisEvents]},
  ];
  assert.deepEqual(orderVenueFacts(facts, brief).map((fact) => fact.claim), ["Hosts workshops", "Past meetup", "AV systems", "Founder community", "Address"]);
  assert.equal(orderVenueFacts(facts, brief).length, facts.length, "nothing is dropped");
  assert.deepEqual(labelledSources(facts, [], brief).map((link) => [link.id, link.label]), [["source-ofis-events", "Official hosting information"], ["source-gdg", "Previous event listing"]]);
  assert.equal(labelledSources([{subject: "hosting-conditions", evidenceType: "public-documentation", sourceReferences: [{...ofisEvents, sourceType: "other"}]}])[0].label, "Hosting information", "“Official” only for official pages");
});

test("leads are ordered by brief-relevant evidence; contacts only break ties; source counts are ignored", () => {
  const lead = (venueId, overrides = {}) => ({venueId, requirementCoverage: [], documentedFacts: [], contacts: [], sourceReferences: [], ...overrides});
  const mismatch = lead("mismatch", {requirementCoverage: [{requirement: "Outside-food permission", status: "contradicted", evidence: []}], contacts: [{scope: "venue-specific"}]});
  const supported = lead("supported", {requirementCoverage: [{requirement: "Projector", status: "supported", evidence: []}]});
  const hosting = lead(noida, {documentedFacts: [{subject: "hosting-conditions", evidenceType: "public-documentation", claim: "Hosts workshops", value: ""}]});
  const historical = lead("venue-paytm-office-noida", {documentedFacts: [{subject: "historical-event", evidenceType: "historical-event", claim: "Past event", value: ""}], sourceReferences: Array(20).fill(gdg)});
  const contactOnly = lead(gurugram, {contacts: [{scope: "organization-wide"}]});
  assert.deepEqual(orderVenueLeads([mismatch, historical, contactOnly, hosting, supported], brief).map((item) => item.venueId), ["supported", noida, gurugram, "venue-paytm-office-noida", "mismatch"]);
  assert.deepEqual(orderVenueLeads([contactOnly, hosting], brief).map((item) => item.venueId), [noida, gurugram], "Noida and Gurugram remain separate leads");
});

test("confirmation questions and enquiry text come from the brief and stay unsent and non-committal", () => {
  const venue = {
    requirementCoverage: [
      {requirement: "Outside-food permission", status: "contradicted", evidence: []},
      {requirement: "Projector", status: "unknown", evidence: []},
      {requirement: "Audience: Students; community: Example coding club", status: "unknown", evidence: []},
      {requirement: "Event date 2026-10-20 and time 10:00–13:00", status: "unknown", evidence: []},
      {requirement: "Budget of INR 15000", status: "unknown", evidence: []},
    ],
    importantUnknowns: [{claim: "Room and layout-specific capacity.", value: "Unknown", evidenceType: "unknown"}],
    documentedConflicts: [],
  };
  const questions = confirmationQuestions(venue);
  assert.match(questions[0], /^Outside-food permission — sources show a mismatch/);
  assert.ok(questions.includes("Room and layout-specific capacity"));
  assert.ok(!questions.some((item) => /^Event date|^Budget of/.test(item)), "brief summary lines are not repeated as questions");
  const text = composeEnquiry({venueName: "Ofis Square — Sector 62, Noida", brief, questions});
  assert.match(text, /“Builder workshop”, a workshop for 60 attendees \(audience: Students \(Example coding club\)\)/);
  assert.match(text, /Spaces: we would welcome your suggestion/);
  assert.match(text, /- Projector/);
  assert.match(text, /not a booking request or confirmation/);
  assert.doesNotMatch(text, /\+91|@|available on|is available|confirmed/i, "no contact details or availability claims are inserted");
});
