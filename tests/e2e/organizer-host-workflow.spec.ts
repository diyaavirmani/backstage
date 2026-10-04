import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { mkdirSync } from "node:fs";

type TestApplication = {
  id: string;
  idempotency_key: string;
  status: string;
  venue_id: string;
  venue_name: string;
  city: string;
  locality: string;
  kind: string;
  payload: Record<string, unknown>;
  brief: Record<string, unknown>;
  acceptedBrief: null;
  proposed: null;
  history: unknown[];
  checklist: unknown[];
};
type TestOverview = { applications: TestApplication[] };

test("source-backed discovery handoff opens the matching private draft (deterministic fixture)", async ({
  page,
}) => {
  const testDate = futureWeekday(18);
  let savedApplication: TestApplication | undefined;
  let posted: Record<string, unknown> | undefined;
  // Explicit test fixture: this route never runs in the product and contains no live recommendation claim.
  await page.route("**/api/venue-discovery", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Deterministic browser fixture only.",
        recommendations: [
          {
            venueId: "venue-masters-union-gurugram",
            name: "Masters’ Union Campus",
            city: "Delhi NCR",
            locality: "DLF Cyber Park, Udyog Vihar Phase III, Gurugram",
            relationshipStatus: "research-lead",
            historical: false,
            requirementCoverage: [
              {
                requirement:
                  "Capacity for 24 guests in one documented room layout",
                status: "unknown",
                evidence: [],
              },
              {
                requirement: "Available for the selected date",
                status: "unknown",
                evidence: [],
              },
            ],
            documentedFacts: [
              {
                claim: "Public hosting invitation",
                value: "Offsites, conferences, and meetings are mentioned.",
                evidenceType: "public-documentation",
                qualification:
                  "Room terms and audience eligibility are not specified.",
              },
            ],
            importantUnknowns: [
              {
                claim: "Room-specific capacity",
                value: "Unknown from reviewed sources.",
              },
            ],
            documentedConflicts: [],
            sourceReferences: [
              {
                id: "source-mu",
                title: "Masters’ Union company events",
                url: "https://mastersunion.org/for-companies",
              },
            ],
            nextStep: "Ask the host about fit and terms.",
          },
        ],
      }),
    }),
  );
  await page.route("**/api/operations**", async (route) => {
    if (route.request().method() === "GET") {
      const response = await route.fetch();
      const fresh = (await response.json()) as TestOverview;
      await route.fulfill({
        response,
        json: {
          ...fresh,
          applications: savedApplication
            ? [
                savedApplication,
                ...fresh.applications.filter(
                  (app) => app.id !== savedApplication?.id,
                ),
              ]
            : fresh.applications,
        },
      });
      return;
    }
    const body = (await route.request().postDataJSON()) as {
      payload: Record<string, unknown>;
    };
    posted = body.payload;
    const payload = body.payload;
    savedApplication = {
      id: "fixture-research-draft",
      idempotency_key: String(payload.idempotencyKey),
      status: "draft",
      venue_id: String(payload.venueId),
      venue_name: "Masters’ Union Campus",
      city: "Delhi NCR",
      locality: "DLF Cyber Park, Udyog Vihar Phase III, Gurugram",
      kind: "research",
      payload: {
        organizer: payload.organizer,
        resources: [],
        questions: payload.questions,
        flexibleSlot: null,
        sources: [
          {
            id: "source-mu",
            title: "Masters’ Union company events",
            url: "https://mastersunion.org/for-companies",
          },
        ],
        evidence: [
          {
            claim: "Public hosting invitation",
            value: "Offsites are mentioned.",
            evidenceType: "public-documentation",
            qualification: "Subject to host terms.",
            checkedAt: "2026-10-02",
            sourceReferences: [
              {
                id: "source-mu",
                title: "Masters’ Union company events",
                url: "https://mastersunion.org/for-companies",
              },
            ],
          },
        ],
        summary: "Fixture content",
        venueKind: "research",
      },
      brief: payload.brief as Record<string, unknown>,
      acceptedBrief: null,
      proposed: null,
      history: [],
      checklist: [],
    };
    await route.fulfill({
      json: { ok: true, applicationId: savedApplication.id },
    });
  });
  await page.goto("/organizer");
  await fillEventBrief(page, testDate);
  await page.getByRole("button", { name: "Save event brief" }).click();
  await page.getByRole("button", { name: "Find suitable venues" }).click();
  const recommendation = page
    .locator(".recommendation-card")
    .filter({ hasText: "Masters’ Union Campus" });
  await expect(recommendation).toBeVisible();
  await expect(
    recommendation.getByRole("link", { name: /Masters’ Union company events/ }),
  ).toHaveAttribute("href", "https://mastersunion.org/for-companies");
  await recommendation
    .getByRole("button", { name: "Create private draft" })
    .click();
  await expect(page.locator("#application-builder")).toBeVisible();
  await expect(page.getByLabel("Potential host")).toHaveValue(
    /venue-masters-union-gurugram$/,
  );
  await expect(
    page.locator("#application-builder .brief-snapshot"),
  ).toContainText("Organizer browser journey");
  await expect(
    page.getByLabel("Questions still needing an answer"),
  ).toContainText("Capacity for 24 guests");
  await expect(
    page.getByText(/Discovery evidence and qualifications/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit demo request" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save application draft" }),
  ).toBeDisabled();
  await page.getByLabel("Organizer name").fill("Fixture Organizer");
  await page.getByLabel("Email", { exact: true }).fill("fixture@example.test");
  await page.getByLabel(/I have reviewed the brief snapshot/).check();
  await page.getByRole("button", { name: "Save application draft" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Application draft saved" }),
  ).toBeVisible();
  expect(String(posted?.venueId)).toMatch(/venue-masters-union-gurugram$/);
  expect((posted?.brief as Record<string, unknown>)?.title).toBe(
    "Organizer browser journey",
  );
  expect(
    (posted?.discoveryBriefSnapshot as Record<string, unknown>)?.title,
  ).toBe("Organizer browser journey");
  expect(posted?.authoritativeResearchEvidence).toBeUndefined();
  const saved = page
    .locator(".application-card")
    .filter({ hasText: "Fixture Organizer" });
  await openDetails(saved);
  await expect(saved).toContainText("DRAFT ONLY");
  await expect(
    saved.getByRole("link", { name: /Masters’ Union company events/ }).first(),
  ).toHaveAttribute("href", "https://mastersunion.org/for-companies");
  await page.reload();
  await expect(
    page.locator(".application-card").filter({ hasText: "Fixture Organizer" }),
  ).toContainText("DRAFT ONLY");
  await page.setViewportSize({ width: 390, height: 844 });
  const size = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(size.scrollWidth).toBeLessThanOrEqual(size.width);
  await page.screenshot({
    path: `${process.env.PLAYWRIGHT_ARTIFACT_DIR || ".playwright-artifacts"}/research-handoff-mobile.png`,
    fullPage: true,
  });
});

