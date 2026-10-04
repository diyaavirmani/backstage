import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import catalog from "../../src/data/research-catalog.json";
import enrichment from "../../src/data/venue-enrichment.json";

// Opt-in, bounded live verification: exactly three sequential discovery calls against local credentials.
// BACKSTAGE_LIVE_JOURNEY=dry rehearses the same journey with a server-shaped discovery fixture (no model calls).
const mode = process.env.BACKSTAGE_LIVE_JOURNEY;
test.skip(mode !== "1" && mode !== "dry", "Opt in with BACKSTAGE_LIVE_JOURNEY=1 (or =dry) and local server-side OpenAI/Sanity credentials.");

type Lead = {
  venueId: string;
  city: string;
  locality: string;
  sourceReferences: Array<{ id: string; url: string }>;
  documentedFacts: Array<{ claim: string; qualification?: string | null; sourceReferences?: Array<{ id: string; url: string }> }>;
  requirementCoverage: Array<{ requirement: string; status: string }>;
  contacts?: Array<{ id: string; venueIds: string[]; type: string; value: string; scope: string }>;
  gallery?: { displayPolicy: string; photos: Array<{ imageUrl: string }> } | null;
};
type Discovery = {
  recommendations: Lead[];
  retrievalEvidence: Array<{ venueId: string; entryPaths: string[]; sourceReferenceIds: string[] }>;
  suggestedSetup?: { rooms: string[] };
};

const sourceUrls = new Set([...catalog.sources, ...enrichment.sources].map((source) => source.url));
const venueById = new Map(catalog.venues.map((venue) => [venue.id, venue]));
let calls = 0;

