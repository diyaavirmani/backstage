import { test, expect, type Page } from "@playwright/test";
import enrichment from "../../src/data/venue-enrichment.json";
import { routeOfficialPhotos as fixtureImages } from "./photo-fixtures";

const artifacts = ".playwright-artifacts/product-improvements";
const galleryOf = (venueId: string) =>
  enrichment.galleries.find((gallery) => gallery.venueId === venueId)!;
const sohna = galleryOf("venue-ofis-gurugram-sohna-road");
const sector62 = galleryOf("venue-ofis-noida-sector-62");

const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test("catalog thumbnails preview on hover and keyboard focus, and open an accessible gallery", async ({
  page,
}) => {
  const requested = await fixtureImages(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/venues?city=Delhi+NCR&q=Ofis");
  const card = page.locator('[data-venue-id="venue-ofis-gurugram-sohna-road"]');
  const noida = page.locator('[data-venue-id="venue-ofis-noida-sector-62"]');
  const trigger = card.getByRole("button", { name: /View photos of Ofis Square — Sohna Road \(4\)/ });
  await expect(trigger).toBeVisible();
  await expect(card.locator(".venue-thumb img")).toHaveAttribute("src", sohna.photos[0].thumbnailUrl);
  await expect(noida.locator(".venue-thumb img")).toHaveAttribute("src", sector62.photos[0].thumbnailUrl);
  await expect.poll(() => requested.includes(sohna.photos[0].thumbnailUrl)).toBe(true);
  // Only first thumbnails load up front; previews and full gallery images wait for interaction.
  expect(requested.filter((url) => url === sohna.photos[1].thumbnailUrl || url === sohna.photos[0].imageUrl)).toEqual([]);
  // Ofis branches never share or swap photos.
  const sohnaUrls = sohna.photos.flatMap((photo) => [photo.thumbnailUrl, photo.imageUrl]);
  expect(sector62.photos.some((photo) => sohnaUrls.includes(photo.imageUrl))).toBe(false);
  expect(await card.innerHTML()).not.toMatch(/sector-62|auditorium-|movie-Theatre|conferenceroom|Rectangle52/i);

  await trigger.hover();
  await expect(card.locator(".photo-preview img")).toHaveCount(3);
  await expect.poll(() => requested.includes(sohna.photos[1].thumbnailUrl)).toBe(true);
  await page.mouse.move(5, 5);
  await expect(card.locator(".photo-preview")).toHaveCount(0);

  await page.keyboard.press("Shift");
  await trigger.focus();
  await expect(card.locator(".photo-preview img")).toHaveCount(3);
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Photos — Ofis Square — Sohna Road" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close details" })).toBeFocused();
  const main = dialog.locator(".gallery-frame img");
  await expect(main).toHaveAttribute("src", sohna.photos[0].imageUrl);
  await expect(main).toHaveAttribute("alt", sohna.photos[0].alt);
  await expect(dialog).toContainText("Photo 1 of 4");
  await expect(dialog).toContainText(sohna.photos[0].caption);
  await expect(dialog).toContainText("Why this venue: Events page text beside it");
  await expect(dialog).toContainText("Photo: Ofis Square");
  await expect(dialog).toContainText("No reuse licence found");
  await expect(dialog).toContainText("do not establish capacity, current layout, eligibility or availability");
  await expect(dialog.getByRole("link", { name: /Source: Book Corporate Event Spaces/ })).toHaveAttribute(
    "href",
    "https://ofissquare.com/events-spaces/",
  );
  await page.keyboard.press("ArrowRight");
  await expect(dialog).toContainText("Photo 2 of 4");
  await expect(main).toHaveAttribute("src", sohna.photos[1].imageUrl);
  await dialog.getByRole("button", { name: "Next photo" }).click();
  await expect(dialog).toContainText("Photo 3 of 4");
  await dialog.getByRole("button", { name: "Previous photo" }).click();
  await expect(dialog).toContainText("Photo 2 of 4");
  await page.keyboard.press("End");
  await expect(dialog).toContainText("Photo 4 of 4");
  await page.keyboard.press("ArrowRight");
  await expect(dialog).toContainText("Photo 1 of 4");
  const third = dialog.getByRole("button", { name: /^Photo 3:/ });
  await third.click();
  await expect(third).toHaveAttribute("aria-current", "true");
  await expect(main).toHaveAttribute("src", sohna.photos[2].imageUrl);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.closest("dialog") !== null)).toBe(true);
  }
  await page.screenshot({ path: `${artifacts}/gallery-1440.png` });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(card.locator(".photo-preview")).toHaveCount(0);
  // Filters and evidence are untouched by the gallery.
  await expect(page).toHaveURL(/city=Delhi\+NCR&q=Ofis$/);
  await expect(page.getByLabel("Search venues or locality")).toHaveValue("Ofis");
  await expect(card.getByRole("link", { name: /Official hosting information/ })).toBeVisible();
  await page.screenshot({ path: `${artifacts}/photos-catalog-1440.png` });
});

