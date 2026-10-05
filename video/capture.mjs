import {chromium} from "playwright";
import fs from "node:fs";

// Records real Backstage footage at 1920x1080 against a running server (isolated workspace, real Sanity/KB/model).
// Every action is timestamped (seconds from page creation) so the edit cuts on exact moments.
const base = process.env.CAPTURE_ORIGIN || "http://127.0.0.1:3130";
const out = new URL("./build/raw/", import.meta.url).pathname;
fs.mkdirSync(out, {recursive: true});
const browser = await chromium.launch();
const context = await browser.newContext({viewport: {width: 1920, height: 1080}, recordVideo: {dir: out, size: {width: 1920, height: 1080}}, colorScheme: "light"});
await context.addInitScript(() => {
  const install = () => {
    if (document.getElementById("capture-cursor")) return;
    const cursor = document.createElement("div");
    cursor.id = "capture-cursor";
    cursor.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M3 2l7.5 19 2.7-7.8L21 10.5z" fill="#0d1712" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(cursor.style, {position: "fixed", left: "0px", top: "0px", zIndex: 2147483647, pointerEvents: "none", transform: "translate(-4px,-3px)", opacity: "0", filter: "drop-shadow(0 3px 6px rgba(0,0,0,.35))"});
    document.documentElement.appendChild(cursor);
    const ring = document.createElement("div");
    Object.assign(ring.style, {position: "fixed", width: "44px", height: "44px", marginLeft: "-22px", marginTop: "-22px", borderRadius: "50%", border: "3px solid #9ccf5a", pointerEvents: "none", zIndex: 2147483646, opacity: "0", transition: "transform .45s ease-out, opacity .45s ease-out"});
    document.documentElement.appendChild(ring);
    addEventListener("mousemove", (event) => { cursor.style.opacity = "1"; cursor.style.left = `${event.clientX}px`; cursor.style.top = `${event.clientY}px`; }, true);
    addEventListener("mousedown", (event) => {
      Object.assign(ring.style, {left: `${event.clientX}px`, top: `${event.clientY}px`, transition: "none", transform: "scale(.4)", opacity: "1"});
      requestAnimationFrame(() => requestAnimationFrame(() => Object.assign(ring.style, {transition: "transform .45s ease-out, opacity .45s ease-out", transform: "scale(1.5)", opacity: "0"})));
    }, true);
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", install); else install();
});

const events = {};
function recorder(page, name) {
  const t0 = Date.now();
  events[name] = {marks: []};
  const mark = (label) => { events[name].marks.push({label, t: (Date.now() - t0) / 1000}); console.log(name, label, ((Date.now() - t0) / 1000).toFixed(2)); };
  let position = {x: 960, y: 540};
  const move = async (target, steps = 28) => {
    const box = typeof target.boundingBox === "function" ? await target.boundingBox() : target;
    const point = box.width !== undefined ? {x: box.x + box.width / 2, y: box.y + box.height / 2} : box;
    await page.mouse.move(point.x, point.y, {steps});
    position = point;
    return point;
  };
  const click = async (target, label) => {
    await target.scrollIntoViewIfNeeded();
    await move(target);
    await page.waitForTimeout(160);
    if (label) mark(label);
    await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(220);
  };
  const type = async (target, text, label) => { await click(target, label); await page.keyboard.type(text, {delay: 45}); await page.waitForTimeout(250); };
  const choose = async (target, value, label) => { await target.scrollIntoViewIfNeeded(); await move(target); await page.waitForTimeout(150); if (label) mark(label); await target.selectOption(value); await page.waitForTimeout(350); };
  // Smoothly scroll so the element's top sits a fixed distance below the sticky header.
  const reveal = async (target, offset = 130) => {
    await target.evaluate((element, gap) => window.scrollTo({top: element.getBoundingClientRect().top + window.scrollY - gap, behavior: "smooth"}), offset);
    await page.waitForTimeout(900);
  };
  return {mark, move, click, type, choose, reveal, get position() { return position; }};
}
const date = (() => { const d = new Date(Date.now() + 19 * 86400000); while (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); })();

if (!process.argv.includes("--host-only")) {
// ---------- Organizer: brief → discovery → evidence → private draft ----------
const page = await context.newPage();
const org = recorder(page, "organizer");
await page.goto(`${base}/organizer`, {waitUntil: "networkidle"});
await page.mouse.move(1500, 700);
await page.waitForTimeout(1200);
org.mark("brief-start");
await org.type(page.getByLabel(/Event name/), "Founder Friday meetup", "title");
await org.choose(page.getByLabel("City"), "Bengaluru", "city");
await org.choose(page.getByLabel("Gathering type"), "Community meetup", "type");
await org.choose(page.locator("#brief-audience"), "Founders", "audience");
await org.click(page.getByLabel(/Event date/), "date");
await page.getByLabel(/Event date/).fill(date);
await page.waitForTimeout(300);
await org.type(page.getByLabel(/Attendees/), "30", "attendees");
await page.waitForTimeout(500);
await org.click(page.getByRole("button", {name: "Continue", exact: true}), "continue-1");
await page.waitForTimeout(700);
await org.type(page.getByLabel(/Venue budget/), "0", "budget");
await org.click(page.getByRole("checkbox", {name: "Projector", exact: true}), "projector");
await org.click(page.getByRole("checkbox", {name: "Reliable Wi-Fi", exact: true}), "wifi");
await org.type(page.getByLabel(/Essential requirements/), "Pro bono access for founders", "essential");
await page.waitForTimeout(400);
await org.click(page.getByRole("button", {name: "Continue", exact: true}), "continue-2");
await page.waitForTimeout(1600);
org.mark("review");
await org.move(page.getByRole("button", {name: "Find suitable venues"}));
await page.waitForTimeout(500);
const discovery = page.waitForResponse((response) => response.url().includes("/api/venue-discovery") && response.request().method() === "POST", {timeout: 80_000});
await org.click(page.getByRole("button", {name: "Find suitable venues"}), "find");
const response = await discovery;
const result = await response.json();
fs.writeFileSync(`${out}discovery.json`, JSON.stringify(result, null, 2));
if (!response.ok || !result.recommendations?.length) throw new Error(`Discovery returned ${response.status} with ${result.recommendations?.length ?? 0} leads: ${result.error || result.message}`);
await page.locator(".recommendation-card").first().waitFor();
await page.waitForTimeout(400);
org.mark("results");
const lead = page.locator('.recommendation-card[data-venue-id="venue-shifu-den-bengaluru"]').or(page.locator(".recommendation-card").first()).first();
await org.reveal(page.locator(".verification-trace"), 120);
await page.waitForTimeout(700);
org.mark("trace-visible");
await org.reveal(lead, 110);
org.mark("lead-visible");
await org.move(lead.locator(".venue-locality"));
await page.waitForTimeout(1400);
org.mark("locality");
await org.move(lead.locator(".evidence-highlights li").first());
await page.waitForTimeout(1600);
org.mark("highlight");
const qualification = lead.locator(".evidence-highlights li").nth(1);
if (await qualification.count()) { await org.move(qualification); await page.waitForTimeout(1300); org.mark("qualification"); }
// Evidence view
await org.click(lead.getByRole("button", {name: "View evidence"}), "open-evidence");
const dialog = page.getByRole("dialog");
await dialog.waitFor();
await page.waitForTimeout(900);
org.mark("evidence-open");
const fact = dialog.locator(".evidence-row").first();
await fact.scrollIntoViewIfNeeded();
await org.move(fact.locator("h4"));
await page.waitForTimeout(1500);
org.mark("fact");
const factSource = fact.locator(".source-link").first();
if (await factSource.count()) { await org.move(factSource); await page.waitForTimeout(1500); org.mark("source"); }
const unknowns = dialog.getByRole("heading", {name: "Unknowns and conflicts"});
await unknowns.scrollIntoViewIfNeeded();
await org.move(unknowns);
await page.waitForTimeout(1500);
org.mark("unknowns");
await org.click(dialog.getByRole("button", {name: "Close details"}), "close-evidence");
await page.waitForTimeout(700);
// Private draft
await org.reveal(lead.getByRole("button", {name: "Create private draft"}), 700);
await page.waitForTimeout(300);
await org.click(lead.getByRole("button", {name: "Create private draft"}), "create-draft");
await page.locator("#application-builder").waitFor();
await page.waitForTimeout(1200);
org.mark("builder");
await page.locator("#application-builder .brief-snapshot").scrollIntoViewIfNeeded();
await org.move(page.locator("#application-builder .brief-snapshot"));
await page.waitForTimeout(1300);
org.mark("snapshot");
await org.type(page.getByLabel("Organizer name"), "Demo Organizer", "name");
await org.type(page.getByLabel("Email", {exact: true}), "organizer@example.test", "email");
await org.click(page.getByLabel(/I have reviewed the brief snapshot/), "reviewed");
await org.click(page.getByRole("button", {name: "Save application draft"}), "save");
await page.getByRole("status").filter({hasText: "Application draft saved"}).waitFor({timeout: 40_000});
org.mark("saved");
await page.waitForTimeout(1600);
const saved = page.locator(".application-card").first();
await saved.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
org.mark("saved-card");
await org.move(saved);
await page.waitForTimeout(1500);
org.mark("organizer-end");
await page.close();

}

// ---------- Fictional host demo (isolated workspace; request created off camera through the app API) ----------
const hostPage = await context.newPage();
const host = recorder(hostPage, "host");
await hostPage.goto(`${base}/host`, {waitUntil: "networkidle"});
// Same-origin fetch inside the page shares the workspace cookie (Playwright's request client drops Secure cookies on http).
const submitted = await hostPage.evaluate(async () => {
  const overview = await (await fetch("/api/operations")).json();
  const demo = overview.venues.find((venue) => venue.kind === "demo" && venue.city === "Delhi NCR");
  const resource = (name) => demo.resources.find((item) => item.name === name).id;
  const d = new Date(Date.now() + 3 * 86400000); while (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
  const brief = {id: "video-demo-brief", title: "Community design workshop", city: "Delhi NCR", eventType: "Workshop", date: d.toISOString().slice(0, 10), startTime: "11:00", endTime: "13:00", audience: "Designers", headcount: 20, budgetAmount: 0, currency: "INR", roomRequirements: ["Workshop Studio"], equipmentRequirements: ["Projector"], essentialRequirements: [], flexibleRequirements: [], setupMinutes: 30, cleanupMinutes: 30, savedAt: new Date().toISOString()};
  const response = await fetch("/api/operations", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({type: "submit-application", payload: {venueId: demo.id, brief, organizer: {name: "Demo Organizer", email: "organizer@example.test"}, resources: [{id: resource("Workshop Studio"), quantity: 1}, {id: resource("Projector"), quantity: 1}], questions: [], reviewed: true, idempotencyKey: `video-${Date.now()}`, flexibleSlot: null}})});
  return {status: response.status, body: await response.text()};
});
if (submitted.status !== 200) throw new Error(`Demo request failed: ${submitted.status} ${submitted.body}`);
await hostPage.reload({waitUntil: "networkidle"});
await hostPage.mouse.move(1500, 650);
await hostPage.waitForTimeout(1000);
host.mark("host-start");
await host.choose(hostPage.getByLabel(/Simulation role/), "host", "role");
await hostPage.waitForTimeout(1200);
const request = hostPage.locator(".application-card").filter({hasText: "Community design workshop"}).first();
await request.scrollIntoViewIfNeeded();
const details = request.locator("details.request-details");
if ((await details.getAttribute("open")) === null) await host.click(details.getByText("View application details", {exact: true}), "details");
await hostPage.waitForTimeout(700);
await host.click(request.getByRole("button", {name: "Approve & allocate"}), "approve");
await hostPage.getByRole("heading", {name: /Confirmed events/}).waitFor({timeout: 20_000});
await hostPage.waitForTimeout(900);
host.mark("approved");
const confirmed = hostPage.locator(".application-card").filter({hasText: "Community design workshop"}).first();
await confirmed.scrollIntoViewIfNeeded();
await host.move(confirmed);
await hostPage.waitForTimeout(1300);
host.mark("approved-card");
await host.click(hostPage.getByRole("navigation", {name: "host views"}).getByRole("link", {name: /calendar/i}), "calendar-nav");
await hostPage.waitForTimeout(1500);
await host.choose(hostPage.locator(".calendar-section select").first(), {label: "Backstage Demo House · Delhi NCR · Workshop Studio"}, "filter-studio");
await hostPage.waitForTimeout(900);
if (process.env.CAPTURE_DEBUG) console.log((await hostPage.locator(".calendar-section").first().innerText()).slice(0, 900));
const allocation = hostPage.locator(".calendar-section .calendar-item").filter({hasText: "Community design workshop"}).first();
await host.reveal(allocation, 360);
await host.move(allocation);
await hostPage.waitForTimeout(1500);
host.mark("calendar");
await host.click(hostPage.getByRole("navigation", {name: "host views"}).getByRole("link", {name: "Preparation", exact: true}), "prep-nav");
await hostPage.waitForTimeout(1300);
const task = hostPage.locator('section:not([hidden])').getByRole("checkbox", {name: /host task/i}).first();
await task.scrollIntoViewIfNeeded();
await host.move(task);
await hostPage.waitForTimeout(500);
await host.click(task, "check-task");
await hostPage.waitForTimeout(1800);
host.mark("task-done");
await hostPage.close();

await context.close();
await browser.close();
const videos = fs.readdirSync(out).filter((file) => file.endsWith(".webm")).map((file) => ({file, mtime: fs.statSync(`${out}${file}`).mtimeMs})).sort((a, b) => a.mtime - b.mtime);
const previous = fs.existsSync(`${out}events.json`) ? JSON.parse(fs.readFileSync(`${out}events.json`, "utf8")) : {events: {}, videos: []};
fs.writeFileSync(`${out}events.json`, JSON.stringify({events: {...previous.events, ...events}, videos: videos.map((item) => item.file)}, null, 2));
console.log("videos", videos.map((item) => item.file));
