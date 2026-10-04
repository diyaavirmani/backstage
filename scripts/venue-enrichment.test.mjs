import assert from "node:assert/strict";
import test from "node:test";
import {buildDocuments, catalog} from "./catalog-lib.mjs";
import {differingFields, enrichment, enrichmentDocuments, validateEnrichment} from "./venue-enrichment.mjs";
import {normalizeContacts, reviewedContactRecords, formatContactValue, contactHref} from "./venue-contacts.mjs";
import {composeEnquiry, confirmationQuestions, labelledSources, orderVenueFacts, orderVenueLeads} from "./evidence-presentation.mjs";
import {isAllowedPhotoUrl, normalizeGallery, reviewedGalleryRecord} from "./venue-photos.mjs";

const records = reviewedContactRecords(enrichment, catalog.sources);
const contactsFor = (venueId) => normalizeContacts(records, venueId);
const noida = "venue-ofis-noida-sector-62", gurugram = "venue-ofis-gurugram-sohna-road";

test("reviewed enrichment validates and is additive to the research catalog", () => {
  assert.deepEqual(validateEnrichment(catalog), []);
  const docs = enrichmentDocuments();
  assert.equal(docs.length, enrichment.sources.length + enrichment.contacts.length + enrichment.galleries.length);
  const ids = new Set(buildDocuments().map((doc) => doc._id));
  for (const doc of docs) assert.ok(ids.has(doc._id), `${doc._id} is part of the expected seed documents`);
  const references = (value) => Array.isArray(value) ? value.flatMap(references) : value && typeof value === "object" ? (value._type === "reference" ? [value._ref] : Object.values(value).flatMap(references)) : [];
  for (const doc of docs) for (const id of references(doc)) assert.ok(ids.has(id), `${doc._id} → ${id} resolves`);
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

const galleryFor = (venueId) => normalizeGallery(reviewedGalleryRecord(enrichment, catalog.sources, venueId), venueId);

test("galleries hold only verified official photos for the right venue and branch", () => {
  const counts = Object.fromEntries(catalog.venues.map((venue) => [venue.id, galleryFor(venue.id)?.photos.length ?? null]));
  assert.deepEqual(counts, {"venue-masters-union-gurugram": 0, [gurugram]: 4, [noida]: 6, "venue-paytm-office-noida": null, "venue-shifu-den-bengaluru": 4, "venue-saiacs-ceo-centre-bengaluru": 5});
  const masters = galleryFor("venue-masters-union-gurugram");
  assert.equal(masters.displayPolicy, "link-only");
  assert.equal(masters.officialGallery.url, "https://mastersunion.org/book-a-campus-tour", "terms forbid republishing, so the official page is linked instead");
  const sohna = galleryFor(gurugram).photos, sector62 = galleryFor(noida).photos;
  assert.ok(sohna.every((photo) => photo.source.url !== "https://ofissquare.com/coworking-space-in-noida-sector-62/"));
  assert.ok(sohna.every((photo) => !/sector-62|auditorium|theatre|conferenceroom|Rectangle52/i.test(photo.imageUrl)), "no Sector 62 images on Sohna Road");
  assert.ok(sector62.every((photo) => !/sohna/i.test(`${photo.imageUrl} ${photo.source.url}`)), "no Sohna Road images on Sector 62");
  assert.ok([...sohna, ...sector62].every((photo) => /Sohna|Sector 62|Vatika/i.test(photo.locationEvidence)), "Ofis photos state their branch evidence");
  const allPhotos = catalog.venues.flatMap((venue) => galleryFor(venue.id)?.photos || []);
  assert.ok(allPhotos.every((photo) => isAllowedPhotoUrl(photo.thumbnailUrl) && isAllowedPhotoUrl(photo.imageUrl)));
  assert.ok(allPhotos.every((photo) => photo.photoDate === null), "no photo date is invented");
  assert.equal(galleryFor("venue-saiacs-ceo-centre-bengaluru").photos.find((photo) => photo.category === "accommodation")?.caption.includes("not an event space"), true);
  assert.ok(allPhotos.every((photo) => !/\bcapacity\b|\b\d+\s*(?:seats?|people|guests|attendees|pax)\b|sq\.? ?ft|square (?:feet|metres)/i.test(`${photo.caption} ${photo.alt}`)), "captions do not infer size or capacity");
});

test("the photo host allowlist rejects anything but curated official files", () => {
  assert.ok(isAllowedPhotoUrl("https://ofissquare.com/wp-content/uploads/2026/06/auditorium-.png"));
  assert.ok(isAllowedPhotoUrl("https://res.cloudinary.com/dkwqszhed/image/upload/c_limit,w_400,f_auto,q_auto/v1/x.png"));
  for (const url of ["http://ofissquare.com/wp-content/uploads/a.png", "https://ofissquare.com/wp-admin/a.png", "https://ofissquare.com/wp-content/uploads/a.png?w=1", "https://res.cloudinary.com/another-account/image/upload/a.png", "https://ofissquare.com.example.test/wp-content/uploads/a.png", "https://user@ofissquare.com/wp-content/uploads/a.png", "javascript:alert(1)", "data:image/png;base64,AAAA", "/api/proxy?url=https://ofissquare.com/x.png"]) assert.equal(isAllowedPhotoUrl(url), false, url);
});

test("server-side gallery normalization drops unsafe or mismatched records", () => {
  const record = reviewedGalleryRecord(enrichment, catalog.sources, noida);
  assert.equal(normalizeGallery(record, gurugram), null, "a gallery never attaches to another venue");
  const tampered = {...record, photos: [
    {...record.photos[0], imageUrl: "https://example.test/photo.jpg"},
    {...record.photos[1], thumbnailUrl: `${record.photos[1].thumbnailUrl}?track=1`},
    {...record.photos[2], source: null},
    {...record.photos[3], locationEvidence: ""},
    {...record.photos[4], category: "capacity-proof"},
    record.photos[5],
  ]};
  assert.deepEqual(normalizeGallery(tampered, noida).photos.map((photo) => photo.id), [record.photos[5]._key]);
  const linkOnly = normalizeGallery({...record, displayPolicy: "link-only"}, noida);
  assert.deepEqual(linkOnly.photos, [], "link-only galleries never embed photos");
  assert.equal(normalizeGallery({...record, photos: [...record.photos, ...record.photos]}, noida).photos.length, 6);
  assert.equal(normalizeGallery({...record, officialGallery: null, photos: []}, noida), null);
});

test("gallery validation blocks wrong-branch, unlisted and over-long galleries before any write", () => {
  const variant = (change) => { const data = structuredClone(enrichment); change(data); return validateEnrichment(catalog, data).join(" "); };
  const sohnaGallery = (data) => data.galleries.find((item) => item.venueId === gurugram);
  const sector62Photo = (data) => data.galleries.find((item) => item.venueId === noida).photos.find((photo) => photo.sourceId === "source-ofis-noida-sector-62");
  assert.match(variant((data) => { sohnaGallery(data).photos.push({...sector62Photo(data), key: "copied"}); }), /another venue or site/);
  assert.match(variant((data) => { sohnaGallery(data).photos[0].imageUrl = "https://example.test/terrace.jpg"; }), /allowlisted official image host/);
  assert.match(variant((data) => { sohnaGallery(data).photos[0].locationEvidence = ""; }), /location evidence/);
  assert.match(variant((data) => { const gallery = sohnaGallery(data); gallery.photos = Array(7).fill(gallery.photos[0]).map((photo, index) => ({...photo, key: `p${index}`})); }), /1–6 photos/);
  assert.match(variant((data) => { data.galleries.find((item) => item.displayPolicy === "link-only").photos = [structuredClone(sector62Photo(data))]; }), /link-only gallery must not embed/);
  assert.match(variant((data) => { data.galleries.push({...structuredClone(sohnaGallery(data)), id: "gallery-duplicate"}); }), /only one gallery/);
});