test("link-only and missing galleries, failed loads, and direct reloads keep evidence usable", async ({
  page,
}) => {
  await fixtureImages(page, "fail");
  await page.goto("/venues?city=Delhi+NCR");
  const masters = page.locator('[data-venue-id="venue-masters-union-gurugram"]');
  await expect(masters.getByRole("link", { name: /Official photos/ })).toHaveAttribute(
    "href",
    "https://mastersunion.org/book-a-campus-tour",
  );
  await expect(masters.locator("img")).toHaveCount(0);
  const paytm = page.locator('[data-venue-id="venue-paytm-office-noida"]');
  await expect(paytm.locator(".venue-photos")).toHaveCount(0);
  await expect(paytm.getByRole("button", { name: /View photos/ })).toHaveCount(0);

  const noida = page.locator('[data-venue-id="venue-ofis-noida-sector-62"]');
  await expect(noida.locator(".venue-thumb")).toContainText("Photo unavailable");
  await noida.getByRole("button", { name: /View photos/ }).click();
  const dialog = page.getByRole("dialog", { name: /Photos — Ofis Square — Sector 62/ });
  await expect(dialog).toContainText("This photo could not be loaded.");
  await expect(dialog.getByRole("link", { name: "View it on the official page" })).toHaveAttribute(
    "href",
    "https://ofissquare.com/events-spaces/",
  );
  await page.keyboard.press("Escape");
  for (const name of ["View evidence"])
    await expect(noida.getByRole("button", { name })).toBeVisible();
  await expect(noida.getByRole("link", { name: "Start an event brief →" })).toBeVisible();
  await expect(noida.getByRole("link", { name: "hello@ofissquare.com" })).toBeVisible();
  await expect(noida.getByRole("link", { name: /Official hosting information/ })).toBeVisible();

  await page.goto("/venues?city=Bengaluru&q=SAIACS");
  await page.reload();
  const saiacs = page.locator('[data-venue-id="venue-saiacs-ceo-centre-bengaluru"]');
  await expect(saiacs.getByRole("button", { name: /View photos of SAIACS CEO Centre \(5\)/ })).toBeVisible();
  await expect(page.getByLabel("Filter by city")).toHaveValue("Bengaluru");
});

