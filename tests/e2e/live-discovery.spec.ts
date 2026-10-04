import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const enabled = process.env.BACKSTAGE_LIVE_BROWSER === "1";
test.skip(
  !enabled,
  "Opt in with BACKSTAGE_LIVE_BROWSER=1 and server-side OpenAI/Sanity credentials.",
);

type Recommendation = {
  venueId: string;
  name: string;
  city: string;
  locality: string;
  historical: boolean;
  sourceReferences: Array<{ id: string; title: string; url: string }>;
  documentedFacts: Array<{
    claim: string;
    value: string;
    qualification: string | null;
    evidenceType: string;
  }>;
  importantUnknowns: Array<{ claim: string; value: string }>;
  requirementCoverage: Array<{
    requirement: string;
    status: string;
    evidence?: Array<{
      claim: string;
      value: string;
      qualification?: string | null;
    }>;
  }>;
};
type DiscoveryResponse = {
  recommendations: Recommendation[];
  retrievalEvidence: Array<{
    venueId: string;
    entryPaths: string[];
    sourceReferenceIds: string[];
  }>;
};

function futureWeekday(offset: number) {
  const date = new Date(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()) + "T12:00:00Z",
  );
  date.setUTCDate(date.getUTCDate() + offset);
  while (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function discover(
  page: Page,
  buttonName: "Find suitable venues" | "Refine leads",
): Promise<DiscoveryResponse> {
  // Install the wait before clicking. Do not begin another interaction until this response is parsed.
  const pending = page.waitForResponse(
    (response) =>
      response.url().includes("/api/venue-discovery") &&
      response.request().method() === "POST",
    { timeout: 65_000 },
  );
  await page.getByRole("button", { name: buttonName }).click();
  const response = await pending;
  expect(response.ok(), `discovery HTTP ${response.status()}`).toBeTruthy();
  const body = (await response.json()) as Partial<DiscoveryResponse>;
  expect(Array.isArray(body.recommendations)).toBeTruthy();
  expect(Array.isArray(body.retrievalEvidence)).toBeTruthy();
  await expect(page.locator("#venue-leads")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator(".recommendation-card")).toHaveCount(
    body.recommendations!.length,
  );
  for (const lead of body.recommendations!)
    await expect(
      page.locator(
        `.recommendation-card[data-venue-id="${lead.venueId}"] .venue-locality`,
      ),
    ).toHaveText(lead.locality);
  return body as DiscoveryResponse;
}

function evidenceRecord(data: DiscoveryResponse, request: number) {
  return {
    request,
    recommendations: data.recommendations.map((item) => ({
      venueId: item.venueId,
      city: item.city,
      locality: item.locality,
      historical: item.historical,
      sources: item.sourceReferences.map((source) => ({
        id: source.id,
        url: source.url,
      })),
      qualifications: [
        ...item.documentedFacts,
        ...item.requirementCoverage.flatMap(
          (requirement) => requirement.evidence || [],
        ),
      ]
        .filter((fact) => fact.qualification)
        .map((fact) => ({
          claim: fact.claim,
          qualification: fact.qualification,
        })),
      unknowns: item.importantUnknowns.map((item) => item.claim),
      statuses: Object.fromEntries(
        item.requirementCoverage.map((requirement) => [
          requirement.requirement,
          requirement.status,
        ]),
      ),
    })),
    reads: data.retrievalEvidence.map((item) => ({
      venueId: item.venueId,
      paths: item.entryPaths,
      sourceReferenceIds: item.sourceReferenceIds,
    })),
  };
}

test("live Sanity/OpenAI discovery, follow-up, source link, and research draft", async ({
  page,
}) => {
  test.setTimeout(360_000);
  const discoveryEvidence: ReturnType<typeof evidenceRecord>[] = [];
  const submittedBriefs: unknown[] = [];
  const output =
    process.env.PLAYWRIGHT_ARTIFACT_DIR ||
    ".playwright-artifacts/live-verification";
  mkdirSync(output, { recursive: true });
  const record = (data: DiscoveryResponse) => {
    discoveryEvidence.push(evidenceRecord(data, discoveryEvidence.length + 1));
    writeFileSync(
      join(output, "live-agent-matrix-evidence.json"),
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          knowledgeBaseId: "kbPFAVeDOOjD",
          discoveryRequests: discoveryEvidence,
        },
        null,
        2,
      ),
    );
  };
  page.on("request", (request) => {
    if (
      request.url().includes("/api/venue-discovery") &&
      request.method() === "POST"
    ) {
      try {
        submittedBriefs.push(request.postDataJSON().brief);
      } catch {
        /* Assertions report a missing captured brief. */
      }
    }
  });

  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto("/venues");
  await expect(page.getByText("Published Sanity content")).toBeVisible();
  await expect(page.locator(".venue-card")).toHaveCount(6);
  await expect(page.getByLabel("Filter by city")).toBeVisible();
  await page.getByLabel("Filter by city").selectOption("Delhi NCR");
  await expect(page.locator(".venue-card")).toHaveCount(4);
  await expect(
    page.locator(".venue-card").filter({ hasText: "Ofis Square" }),
  ).toHaveCount(2);
  await page.getByLabel("Filter by city").selectOption("Bengaluru");
  await expect(page.locator(".venue-card")).toHaveCount(2);
  await page.getByLabel("Filter by city").selectOption("All cities");
  await page.goto("/organizer");
  await page.getByLabel(/Event name/).fill("Live founder community gathering");
  await page.getByLabel("City").selectOption({ label: "Bengaluru" });
  await page
    .getByLabel("Gathering type")
    .selectOption({ label: "Community meetup" });
  await page.locator("#brief-audience").selectOption("Other");
  await page
    .getByLabel(/Audience or community/)
    .fill("Bengaluru founders and startup operators");
  await page.getByLabel(/Event date/).fill(futureWeekday(21));
  await page.getByLabel(/Attendees/).fill("24");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel(/Venue budget/).fill("0");
  await page.getByLabel("I already know the spaces I need").check();
  await page.getByLabel("Required rooms or areas").fill("Gathering room");
  await page.getByLabel("Equipment and setup").fill("Projector");
  await page
    .getByLabel(/Essential requirements/)
    .fill("Explore pro-bono access and founder eligibility");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Save event brief" }).click();

  const founderDiscovery = await discover(page, "Find suitable venues");
  record(founderDiscovery);
  await expect(page.locator(".recommendation-card").first()).toBeVisible({
    timeout: 45_000,
  });
  const shifu = page
    .locator(".recommendation-card")
    .filter({ hasText: "Shifu Den" });
  await expect(shifu).toBeVisible();
  await expect(shifu).toContainText(/founder|community|eligible/i);
  const shifuRecommendation = founderDiscovery.recommendations.find(
    (item) => item.venueId === "venue-shifu-den-bengaluru",
  );
  expect(shifuRecommendation).toBeTruthy();
  expect(
    shifuRecommendation!.sourceReferences.map((source) => source.url),
  ).toContain("https://den.shifuventures.com/");
  await expect(shifu).toContainText(
    /pro bono\/free for its founder community/i,
  );
  await expect(shifu).toContainText(
    /does not confirm Backstage access or other organizer eligibility/i,
  );
  expect(
    shifuRecommendation!.requirementCoverage.some(
      (item) => item.status === "unknown",
    ),
  ).toBeTruthy();

  await page
    .locator("#venue-followup")
    .fill(
      "Please narrow this to what the sources say about pro-bono access for Bengaluru founders, and what eligibility remains unconfirmed.",
    );
  const founderFollowup = await discover(page, "Refine leads");
  record(founderFollowup);
  await expect(shifu).toBeVisible({ timeout: 45_000 });
  await expect(shifu).toContainText(/founder|community/i);
  expect(
    founderFollowup.retrievalEvidence.some(
      (item) =>
        item.venueId === "venue-shifu-den-bengaluru" &&
        item.entryPaths.length > 0 &&
        item.sourceReferenceIds.length > 0,
    ),
  ).toBeTruthy();
  const recommendationCount = await page
    .locator(".recommendation-card")
    .count();
  const sourceLink = shifu.getByRole("link").first();
  const sourceUrl = await sourceLink.getAttribute("href");
  expect(sourceUrl).toBe("https://den.shifuventures.com/");
  const popupWait = page.waitForEvent("popup");
  await sourceLink.click();
  const sourcePage = await popupWait;
  await expect(sourcePage).toHaveURL(sourceUrl!);
  await sourcePage.close();
  await shifu.getByRole("button", { name: "Create private draft" }).click();
  await expect(page.getByLabel("Potential host")).toHaveValue(
    /venue-shifu-den-bengaluru$/,
  );
  await expect(page.getByLabel("Event title", { exact: true })).toHaveValue(
    "Live founder community gathering",
  );
  await page.getByLabel("Organizer name").fill("Live browser walkthrough");
  await page
    .getByLabel("Email", { exact: true })
    .fill("walkthrough@example.test");
  await page.getByLabel(/I have reviewed the brief snapshot/).check();
  await page.getByRole("button", { name: "Save application draft" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Application draft saved" }),
  ).toBeVisible({ timeout: 30_000 });
  const card = page
    .locator(".application-card")
    .filter({ hasText: "Live browser walkthrough" });
  await card.getByText("View application details", { exact: true }).click();
  await expect(card).toContainText("DRAFT ONLY");
  await expect(card).toContainText(
    /evidence saved from published Sanity|Evidence saved with the draft/i,
  );
  await expect(card.getByRole("link").first()).toHaveAttribute(
    "href",
    sourceUrl!,
  );
  await page.reload();
  const restored = page
    .locator(".application-card")
    .filter({ hasText: "Live browser walkthrough" });
  await restored.getByText("View application details", { exact: true }).click();
  await expect(restored).toContainText("DRAFT ONLY");
  await expect(restored).toContainText("Discovery brief snapshot");
  await expect(restored).toContainText(
    "Resolved from published Sanity records",
  );
  await expect(restored.getByRole("link").first()).toHaveAttribute(
    "href",
    sourceUrl!,
  );
  const shifuRead = founderDiscovery.retrievalEvidence.find(
    (item) => item.venueId === "venue-shifu-den-bengaluru",
  );
  expect(
    shifuRead &&
      shifuRead.entryPaths.length > 0 &&
      shifuRead.sourceReferenceIds.length > 0,
  ).toBeTruthy();
  writeFileSync(
    join(output, "live-context-evidence.json"),
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        knowledgeBaseId: "kbPFAVeDOOjD",
        city: "Bengaluru",
        venueId: "venue-shifu-den-bengaluru",
        entryPaths: shifuRead!.entryPaths,
        sourceReferenceIds: shifuRead!.sourceReferenceIds,
        sourceUrl,
        recommendationCount,
      },
      null,
      2,
    ),
  );

  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto("/organizer");
  await page.getByLabel("Try an example").selectOption("delhi-hackathon");
  await page.getByRole("button", { name: "Load example" }).click();
  await expect(page.getByLabel(/Attendees/)).toHaveValue("80");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const hackathonDiscovery = await discover(page, "Find suitable venues");
  record(hackathonDiscovery);
  await expect(page.locator(".recommendation-card").first()).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.locator(".recommendation-card").first()).toContainText(
    /Delhi NCR/,
  );
  await page
    .locator("#venue-followup")
    .fill(
      "Show only leads whose documented locality is Noida. Keep the 80-person hackathon brief and all requirements unchanged.",
    );
  const noidaDiscovery = await discover(page, "Refine leads");
  record(noidaDiscovery);
  await expect(page.locator(".recommendation-card").first()).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.locator(".venue-locality").first()).toContainText(/Noida/i);
  await page
    .locator("#venue-followup")
    .fill(
      "Exclude Noida; show only Gurugram-locality leads. Keep my 80-person hackathon brief and all requirements unchanged.",
    );
  const gurugramDiscovery = await discover(page, "Refine leads");
  record(gurugramDiscovery);
  await expect(page.locator(".recommendation-card").first()).toBeVisible({
    timeout: 45_000,
  });

  expect(discoveryEvidence).toHaveLength(5);
  expect(submittedBriefs).toHaveLength(5);
  expect(submittedBriefs[4]).toEqual(submittedBriefs[2]);
  const hackathonResult = discoveryEvidence[2]!.recommendations;
  expect(hackathonResult.length).toBeGreaterThan(0);
  expect(
    hackathonResult.every(
      (item) => item.city === "Delhi NCR" && item.sources.length > 0,
    ),
  ).toBeTruthy();
  const coverage = hackathonResult.flatMap((item) =>
    Object.entries(item.statuses),
  );
  for (const pattern of [
    /Capacity for 80/i,
    /breakout/i,
    /Projector|equipment/i,
    /Event date .*time/i,
    /Budget of INR/i,
  ])
    expect(
      coverage.some(
        ([requirement, status]) =>
          pattern.test(requirement) && status === "unknown",
      ),
    ).toBeTruthy();
  expect(discoveryEvidence[3]!.recommendations.length).toBeGreaterThan(0);
  expect(
    discoveryEvidence[3]!.recommendations.every((item) =>
      /Noida/i.test(item.locality),
    ),
  ).toBeTruthy();
  expect(
    discoveryEvidence[3]!.recommendations.every(
      (item) => !item.historical || item.venueId === "venue-paytm-office-noida",
    ),
  ).toBeTruthy();
  expect(discoveryEvidence[4]!.recommendations.length).toBeGreaterThan(0);
  expect(
    discoveryEvidence[4]!.recommendations.every(
      (item) =>
        /Gurugram|Gurgaon/i.test(item.locality) && item.city === "Delhi NCR",
    ),
  ).toBeTruthy();
  expect(
    discoveryEvidence[4]!.recommendations.some(
      (item) =>
        item.venueId === "venue-ofis-noida-sector-62" ||
        /\bNoida\b/i.test(item.locality),
    ),
  ).toBeFalsy();
  expect(
    discoveryEvidence[4]!.reads.every((item) =>
      item.paths.every(
        (path) =>
          !path.includes("ofis_square_noida") &&
          !path.includes("paytm_office_noida"),
      ),
    ),
  ).toBeTruthy();
  const gurugramCards = page.locator(".recommendation-card");
  await expect(gurugramCards).toHaveCount(
    discoveryEvidence[4]!.recommendations.length,
  );
  await expect(gurugramCards.first().locator(".venue-locality")).toContainText(
    /Gurugram|Gurgaon/i,
  );
  await expect(
    gurugramCards.locator(".venue-locality").filter({ hasText: /Noida/i }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "organizer views" })
    .getByRole("link", { name: "Event brief" })
    .click();
  await page.getByRole("link", { name: "Edit event details" }).click();
  await expect(page.getByLabel("City")).toHaveValue("Delhi NCR");
  await expect(page.getByLabel(/Attendees/)).toHaveValue("80");
  await page.setViewportSize({ width: 390, height: 844 });
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
  await page.screenshot({
    path: join(output, "live-discovery-mobile.png"),
    fullPage: true,
  });
});
