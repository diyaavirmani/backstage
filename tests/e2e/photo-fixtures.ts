import type { Page } from "@playwright/test";

/** Allowlisted official photo hosts (scripts/venue-photos.mjs). Tests never load the venues' real images. */
export const officialPhotoHosts =
  /^https:\/\/(ofissquare\.com\/wp-content\/uploads|saiacs-ceocenter\.com\/images\/uploads|res\.cloudinary\.com\/dkwqszhed\/image\/upload)\//;

/** Deterministic stand-ins for official photos; returns the official URLs the page requested, in order. */
export async function routeOfficialPhotos(page: Page, mode: "ok" | "fail" = "ok") {
  const requested: string[] = [];
  await page.route(officialPhotoHosts, (route) => {
    requested.push(route.request().url());
    if (mode === "fail") return route.abort();
    const hue = requested.length * 47;
    return route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="hsl(${hue} 35% 55%)"/><text x="20" y="160" font-size="28" fill="white">Fixture photo</text></svg>`,
    });
  });
  return requested;
}