test("mobile tap and swipe open and move through the gallery without overflow", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await fixtureImages(page);
  await page.goto("/venues?city=Bengaluru");
  const shifu = page.locator('[data-venue-id="venue-shifu-den-bengaluru"]');
  const trigger = shifu.getByRole("button", { name: /View photos of Shifu Den \(4\)/ });
  await trigger.tap();
  await expect(shifu.locator(".photo-preview")).toHaveCount(0);
  const dialog = page.getByRole("dialog", { name: "Photos — Shifu Den" });
  await expect(dialog).toContainText("Photo 1 of 4");
  await expect(dialog).toContainText("Event");
  const frame = dialog.locator(".gallery-frame");
  const box = (await frame.boundingBox())!;
  const swipe = async (fromX: number, toX: number) => {
    await frame.dispatchEvent("pointerdown", { clientX: fromX, clientY: box.y + 60, pointerType: "touch", isPrimary: true });
    await frame.dispatchEvent("pointerup", { clientX: toX, clientY: box.y + 70, pointerType: "touch", isPrimary: true });
  };
  await swipe(box.x + box.width - 20, box.x + 20);
  await expect(dialog).toContainText("Photo 2 of 4");
  await swipe(box.x + 20, box.x + box.width - 20);
  await expect(dialog).toContainText("Photo 1 of 4");
  await dialog.getByRole("button", { name: "Next photo" }).tap();
  await expect(dialog).toContainText("Photo 2 of 4");
  expect(await page.evaluate(() => {
    const dialogBox = document.querySelector("dialog[open]")!.getBoundingClientRect();
    return dialogBox.left >= 0 && dialogBox.right <= innerWidth;
  })).toBe(true);
  await page.screenshot({ path: `${artifacts}/gallery-390.png` });
  await dialog.getByRole("button", { name: "Close details" }).tap();
  await expect(trigger).toBeFocused();
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await noOverflow(page)).toBe(true);
    await page.screenshot({ path: `${artifacts}/photos-catalog-${width}.png`, fullPage: true });
  }
  await context.close();
});

test("recommendation photos stay decorative and private-draft actions keep working", async ({
  page,
}) => {
  await fixtureImages(page);
  const photo = sector62.photos[0];
  await page.route("**/api/venue-discovery", (route) =>
    route.fulfill({
      json: {
        message: "Deterministic photo fixture.",
        recommendations: [
          {
            venueId: "venue-ofis-noida-sector-62",
            name: "Ofis Square — Sector 62, Noida",
            city: "Delhi NCR",
            locality: "Sector 62, Noida",
            relationshipStatus: "research-lead",
            historical: false,
            documentedFacts: [],
            requirementCoverage: [{ requirement: "Capacity for 80 guests", status: "unknown", evidence: [] }],
            importantUnknowns: [],
            documentedConflicts: [],
            sourceReferences: [{ id: "source-ofis-events", title: "Ofis events", url: "https://ofissquare.com/events-spaces/" }],
            contacts: [],
            gallery: {
              displayPolicy: "embed",
              rightsNote: sector62.rightsNote,
              checkedAt: "2026-10-05",
              officialGallery: { id: "source-ofis-noida-sector-62", title: "Ofis Square coworking space, Noida Sector 62", url: "https://ofissquare.com/coworking-space-in-noida-sector-62/" },
              photos: [{ ...photo, id: photo.key, photoDate: null, source: { id: "source-ofis-events", title: "Ofis events", url: "https://ofissquare.com/events-spaces/" } }],
            },
            nextStep: "Ask the host.",
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
  const card = page.locator(".recommendation-card");
  await card.getByRole("button", { name: /View photos of Ofis Square — Sector 62, Noida \(1\)/ }).click();
  const dialog = page.getByRole("dialog", { name: /Photos — Ofis Square — Sector 62/ });
  await expect(dialog).toContainText(photo.caption);
  await expect(dialog.getByRole("button", { name: "Next photo" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  // A photo never changes requirement evidence: capacity stays unknown.
  await expect(card.locator(".requirement-summary")).toContainText("Unknown");
  await page.evaluate(() =>
    window.addEventListener("backstage:prepare-research-application", (event) => {
      (window as unknown as { handoff: unknown }).handoff = (event as CustomEvent).detail;
    }, { once: true }),
  );
  await card.getByRole("button", { name: "Create private draft" }).click();
  const handoff = (await page.evaluate(() => (window as unknown as { handoff: { venueId: string; questions: string[] } }).handoff));
  expect(handoff.venueId).toBe("venue-ofis-noida-sector-62");
  expect(handoff.questions.join(" ")).toContain("Capacity for 80 guests");
});