test("example briefs are explicit and do not create applications or reservations", async ({
  page,
}) => {
  await page.goto("/organizer");
  const example = page.getByLabel("Try an example");
  const load = page.getByRole("button", { name: "Load example" });
  await example.selectOption("delhi-hackathon");
  await load.click();
  await expect(page.getByLabel(/Event name/)).toHaveValue(
    "Delhi NCR community hackathon",
  );
  await expect(page.getByLabel(/Attendees/)).toHaveValue("80");
  await expect(page.getByLabel("Required rooms or areas")).toHaveValue(
    "Main event room, breakout rooms",
  );
  await example.selectOption("bengaluru-founders");
  await load.click();
  await expect(page.getByLabel("City")).toHaveValue("Bengaluru");
  await expect(page.getByLabel(/Audience or community/)).toHaveValue(
    "Early-stage founders and startup operators",
  );
  await example.selectOption("demo-workshop");
  await load.click();
  await expect(page.getByLabel(/Event name/)).toHaveValue(
    "Fictional host workshop demo",
  );
  await expect(page.getByLabel("Required rooms or areas")).toHaveValue(
    "Workshop Studio",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("backstage.event-brief.v1")),
  ).toBeNull();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Save event brief" }).click();
  const stored = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("backstage.event-brief.v1") || "null",
      ) as {
        date: string;
        startTime: string;
        endTime: string;
        setupMinutes: number;
        cleanupMinutes: number;
      } | null,
  );
  expect(stored?.date).toBeTruthy();
  const eventDate = new Date(`${stored!.date}T12:00:00+05:30`);
  expect(eventDate.getTime()).toBeGreaterThan(Date.now());
  expect(eventDate.getTime() - Date.now()).toBeLessThan(100 * 86400000);
  expect(
    new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "Asia/Kolkata",
    }).format(eventDate),
  ).not.toBe("Sunday");
  expect(stored!.startTime).toBe("11:00");
  expect(stored!.endTime).toBe("13:00");
  expect(stored!.setupMinutes).toBe(30);
  expect(stored!.cleanupMinutes).toBe(30);
  await expect(page.locator(".application-card")).toHaveCount(0);
  await expect(page.locator(".calendar-item")).toHaveCount(0);
});

