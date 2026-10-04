import { expect, test } from "@playwright/test";

const brief = {
  id: "compatible-saved-brief",
  title: "Recovered founder brief",
  city: "Bengaluru",
  eventType: "Community meetup",
  audience: "Founder community",
  date: "2026-12-10",
  startTime: "17:00",
  endTime: "19:00",
  headcount: 28,
  budgetAmount: 0,
  currency: "INR",
  roomRequirements: ["Gathering room"],
  equipmentRequirements: ["Projector"],
  essentialRequirements: ["Qualified founder access"],
  flexibleRequirements: ["Evening"],
  setupMinutes: 30,
  cleanupMinutes: 30,
  savedAt: "2026-10-01T00:00:00Z",
};
const recommendation = {
  venueId: "venue-shifu-den-bengaluru",
  name: "Shifu Den",
  city: "Bengaluru",
  locality: "Bengaluru; detailed locality unknown",
  historical: false,
  relationshipStatus: "research-lead",
  documentedFacts: [
    {
      claim: "Hosting",
      value: "Source-backed community gatherings",
      evidenceType: "public-documentation",
      qualification: null,
    },
  ],
  requirementCoverage: [
    {
      requirement: "Founder eligibility",
      status: "unknown",
      evidence: [
        {
          claim: "Community access",
          value: "Pro-bono access described for founder community",
          qualification: "Organizer eligibility requires confirmation",
          evidenceType: "public-documentation",
        },
      ],
    },
  ],
  importantUnknowns: [{ claim: "Capacity and availability", value: "Unknown" }],
  documentedConflicts: [],
  sourceReferences: [
    {
      id: "source-shifu-den",
      title:
        "Shifu Den original community hosting source with a deliberately long readable title",
      url: "https://den.shifuventures.com/",
    },
  ],
  nextStep: "Confirm conditions with the host.",
};

test("wizard validation, back navigation, compatible persistence and full review", async ({
  page,
}) => {
  await page.goto("/organizer");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel(/Event name/)).toBeFocused();
  await expect(page.locator("#error-title")).toHaveText(
    "This field is required.",
  );
  await page.getByLabel("Try an example").selectOption("delhi-hackathon");
  await page.getByRole("button", { name: "Load example" }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("backstage.event-brief.v1")),
  ).toBeNull();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Equipment and setup").fill("2 projectors with HDMI");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel(/Event name/)).toHaveValue(
    "Delhi NCR community hackathon",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Equipment and setup")).toHaveValue(
    "2 projectors with HDMI",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".brief-review").last()).toContainText(
    "2 projectors with HDMI",
  );
  await expect(page.locator(".brief-review").last()).toContainText("60");
  await page.screenshot({
    path: ".playwright-artifacts/green-saas/brief-review-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save event brief" }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("backstage.event-brief.v1")!),
  );
  expect(saved.equipmentRequirements).toEqual([
    "Projector",
    "microphones",
    "reliable Wi-Fi",
    "2 projectors with HDMI",
  ]);
  expect(saved.currency).toBe("INR");
  expect(saved.headcount).toBe(80);
  await page.reload();
  await expect(
    page.getByText("Saved in this browser", { exact: true }),
  ).toBeVisible();
});

test("older brief recovery preserves raw data until an explicit save", async ({
  page,
}) => {
  const raw = JSON.stringify({
    ...brief,
    currency: undefined,
    setupMinutes: undefined,
  });
  await page.addInitScript(
    (value) => localStorage.setItem("backstage.event-brief.v1", value),
    raw,
  );
  await page.goto("/organizer");
  await expect(
    page.getByRole("button", { name: "Download stored brief" }),
  ).toBeVisible();
  await expect(page.getByLabel(/Event name/)).toHaveValue(brief.title);
  expect(
    await page.evaluate(() => localStorage.getItem("backstage.event-brief.v1")),
  ).toBe(raw);
});

