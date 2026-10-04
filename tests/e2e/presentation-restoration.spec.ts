import {expect, test} from "@playwright/test";
import {mkdirSync} from "node:fs";

// Presentation/reload checks make no discovery calls and use the suite's temporary DB.
for (const width of [1440, 390]) {
  test(`original presentation and direct-page refresh at ${width}px`, async ({page}) => {
    await page.setViewportSize({width, height: width === 390 ? 844 : 1000});
    const pageErrors: string[] = [];
    const assetFailures: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.name));
    page.on("requestfailed", (request) => {
      if (["stylesheet", "script"].includes(request.resourceType())) {
        assetFailures.push(new URL(request.url()).pathname);
      }
    });
    page.on("response", (response) => {
      if (response.status() >= 400 && ["stylesheet", "script"].includes(response.request().resourceType())) {
        assetFailures.push(new URL(response.url()).pathname);
      }
    });
    const artifactDir = process.env.PLAYWRIGHT_ARTIFACT_DIR || ".playwright-artifacts";
    mkdirSync(`${artifactDir}/original-design`, {recursive: true});
    for (const [route, heading] of [
      ["/", /Make room.*for what matters/],
      ["/organizer", "Plan your event"],
      ["/venues", "Venue leads"],
      ["/host", "Host workspace"],
    ] as const) {
      expect((await page.goto(route))?.status()).toBe(200);
      await expect(page.getByRole("heading", {level: 1, name: heading})).toBeVisible();
      expect((await page.reload())?.status()).toBe(200);
      await expect(page.getByRole("heading", {level: 1, name: heading})).toBeVisible();
      await expect(page.locator(".site-header")).toHaveCSS("height", width === 390 ? "70px" : "83px");
      await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 245, 239)");
      await expect.poll(() => page.evaluate(() => Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).every((link) => Boolean(link.sheet)))).toBe(true);
      const dimensions = await page.evaluate(() => ({viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth}));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
      if (route === "/") {
        await expect(page.getByRole("img", {name: "An event brief takes shape into a considered gathering"})).toBeVisible();
        await expect(page.locator(".orbit")).toHaveCount(2);
        await expect(page.locator(".orbit-tag")).toHaveCount(2);
        await expect(page.locator(".step-card")).toHaveCount(3);
        await expect(page.locator(".closing-banner")).toBeVisible();
        await expect(page.locator(".site-footer")).toContainText("Made for the moments that bring us together.");
        const organizerLink = page.getByRole("link", {name: /Build an event brief/});
        await organizerLink.focus();
        await expect(organizerLink).toBeFocused();
        expect(await organizerLink.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
        await page.locator("body").click({position: {x: 1, y: 1}});
      }
      await page.screenshot({path: `${artifactDir}/original-design/${route === "/" ? "home" : route.slice(1)}-${width}.png`, fullPage: true});
    }
    expect(assetFailures).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}