function futureWeekday(offset: number) {
  const date = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  while (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function discover(page: Page, button: "Find suitable venues" | "Refine leads") {
  expect(calls, "bounded to three discovery calls").toBeLessThan(3);
  calls += 1;
  const pending = page.waitForResponse((response) => response.url().includes("/api/venue-discovery") && response.request().method() === "POST", { timeout: 70_000 });
  await page.getByRole("button", { name: button }).click();
  const response = await pending;
  const sentBrief = response.request().postDataJSON().brief;
  expect(response.ok(), `discovery HTTP ${response.status()}`).toBeTruthy();
  const body = (await response.json()) as Discovery;
  await expect(page.locator("#venue-leads")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".recommendation-card")).toHaveCount(body.recommendations.length);
  // Provenance, identity and server-side enrichment checks for every returned lead.
  for (const lead of body.recommendations) {
    const venue = venueById.get(lead.venueId);
    expect(venue, `${lead.venueId} is a reviewed venue`).toBeTruthy();
    expect(lead.locality).toBe(venue!.locality);
    for (const source of [...lead.sourceReferences, ...lead.documentedFacts.flatMap((fact) => fact.sourceReferences || [])]) expect(sourceUrls.has(source.url), source.url).toBe(true);
    for (const contact of lead.contacts || []) expect(contact.venueIds).toContain(lead.venueId);
    const gallery = enrichment.galleries.find((item) => item.venueId === lead.venueId);
    expect((lead.gallery?.photos || []).map((photo) => photo.imageUrl)).toEqual((gallery?.photos || []).map((photo) => photo.imageUrl));
  }
  return { body, sentBrief };
}

const summary = (data: Discovery) => data.recommendations.map((lead) => ({
  venueId: lead.venueId,
  locality: lead.locality,
  sources: lead.sourceReferences.map((source) => source.url),
  contacts: (lead.contacts || []).map((contact) => `${contact.type}:${contact.scope}`),
  photos: lead.gallery?.photos.length ?? 0,
  audience: lead.requirementCoverage.filter((item) => /^Audience:|eligib/i.test(item.requirement)).map((item) => `${item.requirement} → ${item.status}`),
  qualifications: lead.documentedFacts.filter((fact) => fact.qualification).map((fact) => fact.qualification),
}));

function rehearsalLead(venueId: string, brief: { audience: string }) {
  const venue = venueById.get(venueId)!;
  const sources = (ids: string[]) => ids.map((id) => catalog.sources.find((source) => source.id === id)!).map(({ id, title, url, sourceType }) => ({ id, title, url, sourceType }));
  const gallery = enrichment.galleries.find((item) => item.venueId === venueId);
  return {
    venueId, name: venue.name, city: venue.city, locality: venue.locality, relationshipStatus: "research-lead",
    historical: venue.claims.some((claim) => claim.evidenceType === "historical-event"),
    documentedFacts: venue.claims.filter((claim) => !["unknown", "conflicting"].includes(claim.evidenceType)).map((claim) => ({ subject: claim.claimType, claim: claim.claim, value: claim.value, evidenceType: claim.evidenceType, qualification: (claim as { qualification?: string }).qualification || null, sourceReferences: sources(claim.sourceIds) })),
    requirementCoverage: [{ requirement: `Audience: ${brief.audience}`, status: "unknown", evidence: [] }],
    importantUnknowns: [], documentedConflicts: [], sourceReferences: sources(venue.sourceIds), nextStep: "Rehearsal fixture.",
    contacts: enrichment.contacts.filter((contact) => contact.venueIds.includes(venueId)).map((contact) => {
      const source = [...catalog.sources, ...enrichment.sources].find((item) => item.id === contact.sourceId)!;
      return { ...contact, sourceReferences: [{ id: source.id, title: source.title, url: source.url }] };
    }),
    gallery: gallery ? { displayPolicy: gallery.displayPolicy, rightsNote: gallery.rightsNote, checkedAt: gallery.checkedAt, officialGallery: null, photos: gallery.photos.map((photo) => ({ ...photo, id: photo.key, photoDate: null, source: { id: photo.sourceId, title: photo.sourceId, url: sources(venue.sourceIds)[0].url } })) } : null,
  };
}

test("live organizer journey: brief, discovery, setup, sources, contacts, gallery, draft, locality and audience", async ({ page, context }) => {
  test.setTimeout(420_000);
  if (mode === "dry")
    await page.route("**/api/venue-discovery", (route) => {
      const { brief, conversation } = route.request().postDataJSON();
      const latest = conversation.at(-1).content as string;
      const ids = brief.city === "Bengaluru" ? ["venue-shifu-den-bengaluru", "venue-saiacs-ceo-centre-bengaluru"]
        : /Exclude Noida/.test(latest) ? ["venue-ofis-gurugram-sohna-road", "venue-masters-union-gurugram"]
          : ["venue-ofis-noida-sector-62", "venue-ofis-gurugram-sohna-road", "venue-masters-union-gurugram"];
      return route.fulfill({ json: { message: "Rehearsal fixture.", suggestedSetup: { rooms: ["Main space"], reason: "r", equipmentPlacement: "e", assumptions: ["a"] }, recommendations: ids.map((id) => rehearsalLead(id, brief)), retrievalEvidence: [] } });
    });
  const output = ".playwright-artifacts/live-journey";
  mkdirSync(output, { recursive: true });
  const record: Record<string, unknown> = { startedAt: new Date().toISOString() };

  // 1–3. Audience, attendees, requirements and review.
  await page.goto("/organizer");
  await page.getByLabel(/Event name/).fill("Live student build workshop");
  await page.getByLabel("City").selectOption("Delhi NCR");
  await page.getByLabel("Gathering type").selectOption("Workshop");
  await page.locator("#brief-audience").selectOption("Students");
  await page.getByLabel("Community/organization name").fill("Example student coding club");
  await page.getByLabel(/Event date/).fill(futureWeekday(24));
  await page.getByLabel(/Attendees/).fill("0");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel(/Attendees/)).toBeFocused();
  await page.getByLabel(/Attendees/).fill("60");
  await page.getByLabel(/Start time/).fill("10:00");
  await page.getByLabel(/End time/).fill("16:00");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel(/Venue budget/).fill("15000");
  await expect(page.getByLabel("I already know the spaces I need")).not.toBeChecked();
  await page.getByRole("checkbox", { name: "Projector", exact: true }).check();
  await page.getByLabel("Equipment and setup").fill("2 wireless microphones");
  await page.getByRole("checkbox", { name: "Outside-food permission" }).check();
  await page.getByLabel("Nice to have — optional").fill("Parking");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const review = page.locator(".brief-review");
  await expect(review.first()).toContainText("Students; community: Example student coding club");
  await expect(review.nth(1)).toContainText("Projector, 2 wireless microphones");
  await expect(review.nth(1)).toContainText("Outside-food permission");
  await expect(review.nth(1)).toContainText("Parking");

  // 4. Discovery call 1.
  const first = await discover(page, "Find suitable venues");
  expect(first.body.recommendations.length).toBeGreaterThan(0);
  expect(first.body.recommendations.every((lead) => lead.city === "Delhi NCR")).toBe(true);
  expect(first.sentBrief.roomRequirements).toEqual([]);
  expect(first.sentBrief.equipmentRequirements).toEqual(["Projector", "2 wireless microphones"]);
  for (const lead of first.body.recommendations)
    for (const item of lead.requirementCoverage.filter((entry) => entry.requirement.startsWith("Audience:"))) expect(item.status).not.toBe("supported");
  record.call1 = summary(first.body);

  // 5. Suggested setup.
  const setup = page.locator(".suggested-setup");
  await expect(setup.getByRole("heading", { name: "Suggested event setup" })).toBeVisible();
  await expect(setup.locator("ul").first().locator("li")).toHaveCount(first.body.suggestedSetup!.rooms.length);
  record.suggestedSetup = first.body.suggestedSetup;

  // 6. Open an original source.
  const card = page.locator(".recommendation-card").first();
  const sourceLink = card.locator(".recommendation-sources .source-link").first();
  const sourceUrl = await sourceLink.getAttribute("href");
  expect(sourceUrls.has(sourceUrl!)).toBe(true);
  const popupWait = context.waitForEvent("page");
  await sourceLink.click();
  const sourcePage = await popupWait;
  await sourcePage.waitForLoadState("domcontentloaded").catch(() => undefined);
  expect(sourcePage.url().replace(/\/$/, "")).toBe(sourceUrl!.replace(/\/$/, ""));
  record.openedSource = sourceUrl;
  await sourcePage.close();

  // 7. A public contact route, and 8. a gallery, on an Ofis lead when present.
  const ofis = page.locator('.recommendation-card[data-venue-id^="venue-ofis-"]').first();
  if (await ofis.count()) {
    await expect(ofis.getByRole("link", { name: "+91 82879 91481" })).toHaveAttribute("href", "tel:+918287991481");
    await expect(ofis.locator(".contact-routes")).toContainText("Organization-wide");
    await ofis.getByRole("button", { name: /View photos/ }).click();
    const gallery = page.getByRole("dialog", { name: /^Photos — Ofis Square/ });
    await expect(gallery.locator(".gallery-frame img")).toBeVisible();
    await expect.poll(() => gallery.locator(".gallery-frame img").evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await gallery.getByRole("button", { name: "Next photo" }).click();
    await page.keyboard.press("Escape");
    record.contactAndGallery = "Ofis lead: tel route, organization-wide label, gallery image loaded from the official host";
  } else record.contactAndGallery = "No Ofis lead returned; contact and gallery steps not exercised on a live lead";

  // Discovery call 2: locality refinement keeps the exact brief snapshot and excludes Noida.
  await page.getByLabel("Ask a follow-up question").fill("Exclude Noida; show only Gurugram.");
  const second = await discover(page, "Refine leads");
  expect(second.sentBrief).toEqual(first.sentBrief);
  for (const lead of second.body.recommendations) {
    expect(lead.venueId).not.toMatch(/noida/);
    expect(lead.locality).not.toMatch(/Noida/);
  }
  record.call2 = summary(second.body);

  // 9. Create and restore a private research draft from a Gurugram lead.
  const gurugram = page.locator(".recommendation-card").first();
  const draftVenue = await gurugram.getAttribute("data-venue-id");
  if (draftVenue) {
    await gurugram.getByRole("button", { name: "Create private draft" }).click();
    await expect(page.getByLabel("Potential host")).toHaveValue(new RegExp(`${draftVenue}$`));
    await page.getByLabel("Organizer name").fill("Live journey organizer");
    await page.getByLabel("Email", { exact: true }).fill("journey@example.test");
    await page.getByLabel(/I have reviewed the brief snapshot/).check();
    await page.getByRole("button", { name: "Save application draft" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Application draft saved" })).toBeVisible({ timeout: 30_000 });
    await page.reload();
    const restored = page.locator(".application-card").filter({ hasText: "Live journey organizer" });
    await restored.getByText("View application details", { exact: true }).click();
    await expect(restored).toContainText("DRAFT ONLY");
    await expect(restored).toContainText("Resolved from published Sanity records");
    const reviewedContacts = enrichment.contacts.filter((contact) => contact.venueIds.includes(draftVenue));
    if (reviewedContacts.length) await expect(restored.locator(".contact-routes li")).toHaveCount(reviewedContacts.length);
    else await expect(restored).toContainText("No public event-enquiry route was found");
    record.draft = { venueId: draftVenue, restoredContacts: reviewedContacts.length };
  } else record.draft = "No Gurugram lead was returned; draft step not exercised";

  // Discovery call 3: a Bengaluru student brief must not inherit founder-community eligibility.
  await page.goto("/organizer?view=brief&step=1");
  await page.getByLabel(/Event name/).fill("Live student community meetup");
  await page.getByLabel("City").selectOption("Bengaluru");
  await page.getByLabel("Gathering type").selectOption("Community meetup");
  await page.getByLabel(/Attendees/).fill("25");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel(/Essential requirements/).fill("Outside-food permission, Explore pro-bono access and founder-community eligibility");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const third = await discover(page, "Find suitable venues");
  expect(third.body.recommendations.every((lead) => lead.city === "Bengaluru")).toBe(true);
  const shifu = third.body.recommendations.find((lead) => lead.venueId === "venue-shifu-den-bengaluru");
  if (shifu) {
    for (const item of shifu.requirementCoverage.filter((entry) => /^Audience:|eligib/i.test(entry.requirement))) expect(item.status, item.requirement).not.toBe("supported");
    await expect(page.locator('.recommendation-card[data-venue-id="venue-shifu-den-bengaluru"]')).toContainText(/founder/i);
  }
  record.call3 = summary(third.body);
  record.discoveryCalls = calls;
  record.finishedAt = new Date().toISOString();
  writeFileSync(join(output, "live-journey.json"), JSON.stringify(record, null, 2));
  await page.screenshot({ path: join(output, "bengaluru-students-1440.png"), fullPage: true });
});