test("qualification from coverage evidence, accessible details, changed brief and exact handoff", async ({
  page,
}) => {
  await page.addInitScript(
    (value) =>
      localStorage.setItem("backstage.event-brief.v1", JSON.stringify(value)),
    brief,
  );
  const requests: unknown[] = [];
  await page.route("**/api/venue-discovery", async (route) => {
    requests.push(route.request().postDataJSON().brief);
    await route.fulfill({
      json: {
        message: "Explicit deterministic fixture",
        recommendations: [
          requests.length > 1
            ? {
                ...recommendation,
                requirementCoverage: recommendation.requirementCoverage.map(
                  (item) => ({
                    ...item,
                    evidence: item.evidence.map((claim) => ({
                      ...claim,
                      qualification: null,
                    })),
                  }),
                ),
              }
            : recommendation,
        ],
      },
    });
  });
  await page.goto("/organizer?view=brief&step=3");
  await page.getByRole("button", { name: "Find suitable venues" }).click();
  const card = page.locator(".recommendation-card");
  await expect(card.locator(".lead-summary")).toContainText(
    "Pro-bono access described for founder community",
  );
  await expect(card).toContainText(
    "Organizer eligibility requires confirmation",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".playwright-artifacts/green-saas/qualified-lead-mobile.png",
    fullPage: true,
  });
  const details = card.getByRole("button", { name: "View evidence" });
  await details.click();
  await expect(
    page.getByRole("dialog", { name: /Shifu Den — evidence/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close details" }),
  ).toBeFocused();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => document.activeElement?.closest("dialog") !== null,
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(details).toBeFocused();
  await page
    .getByRole("navigation", { name: "organizer views" })
    .getByRole("link", { name: "Event brief" })
    .click();
  await page.getByRole("link", { name: "Edit event details" }).click();
  await page.getByLabel(/Event name/).fill("New edited title");
  await page
    .getByRole("navigation", { name: "organizer views" })
    .getByRole("link", { name: "Venue research" })
    .click();
  await expect(page.getByText(/The form has changed/)).toBeVisible();
  await page.getByLabel("Ask a follow-up question").fill("Clarify eligibility");
  await page.getByRole("button", { name: "Refine leads" }).click();
  await expect(page.locator("#venue-leads")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  await expect(card.locator(".lead-summary")).toContainText(
    "Pro-bono access described for founder community",
  );
  await card
    .getByRole("button", { name: "Create private draft", exact: true })
    .click();
  await expect(page.getByLabel("Potential host")).toHaveValue(
    /venue-shifu-den-bengaluru$/,
  );
  await expect(page.getByLabel("Event title", { exact: true })).toHaveValue(
    brief.title,
  );
  await expect(
    page.getByLabel("Questions still needing an answer"),
  ).toContainText("Founder eligibility");
  await expect(
    page.getByRole("button", { name: "Submit demo request" }),
  ).toBeDisabled();
});

test("discovery failure preserves brief and retry is an explicit action", async ({
  page,
}) => {
  await page.addInitScript(
    (value) =>
      localStorage.setItem("backstage.event-brief.v1", JSON.stringify(value)),
    brief,
  );
  let calls = 0;
  await page.route("**/api/venue-discovery", async (route) => {
    calls++;
    await route.fulfill({
      status: 503,
      json: { error: "The provider is unavailable. Your brief is preserved." },
    });
  });
  await page.goto("/organizer?step=3");
  await page.getByRole("button", { name: "Find suitable venues" }).click();
  await expect(page.locator("#venue-leads").getByRole("alert")).toContainText(
    "provider is unavailable",
  );
  await page.screenshot({
    path: ".playwright-artifacts/green-saas/discovery-error.png",
    fullPage: true,
  });
  expect(calls).toBe(1);
  await page.getByRole("button", { name: "Retry venue search" }).click();
  await expect(page.locator("#venue-leads")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  expect(calls).toBe(2);
  await page.getByRole("link", { name: "Review event brief" }).click();
  await expect(page.locator(".brief-review").first()).toContainText(
    brief.title,
  );
});

test("catalog URL filters and evidence panel survive history and refresh", async ({
  page,
}) => {
  await page.goto("/venues?city=Delhi+NCR&q=Ofis");
  await expect(page.locator(".venue-card")).toHaveCount(2);
  const card = page.locator(
    '.venue-card[data-venue-id="venue-ofis-gurugram-sohna-road"]',
  );
  await card.getByRole("button", { name: "View evidence" }).click();
  await expect(page).toHaveURL(/venue=venue-ofis-gurugram/);
  await expect(page.getByRole("dialog")).toContainText("Gurugram");
  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Filter by city")).toHaveValue("Delhi NCR");
  await expect(page.getByLabel("Search venues or locality")).toHaveValue(
    "Ofis",
  );
  await expect(page.locator(".venue-card")).toHaveCount(2);
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
});

test("quota state, malformed recovery and reduced-motion reading", async ({
  page,
}) => {
  const raw = "{not-valid-json";
  await page.addInitScript(
    (value) => localStorage.setItem("backstage.event-brief.v1", value),
    raw,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/organizer");
  await expect(
    page.getByRole("button", { name: "Download stored brief" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("backstage.event-brief.v1")),
  ).toBe(raw);
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  await page.getByLabel("Try an example").selectOption("bengaluru-founders");
  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  let calls = 0;
  await page.route("**/api/venue-discovery", async (route) => {
    calls++;
    await route.fulfill({
      status: 429,
      json: {
        error: "The daily discovery limit is reached. Your brief is preserved.",
        retryAfterSeconds: 3600,
      },
    });
  });
  await page.getByRole("button", { name: "Find suitable venues" }).click();
  await expect(page.locator("#venue-leads").getByRole("alert")).toContainText(
    "daily discovery limit",
  );
  await expect(
    page.getByRole("button", { name: "Retry venue search" }),
  ).toBeDisabled();
  expect(calls).toBe(1);
});
