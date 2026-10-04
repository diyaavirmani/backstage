import { test, expect } from "@playwright/test";

for (const width of [390, 1440])
  test(`audience and requirement controls preserve snapshots at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    const requests: Array<{ brief: Record<string, unknown> }> = [];
    // Deterministic UI fixture, not real provider verification.
    await page.route("**/api/venue-discovery", async (route) => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({
        json: {
          message: "Deterministic discovery fixture",
          recommendations: [
            {
              venueId: "venue-shifu-den-bengaluru",
              name: "Shifu Den",
              city: "Bengaluru",
              locality: "Bengaluru; detailed locality unknown",
              relationshipStatus: "research-lead",
              historical: false,
              documentedFacts: [],
              requirementCoverage: [
                {
                  requirement: "Student eligibility",
                  status: "unknown",
                  evidence: [],
                },
              ],
              importantUnknowns: [],
              documentedConflicts: [],
              sourceReferences: [
                {
                  id: "source-shifu-den",
                  title: "Shifu Den",
                  url: "https://den.shifuventures.com/",
                },
              ],
              nextStep: "Confirm eligibility.",
            },
          ],
        },
      });
    });
    await page.goto("/organizer");
    await page.getByLabel("Try an example").selectOption("bengaluru-founders");
    await page.getByRole("button", { name: "Load example" }).click();
    await expect(
      page.getByLabel("Audience", { exact: false }).first(),
    ).toHaveValue("Other");
    await expect(page.getByLabel(/Audience or community/)).toHaveValue(
      "Early-stage founders and startup operators",
    );
    await page.getByLabel(/Audience or community — custom details/).fill("");
    await page.getByLabel("Community/organization name").fill("Example coding club");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator("#error-audience")).toHaveText(
      "Describe the audience or choose a listed option.",
    );
    await expect(
      page.getByLabel(/Audience or community — custom details/),
    ).toBeFocused();
    await page.locator("#brief-audience").selectOption("Students");
    await page.locator("#brief-audience").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Community/organization name")).toBeFocused();
    await page
      .getByLabel("Community/organization name")
      .fill("Example coding club");
    await page.getByLabel(/Attendees/).fill("0");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByLabel(/Attendees/)).toBeFocused();
    await page.getByLabel(/Attendees/).fill("100");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByLabel("I already know the spaces I need").uncheck();
    await expect(page.getByLabel("Required rooms or areas")).toHaveCount(0);
    await page
      .getByRole("checkbox", { name: "Projector", exact: true })
      .check();
    await page
      .getByLabel("Equipment and setup")
      .fill("2 projectors with HDMI, wireless microphone");
    await page
      .getByRole("checkbox", { name: "Outside-food permission" })
      .check();
    await page.getByLabel("Nice to have — optional").fill("Parking");
    await expect(
      page.getByText(
        "Helpful extras. Missing these will not automatically rule out a venue.",
      ),
    ).toBeVisible();
    await page.screenshot({path:`.playwright-artifacts/product-improvements/requirements-${width}.png`,fullPage:true});
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.locator("#brief-audience")).toHaveValue("Students");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator(".brief-review").first()).toContainText(
      "Students; community: Example coding club",
    );
    await page.getByRole("button", { name: "Find suitable venues" }).click();
    await expect(
      page.getByRole("heading", { name: "Suggested event setup" }),
    ).toBeVisible();
    const before = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("backstage.event-brief.v1")!),
    );
    expect(before.roomRequirements).toEqual([]);
    expect(before.equipmentRequirements).toEqual([
      "Projector",
      "2 projectors with HDMI",
      "wireless microphone",
    ]);
    expect(before.essentialRequirements).toContain("Outside-food permission");
    expect(before.flexibleRequirements).toEqual(["Parking"]);
    expect(requests[0].brief).toEqual(before);
    const setupSection = page.locator(".suggested-setup");
    await expect(setupSection.getByRole("heading", { name: "Proposed spaces" })).toBeVisible();
    await expect(setupSection.locator("li").first()).toContainText(
      "Main space for 100 attendees",
    );
    await expect(setupSection).toContainText("No breakout room is inferred from headcount alone.");
    await page
      .getByLabel("Adjust proposed spaces")
      .fill("Main presentation room, optional discussion area");
    await page
      .getByRole("button", { name: "Use this setup in my brief" })
      .click();
    await expect(
      page.getByText(/Setup applied to the editable form only/),
    ).toBeVisible();
    await page.screenshot({path:`.playwright-artifacts/product-improvements/setup-${width}.png`,fullPage:true});
    expect(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("backstage.event-brief.v1")!),
      ),
    ).toEqual(before);
    await page
      .getByLabel("Ask a follow-up question")
      .fill("Does this apply to students?");
    await page.getByRole("button", { name: "Refine leads" }).click();
    await expect(page.getByLabel("Ask a follow-up question")).toHaveValue("");
    expect(requests[1].brief).toEqual(before);
    await page.evaluate(() =>
      window.addEventListener(
        "backstage:prepare-research-application",
        (e) => {
          (window as unknown as { testHandoff: unknown }).testHandoff = (
            e as CustomEvent
          ).detail;
        },
        { once: true },
      ),
    );
    await page.getByRole("button", { name: "Create private draft" }).click();
    const handoff = (await page.evaluate(
      () => (window as unknown as { testHandoff: unknown }).testHandoff,
    )) as { brief: Record<string, unknown>; questions: string[] };
    expect(handoff.brief).toEqual(before);
    expect(handoff.questions.join(" ")).toContain("Student eligibility");
    await page.goto("/organizer");
    await expect(page.locator("#brief-audience")).toHaveValue("Students");
    await expect(page.getByLabel("Community/organization name")).toHaveValue(
      "Example coding club",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.playwright-artifacts/product-improvements/brief-${width}.png`,
      fullPage: true,
    });
  });
