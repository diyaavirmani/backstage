import { expect, test, type Page } from "@playwright/test";

type Lead = {
  venueId: string;
  city: string;
  locality: string;
  sourceReferences: Array<{ id: string; title: string; url: string }>;
};
const sharedOfisSource = {
  id: "source-ofis-events",
  title: "Ofis Square event spaces in Noida and Gurugram",
  url: "https://ofissquare.com/events-spaces/",
};
function isGurugramOnly(leads: Lead[]) {
  return (
    leads.length > 0 &&
    leads.every(
      (lead) =>
        lead.city === "Delhi NCR" &&
        /Gurugram|Gurgaon/i.test(lead.locality) &&
        !/(^|[,\s])Noida([,\s]|$)/i.test(lead.locality) &&
        lead.venueId !== "venue-ofis-noida-sector-62",
    )
  );
}
function fixture(locality: "Gurugram" | "Noida"): Lead {
  return {
    venueId:
      locality === "Gurugram"
        ? "venue-ofis-gurugram-sohna-road"
        : "venue-ofis-noida-sector-62",
    city: "Delhi NCR",
    locality:
      locality === "Gurugram" ? "Sohna Road, Gurugram" : "Sector 62, Noida",
    sourceReferences: [sharedOfisSource],
  };
}
async function search(
  page: Page,
  button: "Find suitable venues" | "Refine leads",
) {
  const pending = page.waitForResponse(
    (response) =>
      response.url().includes("/api/venue-discovery") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: button }).click();
  const response = await pending;
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { recommendations: Lead[] };
}

test("Gurugram Ofis stays distinct when its shared source title names Noida (deterministic fixture)", async ({
  page,
}) => {
  let locality: "Gurugram" | "Noida" = "Gurugram";
  await page.route("**/api/venue-discovery", async (route) => {
    const lead = fixture(locality);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Explicit deterministic UI fixture; no provider call.",
        recommendations: [
          {
            ...lead,
            name: "Ofis Square",
            relationshipStatus: "research-lead",
            historical: false,
            documentedFacts: [],
            importantUnknowns: [],
            documentedConflicts: [],
            requirementCoverage: [
              {
                requirement: "Current availability",
                status: "unknown",
                evidence: [],
              },
            ],
            sourceReferences: lead.sourceReferences,
            nextStep: "Ask the venue about fit.",
          },
        ],
        retrievalEvidence: [
          {
            venueId: lead.venueId,
            entryPaths: [
              locality === "Gurugram"
                ? "venues/delhi_ncr/ofis_square_gurugram"
                : "venues/delhi_ncr/ofis_square_noida",
            ],
            sourceReferenceIds: ["source-ofis-events"],
          },
        ],
      }),
    });
  });
  await page.goto("/organizer");
  await page.getByLabel(/Event name/).fill("Locality fixture event");
  await page.getByLabel("City").selectOption("Delhi NCR");
  await page.getByLabel("Gathering type").selectOption({ label: "Workshop" });
  await page.locator("#brief-audience").selectOption("Other");
  await page
    .getByLabel(/Audience or community/)
    .fill("Local community members");
  await page.getByLabel(/Event date/).fill(futureWeekday());
  await page.getByLabel(/Attendees/).fill("20");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel(/Venue budget/).fill("10000");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const gurugramData = await search(page, "Find suitable venues");
  expect(gurugramData.recommendations).toHaveLength(1);
  expect(gurugramData.recommendations[0].venueId).toBe(
    "venue-ofis-gurugram-sohna-road",
  );
  expect(isGurugramOnly(gurugramData.recommendations)).toBe(true);
  const gurugramCard = page.locator(".recommendation-card").first();
  await expect(gurugramCard.locator(".venue-locality")).toHaveText(
    "Sohna Road, Gurugram",
  );
  await expect(
    gurugramCard.getByRole("link", { name: /Noida and Gurugram/ }),
  ).toHaveAttribute("href", sharedOfisSource.url);

  locality = "Noida";
  await page
    .locator("#venue-followup")
    .fill("Exclude Noida; show only Gurugram-locality leads.");
  const noidaData = await search(page, "Refine leads");
  expect(noidaData.recommendations).toHaveLength(1);
  expect(noidaData.recommendations[0].venueId).toBe(
    "venue-ofis-noida-sector-62",
  );
  expect(isGurugramOnly(noidaData.recommendations)).toBe(false);
  await expect(
    page.locator(".recommendation-card").first().locator(".venue-locality"),
  ).toHaveText("Sector 62, Noida");
});

function futureWeekday() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  while (date.getDay() === 0) date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}
