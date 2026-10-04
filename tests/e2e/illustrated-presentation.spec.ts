import { expect, test } from "@playwright/test";

// Presentation verification only. Existing suites exercise real operations and
// explicitly mocked discovery; this test never calls a live model provider.
test("illustrated landing is accessible and has no operational side effects", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      requests.push(new URL(request.url()).pathname);
    }
  });
  await page.goto("/");
  await expect(page.locator(".landing-site")).toHaveCSS(
    "background-color",
    "rgb(13, 23, 18)",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByText(/Original AI illustration/)).toBeVisible();
  await expect(page.locator(".product-preview")).toContainText(
    "Illustrative example",
  );
  await expect(page.locator(".product-preview")).toContainText(
    "eligibility requires confirmation",
  );
  await expect(page.locator(".product-preview")).toContainText(
    "booking authority",
  );
  await expect(
    page.locator(".product-preview").getByRole("link"),
  ).toHaveAttribute("href", "https://den.shifuventures.com/");
  const image = await page.request.get("/images/gathering-mural.jpg");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/jpeg");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".hero-copy")
      .evaluate((element) =>
        parseFloat(getComputedStyle(element).animationDuration),
      ),
  ).toBeLessThanOrEqual(0.01);
  await expect(
    page
      .getByRole("navigation", { name: "Footer navigation" })
      .getByRole("link", { name: "Fictional host demo" }),
  ).toHaveAttribute("href", "/host");
  // Static illustration and previews must not initialize a workspace or discovery.
  expect(requests).toEqual([]);
  await page.screenshot({
    path: ".playwright-artifacts/green-saas/landing-desktop-viewport.png",
  });
});

test("covered workspaces retain readable boundaries and mobile view labels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, title, boundary] of [
    ["/organizer", "Plan your event", "Organizer workspace"],
    ["/venues", "Venue research", "Research leads · not onboarded"],
    ["/host", "Host workspace", "Fictional host demonstration"],
  ]) {
    await page.goto(route);
    await expect(
      page
        .locator(".page-heading-cover")
        .getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    await expect(page.locator(".page-heading-cover .page-context")).toHaveText(
      boundary,
    );
    if (route === "/organizer")
      await expect(page.getByLabel(/Event name/)).toHaveCSS(
        "font-weight",
        "400",
      );
    for (const label of await page.locator(".sidebar-view-title").all())
      await expect(label).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Navigation" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Menu", exact: true }),
    ).toBeFocused();
  }
});
