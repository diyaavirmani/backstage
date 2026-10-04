import { test, expect, type Page } from "@playwright/test";

const artifacts = ".playwright-artifacts/product-improvements";
const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test("catalog shows evidence first, direct sources and venue-scoped contact routes", async ({
  page,
}) => {
  await page.goto("/venues");
  // The catalog is either published Sanity content or the explicitly labelled reviewed preview.
  await expect(
    page.getByText(/Published Sanity content|Local research preview/),
  ).toBeVisible();
  const noida = page.locator('[data-venue-id="venue-ofis-noida-sector-62"]');
  const gurugram = page.locator(
    '[data-venue-id="venue-ofis-gurugram-sohna-road"]',
  );
  for (const card of [noida, gurugram]) {
    await expect(
      card.getByRole("heading", { name: "Why consider this venue" }),
    ).toBeVisible();
    await expect(
      card.getByRole("link", { name: /Official hosting information/ }),
    ).toHaveAttribute("href", "https://ofissquare.com/events-spaces/");
    await expect(
      card.getByRole("link", { name: "+91 82879 91481", exact: true }),
    ).toHaveAttribute("href", "tel:+918287991481");
    await expect(card.locator(".contact-routes li").filter({ hasText: "82879" })).toContainText(
      "Organization-wide",
    );
    await expect(card).toContainText("not verified as active");
  }
  await expect(noida.locator(".venue-locality")).toContainText("Sector 62");
  await expect(gurugram.locator(".venue-locality")).toContainText("Sohna Road");
  await expect(
    noida.getByRole("link", { name: "hello@ofissquare.com" }),
  ).toHaveAttribute("href", "mailto:hello@ofissquare.com");
  await expect(
    noida.locator(".contact-routes li").filter({ hasText: "hello@ofissquare.com" }),
  ).toContainText("This venue");
  await expect(gurugram).not.toContainText("hello@ofissquare.com");
  await expect(noida.getByRole("link", { name: /Venue facilities/ })).toHaveCount(0);

  const saiacs = page.locator(
    '[data-venue-id="venue-saiacs-ceo-centre-bengaluru"]',
  );
  await expect(
    saiacs.getByRole("link", { name: "ceoenquiry@saiacs-ceocenter.com" }),
  ).toHaveAttribute("href", "mailto:ceoenquiry@saiacs-ceocenter.com");
  await expect(
    saiacs.getByRole("link", { name: "+91 96060 08031", exact: true }),
  ).toHaveAttribute("href", "tel:+919606008031");

  const masters = page.locator('[data-venue-id="venue-masters-union-gurugram"]');
  await expect(
    masters.getByRole("link", { name: /Enquiry form on mastersunion.org/ }),
  ).toHaveAttribute("href", "https://mastersunion.org/for-companies");
  await expect(masters).not.toContainText(/admissions@/i);

  const shifu = page.locator('[data-venue-id="venue-shifu-den-bengaluru"]');
  await expect(
    shifu.getByRole("link", { name: /Enquiry form on den.shifuventures.com/ }),
  ).toHaveAttribute("href", "https://den.shifuventures.com/events");
  await expect(shifu.locator('a[href^="tel:"]')).toHaveCount(0);

  const paytm = page.locator('[data-venue-id="venue-paytm-office-noida"]');
  await expect(paytm).toContainText("Past event evidence");
  await expect(paytm.locator(".evidence-highlights")).toContainText(
    "Historical event · 12 Sep 2026",
  );
  await expect(
    paytm.getByRole("link", { name: /Previous event listing/ }),
  ).toHaveAttribute("href", /gdg\.community\.dev\/events\/details\//);
  await expect(paytm).toContainText(
    "No public event-enquiry route was found in the reviewed sources",
  );
  await expect(paytm.locator('a[href^="tel:"], a[href^="mailto:"]')).toHaveCount(0);

  // External links never carry an opener reference.
  for (const link of await page.locator('a[target="_blank"]').all())
    expect(await link.getAttribute("rel")).toContain("noreferrer");

  await noida.getByRole("button", { name: "View evidence" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Public enquiry routes" })).toBeVisible();
  await expect(dialog).toContainText("does not confirm capacity, eligibility");
  await page.keyboard.press("Escape");

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    expect(await noOverflow(page)).toBe(true);
    await page.screenshot({
      path: `${artifacts}/evidence-catalog-${width}.png`,
      fullPage: width !== 1440,
    });
  }
  await page.reload();
  await expect(
    noida.getByRole("link", { name: "+91 82879 91481", exact: true }),
  ).toBeVisible();
});

const source = (id: string, title: string, url: string, sourceType = "official-page") => ({
  id,
  title,
  url,
  sourceType,
});
const ofisEvents = source(
  "source-ofis-events",
  "Book Corporate Event Spaces in Noida & Gurgaon",
  "https://ofissquare.com/events-spaces/",
);
const salesContact = {
  id: "contact-ofis-sales-phone",
  venueIds: ["venue-ofis-gurugram-sohna-road", "venue-ofis-noida-sector-62"],
  type: "phone",
  value: "+918287991481",
  purpose: "Labelled “Sales” on the official contact page; not specific to events or to one branch.",
  scope: "organization-wide",
  checkedAt: "2026-10-05",
  sourceReferences: [
    source("source-ofis-contact", "Ofis Square contact page", "https://ofissquare.com/contact-us/"),
  ],
};

test("recommendations put evidence first and prepare an editable, unsent enquiry", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const apiCalls: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) apiCalls.push(request.url());
  });
  // Deterministic UI fixture, not real provider verification. Contacts mirror server-resolved records.
  await page.route("**/api/venue-discovery", (route) =>
    route.fulfill({
      json: {
        message: "Deterministic evidence fixture.",
        recommendations: [
          {
            venueId: "venue-ofis-noida-sector-62",
            name: "Ofis Square — Sector 62, Noida",
            city: "Delhi NCR",
            locality: "Sector 62, Noida",
            relationshipStatus: "research-lead",
            historical: false,
            documentedFacts: [
              {
                subject: "equipment",
                claim: "AV systems and display screens are described",
                value: "Exact inventory is unknown.",
                evidenceType: "public-documentation",
                checkedAt: "2026-10-02",
                sourceReferences: [ofisEvents],
              },
              {
                subject: "hosting-conditions",
                claim: "Auditorium and theatre space for seminars and workshops",
                value: "Publicly described event spaces.",
                evidenceType: "public-documentation",
                checkedAt: "2026-10-02",
                sourceReferences: [ofisEvents],
              },
            ],
            requirementCoverage: [
              { requirement: "Projector", status: "unknown", evidence: [] },
              { requirement: "Capacity for 80 guests", status: "unknown", evidence: [] },
            ],
            importantUnknowns: [
              {
                claim: "Attendee capacity for the auditorium by layout.",
                value: "Unknown",
                evidenceType: "unknown",
              },
            ],
            documentedConflicts: [],
            sourceReferences: [{ id: ofisEvents.id, title: ofisEvents.title, url: ofisEvents.url }],
            contacts: [salesContact],
            nextStep: "Ask the host to confirm availability.",
          },
          {
            venueId: "venue-paytm-office-noida",
            name: "Paytm Office, Noida (historical event location)",
            city: "Delhi NCR",
            locality: "Noida",
            relationshipStatus: "research-lead",
            historical: true,
            documentedFacts: [
              {
                subject: "historical-event",
                claim: "The listing names Paytm Office, Noida as the venue for Thinkfluence 2026.",
                value: "Past event only.",
                evidenceType: "historical-event",
                historicalDate: "2026-09-12",
                sourceReferences: [
                  source(
                    "source-gdg-thinkfluence-paytm",
                    "Thinkfluence — GDG Cloud Noida event listing",
                    "https://gdg.community.dev/events/details/google-gdg-cloud-noida-presents-thinkfluence/",
                    "historical-event-listing",
                  ),
                ],
              },
            ],
            requirementCoverage: [],
            importantUnknowns: [
              { claim: "Current availability.", value: "Unknown", evidenceType: "unknown" },
            ],
            documentedConflicts: [],
            sourceReferences: [
              {
                id: "source-gdg-thinkfluence-paytm",
                title: "Thinkfluence — GDG Cloud Noida event listing",
                url: "https://gdg.community.dev/events/details/google-gdg-cloud-noida-presents-thinkfluence/",
              },
            ],
            contacts: [],
            nextStep: "Find a current host contact.",
          },
        ],
      },
    }),
  );
  await page.goto("/organizer");
  await page.getByLabel("Try an example").selectOption("delhi-hackathon");
  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Find suitable venues" }).click();

  const cards = page.locator(".recommendation-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toHaveAttribute("data-venue-id", "venue-ofis-noida-sector-62");
  const noida = cards.nth(0);
  const highlights = noida.locator(".evidence-highlights li");
  await expect(highlights.first()).toContainText("Auditorium and theatre space");
  await expect(highlights.nth(1)).toContainText("AV systems");
  await expect(
    noida.getByRole("link", { name: /Official hosting information/ }),
  ).toHaveAttribute("href", "https://ofissquare.com/events-spaces/");
  await expect(noida.locator(".lead-unknowns li").first()).toContainText(
    "Attendee capacity for the auditorium by layout",
  );
  await expect(noida.getByRole("link", { name: "+91 82879 91481" })).toHaveAttribute(
    "href",
    "tel:+918287991481",
  );
  const paytm = cards.nth(1);
  await expect(paytm.locator(".historical-note")).toContainText(
    "does not establish current availability, booking permission, or a Backstage partnership",
  );
  await expect(paytm).toContainText("Historical event · 12 Sep 2026");
  await expect(paytm.getByRole("link", { name: /Previous event listing/ })).toBeVisible();
  await expect(paytm).toContainText("No public event-enquiry route was found");

  const prepare = noida.getByRole("button", { name: "Prepare enquiry" });
  await prepare.click();
  const dialog = page.getByRole("dialog", { name: /Enquiry for Ofis Square — Sector 62/ });
  await expect(dialog).toBeVisible();
  const text = dialog.getByLabel("Editable enquiry");
  await expect(text).toHaveValue(/“Delhi NCR community hackathon”/);
  await expect(text).toHaveValue(/- Attendee capacity for the auditorium by layout/);
  await expect(text).toHaveValue(/not a booking request or confirmation/);
  await text.press("End");
  await text.pressSequentially("\nOrganizer note added in the browser.");
  const callsBeforeCopy = apiCalls.length;
  await dialog.getByRole("button", { name: "Copy enquiry" }).click();
  await expect(dialog.getByRole("status")).toContainText("Nothing was sent");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Organizer note added in the browser.",
  );
  expect(apiCalls.length, "copying makes no request").toBe(callsBeforeCopy);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await noOverflow(page)).toBe(true);
  await page.screenshot({ path: `${artifacts}/enquiry-390.png` });
  await page.keyboard.press("Escape");
  await expect(prepare).toBeFocused();
  await prepare.click();
  await expect(page.getByLabel("Editable enquiry")).toHaveValue(
    /Organizer note added in the browser/,
  );
  await page.getByRole("button", { name: "Reset text" }).click();
  await expect(page.getByLabel("Editable enquiry")).not.toHaveValue(/Organizer note/);
  await page.keyboard.press("Escape");
  await page.screenshot({ path: `${artifacts}/evidence-lead-390.png`, fullPage: true });
});

