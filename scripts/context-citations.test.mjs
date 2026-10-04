import assert from "node:assert/strict";
import test from "node:test";
import {verifyVenueEvidence} from "./context-citations.mjs";

const sharedUrl = "https://ofissquare.com/events-spaces/";
const venues = [
  {_id: "masters", name: "Masters’ Union Campus", city: "Delhi NCR", locality: "DLF Cyber Park, Udyog Vihar Phase III, Gurugram", sources: [{_id: "masters-src", title: "Masters Union public pages", url: "https://mastersunion.org/for-companies"}]},
  {_id: "ofis-gurugram", name: "Ofis Square — Sohna Road", city: "Delhi NCR", locality: "Sohna Road, Gurugram", sources: [{_id: "ofis-src", title: "Book Corporate Event Spaces in Noida & Gurgaon", url: sharedUrl}]},
  {_id: "ofis-noida", name: "Ofis Square — Sector 62, Noida", city: "Delhi NCR", locality: "Sector 62, Noida", sources: [{_id: "ofis-src", title: "Book Corporate Event Spaces in Noida & Gurgaon", url: sharedUrl}]},
  {_id: "paytm", name: "Paytm Office, Noida (historical event location)", city: "Delhi NCR", locality: "Noida", sources: [{_id: "paytm-src", title: "Thinkfluence event listing", url: "https://gdg.community.dev/events/details/google-gdg-cloud-noida-presents-thinkfluence/"}]},
  {_id: "saiacs", name: "SAIACS CEO Centre", city: "Bengaluru", locality: "North Bengaluru", sources: [{_id: "saiacs-src", title: "SAIACS CEO Centre", url: "https://saiacs-ceocenter.com/"}]},
  {_id: "shifu", name: "Shifu Den", city: "Bengaluru", locality: "Bengaluru (neighborhood not stated)", sources: [{_id: "shifu-src", title: "Shifu Den", url: "https://den.shifuventures.com/"}]},
];

function section(venue, citation = "", url = venue.sources[0].url) {
  return `## ${venue.name} — ${venue.locality}\nDocumented facilities and event hosting details.${citation}\nSource: [${venue.sources[0].title}](${url})\nCapacity: Unknown. Availability: Unknown. Price: Unknown. Backstage booking authority: Unknown.`;
}

function sourceList(items) {
  return `\n## Sources\n${items.map(({number, venue, url}) => `${number}. ${venue.name} — Dataset${url ? ` (${url})` : ""}`).join("\n")}`;
}

test("detects swapped venue footnotes even when the correct shared URL is inline", () => {
  const gurugram = venues.find(({_id}) => _id === "ofis-gurugram");
  const noida = venues.find(({_id}) => _id === "ofis-noida");
  const entry = {
    path: "facilities_and_equipment",
    text: `${section(gurugram, " [1]")}\n\n${section(noida, " [2]")}${sourceList([
      {number: 1, venue: noida},
      {number: 2, venue: gurugram},
    ])}`,
  };
  const result = verifyVenueEvidence([entry], [gurugram, noida]);
  assert.ok(result.issues.some((issue) => issue.includes("Ofis Square — Sohna Road") && issue.includes("footnote [1]")));
  assert.ok(result.issues.some((issue) => issue.includes("Ofis Square — Sector 62, Noida") && issue.includes("footnote [2]")));
  assert.equal(result.checks.every(({valid}) => !valid), true);
});

test("requires evidence coverage for every expected venue", () => {
  const allButShifu = venues.slice(0, -1);
  const entries = allButShifu.map((venue) => ({
    path: `venues/${venue._id}`,
    text: `# ${venue.name} — ${venue.locality}\n${section(venue)}`,
  }));
  const result = verifyVenueEvidence(entries, venues);
  assert.ok(result.issues.some((issue) => issue.includes("Shifu Den") && issue.includes("not found")));
  assert.equal(result.foundVenueIds.length, 5);
});

test("accepts a canonical original URL in the correctly referenced footnote", () => {
  const venue = venues.find(({_id}) => _id === "paytm");
  const entry = {
    path: "venues/delhi_ncr/paytm_office_noida",
    text: `# ${venue.name} — ${venue.locality}\nHistorical event evidence [1]. Capacity: Unknown. Availability: Unknown. Price: Unknown. Backstage booking authority: Unknown.${sourceList([
      {number: 1, venue, url: "https://gdg.community.dev/events/details/google-gdg-cloud-noida-presents-thinkfluence"},
    ])}`,
  };
  const result = verifyVenueEvidence([entry], [venue]);
  assert.deepEqual(result.issues, []);
  assert.equal(result.checks[0].valid, true);
  assert.deepEqual(result.checks[0].matchedUrls, ["https://gdg.community.dev/events/details/google-gdg-cloud-noida-presents-thinkfluence"]);
});

test("keeps Ofis locations distinct when both cite the same official page", () => {
  const locations = venues.filter(({_id}) => _id.startsWith("ofis-"));
  const entries = locations.map((venue) => ({
    path: `venues/${venue._id}`,
    text: `# ${venue.name} — ${venue.locality}\nDocumented event spaces.\nSource: [${venue.sources[0].title}](${sharedUrl})\nCapacity: Unknown. Availability: Unknown. Price: Unknown. Backstage booking authority: Unknown.`,
  }));
  const result = verifyVenueEvidence(entries, locations);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.checks.map(({venue}) => venue._id).sort(), ["ofis-gurugram", "ofis-noida"]);
  assert.deepEqual(result.checks.map(({matchedUrls}) => matchedUrls), [["https://ofissquare.com/events-spaces"], ["https://ofissquare.com/events-spaces"]]);
});

test("inline links inside a venue's own section map to that venue's source IDs only", () => {
  const saiacs = venues.find(({_id}) => _id === "saiacs");
  const shifu = venues.find(({_id}) => _id === "shifu");
  const result = verifyVenueEvidence([{path: "venues/bengaluru/saiacs", text: section(saiacs)}], [saiacs]);
  assert.equal(result.checks[0].valid, true);
  assert.deepEqual(result.checks[0].inlineSourceIds, ["saiacs-src"]);
  const foreign = verifyVenueEvidence([{path: "venues/bengaluru/saiacs", text: section(saiacs, "", shifu.sources[0].url)}], [saiacs]);
  assert.deepEqual(foreign.checks[0].inlineSourceIds, [], "another venue's URL never vouches for this venue");
  assert.equal(foreign.checks[0].valid, false);
});