function futureWeekday(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  while (date.getDay() === 0) date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}
function shiftDay(date: string, offset: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + offset);
  while (value.getDay() === 0) value.setDate(value.getDate() + 1);
  return value.toISOString().slice(0, 10);
}
function calendarMonth(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${date}T12:00:00+05:30`));
}
async function moveCalendarTo(page: Page, date: string) {
  const heading = page.locator(".calendar-toolbar h3"),
    wanted = calendarMonth(date);
  for (let i = 0; i < 14 && (await heading.innerText()) !== wanted; i++)
    await page.getByRole("button", { name: "Next month" }).click();
  await expect(heading).toHaveText(wanted);
}
async function fillEventBrief(page: Page, date: string) {
  await page.getByLabel(/Event name/).fill("Organizer browser journey");
  await page.getByLabel("Gathering type").selectOption({ label: "Workshop" });
  await page.locator("#brief-audience").selectOption("Other");
  await page.getByLabel(/Audience or community/).fill("Local community makers");
  await page.getByLabel(/Event date/).fill(date);
  await page.getByLabel(/Attendees/).fill("20");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel(/Venue budget/).fill("10000");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
async function selectOptionMatching(
  page: Page,
  selectLabel: string,
  pattern: RegExp,
) {
  const select = page.getByLabel(selectLabel);
  const options = await select.locator("option").evaluateAll((items) =>
    items.map((item) => ({
      label: item.textContent || "",
      value: (item as HTMLOptionElement).value,
    })),
  );
  const match = options.find((option) => pattern.test(option.label));
  expect(match, `an option matching ${pattern} should exist`).toBeTruthy();
  await select.selectOption(match!.value);
}
async function switchRole(page: Page, role: "organizer" | "host") {
  if (role === "organizer" && new URL(page.url()).pathname === "/host")
    await page
      .getByRole("navigation", { name: "host views" })
      .getByRole("link", { name: "Requests", exact: true })
      .click();
  await page.getByLabel("Simulation role").selectOption(role);
  await expect(page.getByLabel("Simulation role")).toHaveValue(role);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: `Simulation role changed to ${role}` }),
  ).toBeVisible();
}
async function cloneWorkspaceContext(browser: Browser, source: BrowserContext) {
  const context = await browser.newContext({
    viewport: { width: 1365, height: 900 },
  });
  await context.addCookies(await source.cookies());
  const brief = await source
    .pages()[0]
    ?.evaluate(() => localStorage.getItem("backstage.event-brief.v1"));
  await context.addInitScript((savedBrief) => {
    if (savedBrief)
      localStorage.setItem("backstage.event-brief.v1", savedBrief);
  }, brief || null);
  return context;
}

test("organizer brief, host review, shared resources, cancellation, and mobile calendar", async ({
  browser,
}) => {
  const artifactDir =
    process.env.PLAYWRIGHT_ARTIFACT_DIR || ".playwright-artifacts";
  mkdirSync(artifactDir, { recursive: true });
  const date = futureWeekday(10),
    alternateDate = shiftDay(date, 14),
    flexEnd = shiftDay(date, 25);
  const organizerContext = await browser.newContext({
    viewport: { width: 1365, height: 900 },
  });
  let hostContext: BrowserContext | undefined;
  try {
    const organizer = await organizerContext.newPage();
    await organizer.goto("/organizer");
    await expect(
      organizer.getByRole("heading", { name: "Plan your event" }),
    ).toBeVisible();
    const briefForm = organizer.locator(".brief-form");
    await briefForm
      .getByRole("button", { name: "Continue", exact: true })
      .click();
    await expect(organizer.getByLabel(/Event name/)).toBeFocused();
    expect(
      await briefForm
        .locator("input[required]")
        .first()
        .evaluate((element: HTMLInputElement) => element.validity.valueMissing),
    ).toBe(true);
    expect(
      await organizer.evaluate(() =>
        localStorage.getItem("backstage.event-brief.v1"),
      ),
    ).toBeNull();

    await fillEventBrief(organizer, date);
    await briefForm.getByRole("button", { name: /Save event brief/ }).click();
    await expect(
      organizer
        .getByRole("status")
        .filter({ hasText: "Your event brief is saved" }),
    ).toBeVisible();
    await organizer.reload();
    await organizer.getByRole("link", { name: "Edit event details" }).click();
    await expect(organizer.getByLabel(/Event name/)).toHaveValue(
      "Organizer browser journey",
    );
    await expect(
      organizer.locator(".brief-form").getByLabel(/Event date/),
    ).toHaveValue(date);
    await organizer.screenshot({
      path: `${artifactDir}/organizer-saved-brief.png`,
      fullPage: true,
    });

    await organizer
      .getByRole("navigation", { name: "organizer views" })
      .getByRole("link", { name: "Private drafts" })
      .click();
    await organizer
      .getByRole("button", { name: "Load saved event brief" })
      .click();
    await selectOptionMatching(
      organizer,
      "Potential host",
      /FICTIONAL DEMO.*Backstage Demo House/,
    );
    await organizer.getByLabel("Event title").fill("First approved event");
    await organizer.getByLabel(/Workshop Studio/).check();
    await organizer.getByLabel(/Projector · equipment/).check();
    await organizer.getByLabel("Organizer name").fill("Browser Test Organizer");
    await organizer
      .getByLabel("Email", { exact: true })
      .fill("organizer@example.test");
    await organizer.getByLabel("Flexible date from").fill(shiftDay(date, 1));
    await organizer.getByLabel("Flexible date through").fill(flexEnd);
    await organizer.getByLabel("Flexible start time").fill("09:00");
    await organizer.getByLabel("Flexible end time").fill("16:00");
    await organizer.getByLabel(/I have reviewed the brief snapshot/).check();
    await organizer
      .getByRole("button", { name: "Submit demo request" })
      .click();
    const firstCard = organizer
      .locator(".application-card")
      .filter({ hasText: "First approved event" });
    await openDetails(firstCard);
    await expect(firstCard).toContainText("submitted");
    await expect(firstCard).toContainText("FICTIONAL DEMO");

    hostContext = await cloneWorkspaceContext(browser, organizerContext);
    const host = await hostContext.newPage();
    await host.goto("/host");
    await switchRole(host, "host");
    const incoming = host
      .locator(".application-card")
      .filter({ hasText: "First approved event" });
    await openDetails(incoming);
    await expect(incoming).toBeVisible();
    await incoming.getByRole("button", { name: "Request information" }).click();
    await expect(incoming).toContainText("needs information");
    await expect(host.getByLabel("Reply to the host")).toHaveCount(0);

    await switchRole(host, "organizer");
    const replyCard = host
      .locator(".application-card")
      .filter({ hasText: "First approved event" });
    await openDetails(replyCard);
    await replyCard
      .getByLabel("Reply to the host")
      .fill(
        "The workshop is open to local makers; projector input is standard HDMI.",
      );
    await replyCard.getByRole("button", { name: "Send response" }).click();
    await expect(replyCard).toContainText(
      "Organizer response: The workshop is open to local makers",
    );
    await switchRole(host, "host");
    const incomingAgain = host
      .locator(".application-card")
      .filter({ hasText: "First approved event" });
    await openDetails(incomingAgain);
    await incomingAgain
      .getByRole("button", { name: "Approve & allocate" })
      .click();
    const confirmed = host
      .getByRole("heading", { name: /Confirmed events/ })
      .locator("..")
      .locator(".application-card")
      .filter({ hasText: "First approved event" });
    await openDetails(confirmed);
    await expect(confirmed).toBeVisible();
    await expect(confirmed.getByText("Accepted brief snapshot")).toBeVisible();
    const hostTask = confirmed.getByRole("checkbox", {
      name: /host task: Confirm room layout/,
    });
    const organizerTask = confirmed.getByRole("checkbox", {
      name: /organizer task: Share arrival/,
    });
    await expect(hostTask).toBeEnabled();
    await expect(organizerTask).toBeDisabled();
    await host.screenshot({
      path: `${artifactDir}/green-saas/host-confirmed-desktop.png`,
      fullPage: true,
    });
    await host
      .getByRole("navigation", { name: "host views" })
      .getByRole("link", { name: "Preparation", exact: true })
      .click();
    const preparation = host
      .locator(".preparation-card")
      .filter({ hasText: "First approved event" });
    await expect(
      preparation.getByRole("checkbox", {
        name: /organizer task: Share arrival/,
      }),
    ).toBeDisabled();
    await preparation
      .getByRole("checkbox", { name: /host task: Confirm room layout/ })
      .click();
    await expect(
      preparation.getByRole("checkbox", {
        name: /host task: Confirm room layout/,
      }),
    ).toBeChecked();
    await host.screenshot({
      path: `${artifactDir}/green-saas/preparation-desktop.png`,
      fullPage: true,
    });
    await host
      .getByRole("navigation", { name: "host views" })
      .getByRole("link", { name: "Requests", exact: true })
      .click();
    await expect(hostTask).toBeChecked();
    await switchRole(host, "organizer");
    const organizerConfirmed = host
      .locator(".application-card")
      .filter({ hasText: "First approved event" });
    await openDetails(organizerConfirmed);
    await expect(
      organizerConfirmed.getByRole("checkbox", {
        name: /host task: Confirm room layout/,
      }),
    ).toBeChecked();
    const organizerShare = organizerConfirmed.getByRole("checkbox", {
      name: /organizer task: Share arrival/,
    });
    await expect(organizerShare).toBeEnabled();
    await organizerShare.click();
    await expect(organizerShare).toBeChecked();

    await host
      .getByRole("button", { name: "Start a new application draft" })
      .click();
    await host.getByRole("button", { name: "Load saved event brief" }).click();
    await selectOptionMatching(
      host,
      "Potential host",
      /FICTIONAL DEMO.*Backstage Demo House/,
    );
    await host.getByLabel("Event title").fill("Shared projector conflict");
    await host.getByLabel(/Gathering Salon/).check();
    await host.getByLabel(/Projector · equipment/).check();
    await host.getByLabel("Organizer name").fill("Browser Test Organizer");
    await host
      .getByLabel("Email", { exact: true })
      .fill("organizer@example.test");
    await host.getByLabel("Flexible date from").fill(shiftDay(date, 1));
    await host.getByLabel("Flexible date through").fill(flexEnd);
    await host.getByLabel("Flexible start time").fill("09:00");
    await host.getByLabel("Flexible end time").fill("16:00");
    await host.getByLabel(/I have reviewed the brief snapshot/).check();
    await host.getByRole("button", { name: "Submit demo request" }).click();
    await switchRole(host, "host");
    const conflict = host
      .locator(".application-card")
      .filter({ hasText: "Shared projector conflict" });
    await openDetails(conflict);
    await conflict.getByRole("button", { name: "Approve & allocate" }).click();
    await expect(host.locator(".ops-feedback[role=alert]")).toContainText(
      "Conflict on Projector",
    );
    await conflict.getByLabel("Proposed date").fill(alternateDate);
    await conflict.getByLabel("From", { exact: true }).fill("13:00");
    await conflict.getByLabel("Until", { exact: true }).fill("15:00");
    await conflict.getByRole("button", { name: "Propose this slot" }).click();
    await expect(conflict).toContainText("alternative proposed");
    await switchRole(host, "organizer");
    const proposed = host
      .locator(".application-card")
      .filter({ hasText: "Shared projector conflict" });
    await openDetails(proposed);
    await proposed
      .getByRole("button", { name: "Accept proposed alternative" })
      .click();
    await switchRole(host, "host");
    await openDetails(
      host
        .locator(".application-card")
        .filter({ hasText: "Shared projector conflict" }),
    );
    await host
      .locator(".application-card")
      .filter({ hasText: "Shared projector conflict" })
      .getByRole("button", { name: "Approve & allocate" })
      .click();
    const secondConfirmed = host
      .getByRole("heading", { name: /Confirmed events/ })
      .locator("..")
      .locator(".application-card")
      .filter({ hasText: "Shared projector conflict" });
    await openDetails(secondConfirmed);
    await expect(secondConfirmed).toContainText("Accepted brief snapshot");
    await expect(secondConfirmed).toContainText(alternateDate);

    await host
      .getByRole("navigation", { name: "host views" })
      .getByRole("link", { name: "Resource calendar" })
      .click();
    await moveCalendarTo(host, alternateDate);
    await selectOptionMatching(
      host,
      "Filter resource",
      /Backstage Demo House.*Projector/,
    );
    for (
      let page = 0;
      page < 24 &&
      (await host.locator(".calendar-confirmed-reservation").count()) < 2;
      page++
    ) {
      const more = host.getByRole("button", {
        name: "Show 12 more calendar entries",
      });
      if (!(await more.isVisible())) break;
      await more.click();
    }
    await expect(host.locator(".calendar-confirmed-reservation")).toHaveCount(
      2,
    );
    const filteredItems = await host.locator(".calendar-item").allInnerTexts();
    expect(filteredItems.every((text) => text.includes("Projector"))).toBe(
      true,
    );
    const alternativeScreenshot = `${artifactDir}/host-calendar-before-cancel.png`;
    await host.screenshot({ path: alternativeScreenshot, fullPage: true });

    await switchRole(host, "organizer");
    await openDetails(
      host
        .locator(".application-card")
        .filter({ hasText: "Shared projector conflict" }),
    );
    await host
      .locator(".application-card")
      .filter({ hasText: "Shared projector conflict" })
      .getByRole("button", { name: "Cancel request" })
      .click();
    await switchRole(host, "host");
    await host
      .getByRole("navigation", { name: "host views" })
      .getByRole("link", { name: "Resource calendar" })
      .click();
    await moveCalendarTo(host, alternateDate);
    await selectOptionMatching(
      host,
      "Filter resource",
      /Backstage Demo House.*Projector/,
    );
    await expect(host.locator(".calendar-confirmed-reservation")).toHaveCount(
      1,
    );

    for (
      let page = 0;
      page < 24 && (await host.locator(".calendar-availability").count()) === 0;
      page++
    ) {
      const more = host.getByRole("button", {
        name: "Show 12 more calendar entries",
      });
      if (!(await more.isVisible())) break;
      await more.click();
    }
    const available = host
      .locator(".calendar-availability")
      .filter({
        has: host.getByRole("button", { name: "Withdraw availability" }),
      })
      .first();
    await expect(available).toBeVisible();
    const previousCalendarCount = Number(
      (await host.locator(".calendar-result-count").innerText()).match(
        /of (\d+)/,
      )?.[1],
    );
    expect(previousCalendarCount).toBeGreaterThan(0);
    await available
      .getByRole("button", { name: "Withdraw availability" })
      .click();
    await expect(host.locator(".calendar-result-count")).toContainText(
      `of ${previousCalendarCount - 1}`,
    );
    await expect(
      host.getByText(/Withdraw a window to stop offering it/),
    ).toBeVisible();

    await host.setViewportSize({ width: 390, height: 844 });
    await expect(
      host.getByRole("heading", { name: "Fictional host operations" }),
    ).toBeVisible();
    const dimensions = await host.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(
      dimensions.scrollWidth,
      JSON.stringify(dimensions),
    ).toBeLessThanOrEqual(dimensions.width);
    await host.screenshot({
      path: `${artifactDir}/host-calendar-mobile.png`,
      fullPage: true,
    });
    await switchRole(host, "organizer");
    await organizer.setViewportSize({ width: 390, height: 844 });
    await organizer
      .getByRole("navigation", { name: "organizer views" })
      .getByRole("link", { name: "Event brief" })
      .click();
    await expect(organizer.getByLabel(/Event name/)).toBeVisible();
    const organizerDimensions = await organizer.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(
      organizerDimensions.scrollWidth,
      JSON.stringify(organizerDimensions),
    ).toBeLessThanOrEqual(organizerDimensions.width);
    await organizer.screenshot({
      path: `${artifactDir}/organizer-mobile.png`,
      fullPage: true,
    });
  } finally {
    await hostContext?.close();
    await organizerContext.close();
  }
});

async function openDetails(card: import("@playwright/test").Locator) {
  const details = card.locator("details.request-details");
  if ((await details.getAttribute("open")) === null)
    await details
      .getByText("View application details", { exact: true })
      .click();
}
