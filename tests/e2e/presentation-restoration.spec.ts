import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

// Local production checks use isolated SQLite. No discovery/provider calls.
for (const width of [360, 390, 768, 1024, 1440])
  test(`green workspace, assets, navigation and refresh at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [],
      assets: string[] = [],
      consoleErrors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.name));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.type());
    });
    page.on("requestfailed", (request) => {
      if (["script", "stylesheet"].includes(request.resourceType()))
        assets.push(new URL(request.url()).pathname);
    });
    page.on("response", (response) => {
      if (
        response.status() >= 400 &&
        ["script", "stylesheet"].includes(response.request().resourceType())
      )
        assets.push(new URL(response.url()).pathname);
    });
    const output =
      process.env.PLAYWRIGHT_ARTIFACT_DIR || ".playwright-artifacts";
    mkdirSync(`${output}/green-saas`, { recursive: true });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    for (const [route, heading] of [
      ["/", /Find the right space.*Bring your event together/],
      ["/organizer", "Plan your event"],
      ["/venues", "Venue research"],
      ["/host", "Host workspace"],
    ] as const) {
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
      expect((await page.goto(route))?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      expect((await page.reload())?.status()).toBe(200);
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      expect((await page.reload())?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      await expect(page.locator("body")).toHaveCSS(
        "background-color",
        "rgb(246, 247, 242)",
      );
      await expect
        .poll(() =>
          page.evaluate(() =>
            Array.from(
              document.querySelectorAll<HTMLLinkElement>(
                'link[rel="stylesheet"]',
              ),
            ).every((link) => Boolean(link.sheet)),
          ),
        )
        .toBe(true);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
      if (route === "/") {
        await expect(page.locator(".product-preview")).toContainText(
          "Illustrative example",
        );
        await expect(page.locator(".step-card")).toHaveCount(3);
        const link = page
          .locator(".hero-actions")
          .getByRole("link", { name: /Plan an event/ });
        await link.focus();
        await expect(link).toBeFocused();
        expect(
          await link.evaluate(
            (element) => getComputedStyle(element).outlineStyle,
          ),
        ).not.toBe("none");
      }
      if (width < 768) {
        await page.getByRole("button", { name: "Menu", exact: true }).click();
        await expect(
          page.getByRole("dialog", { name: "Navigation" }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(
          page.getByRole("button", { name: "Menu", exact: true }),
        ).toBeFocused();
      }
      await page.screenshot({
        path: `${output}/green-saas/${route === "/" ? "home" : route.slice(1)}-${width}.png`,
        fullPage: true,
      });
    }
    expect(errors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(assets).toEqual([]);
    await page.goto("/");
    if (width < 768) {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: "Organizer", exact: true })
        .click();
    } else
      await page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: "Organizer", exact: true })
        .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Plan your event" }),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "organizer views" })
      .getByRole("link", { name: "Venue research" })
      .click();
    await expect(page).toHaveURL(/view=research/);
    await expect(
      page.getByRole("heading", { name: "Venue research", exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole("heading", { name: "Event brief", exact: true }),
    ).toBeVisible();
    await page.goForward();
    await expect(
      page.getByRole("heading", { name: "Venue research", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Venue research", exact: true }),
    ).toBeVisible();
  });