test("a saved research draft keeps its server-resolved contacts and enquiry", async ({ page }) => {
  // Overview fixture: the draft payload mirrors what the server stores from published evidence.
  await page.route("**/api/operations**", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch();
    const fresh = (await response.json()) as { applications: unknown[] };
    await route.fulfill({
      response,
      json: {
        ...fresh,
        applications: [
          {
            id: "fixture-saiacs-draft",
            idempotency_key: "fixture",
            status: "draft",
            venue_id: "fixture:venue-saiacs-ceo-centre-bengaluru",
            venue_name: "SAIACS CEO Centre",
            city: "Bengaluru",
            locality: "North Bengaluru",
            kind: "research",
            payload: {
              organizer: { name: "Fixture Organizer", email: "fixture@example.test", phone: "", organization: "" },
              resources: [],
              questions: ["Current availability and permitted dates"],
              flexibleSlot: null,
              sources: [{ id: "source-saiacs-ceo-centre", title: "SAIACS CEO Centre", url: "https://saiacs-ceocenter.com/" }],
              evidence: [],
              summary: "Fixture summary",
              venueKind: "research",
              contacts: [
                {
                  id: "contact-saiacs-events-email",
                  venueIds: ["venue-saiacs-ceo-centre-bengaluru"],
                  type: "email",
                  value: "ceoenquiry@saiacs-ceocenter.com",
                  purpose: "Booking requests and event requirements.",
                  scope: "venue-specific",
                  checkedAt: "2026-10-05",
                  sourceReferences: [
                    source("source-saiacs-contact", "Contact SAIACS CEO Centre", "https://saiacs-ceocenter.com/contact-hotel-in-bengaluru.html"),
                  ],
                },
              ],
            },
            brief: {
              id: "fixture-brief",
              title: "Bengaluru founder gathering",
              city: "Bengaluru",
              eventType: "Community meetup",
              audience: "Founders",
              date: "2026-11-02",
              startTime: "17:00",
              endTime: "20:00",
              headcount: 28,
              budgetAmount: 0,
              currency: "INR",
              roomRequirements: [],
              equipmentRequirements: ["Projector"],
              essentialRequirements: [],
              flexibleRequirements: [],
              setupMinutes: 30,
              cleanupMinutes: 30,
              savedAt: "2026-10-05T00:00:00Z",
            },
            acceptedBrief: null,
            proposed: null,
            history: [],
            checklist: [],
          },
          ...fresh.applications,
        ],
      },
    });
  });
  await page.goto("/organizer?view=drafts");
  const card = page.locator(".application-card").filter({ hasText: "Fixture Organizer" });
  const details = card.locator("details.request-details");
  if ((await details.getAttribute("open")) === null)
    await details.getByText("View application details", { exact: true }).click();
  await expect(card.getByRole("link", { name: "ceoenquiry@saiacs-ceocenter.com" })).toHaveAttribute(
    "href",
    "mailto:ceoenquiry@saiacs-ceocenter.com",
  );
  await card.getByRole("button", { name: "Prepare enquiry" }).click();
  await expect(page.getByLabel("Editable enquiry")).toHaveValue(/“Bengaluru founder gathering”/);
  await expect(page.getByLabel("Editable enquiry")).toHaveValue(/Current availability and permitted dates/);
  await page.keyboard.press("Escape");
});
