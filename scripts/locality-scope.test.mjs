import assert from 'node:assert/strict';
import test from 'node:test';
import {filterLocalities, parseLocalityIntent} from './locality-scope.mjs';
import {outlineEntryMatchesVenuePath} from './venue-outline-matching.mjs';

const venues = [
  {_id:'venue-ofis-noida-sector-62',name:'Ofis Square Noida',locality:'Sector 62, Noida'},
  {_id:'venue-ofis-gurugram-sohna-road',name:'Ofis Square Gurugram',locality:'Sohna Road, Gurugram'},
];
const selected = (text) => filterLocalities(venues, parseLocalityIntent(text)).map((venue) => venue._id);

test('explicit locality inclusion, exclusion, aliases, and combinations remain unambiguous', () => {
  assert.deepEqual(selected('Only Noida.'), ['venue-ofis-noida-sector-62']);
  assert.deepEqual(selected('Only Gurugram.'), ['venue-ofis-gurugram-sohna-road']);
  assert.deepEqual(selected('Only Gurgaon.'), ['venue-ofis-gurugram-sohna-road']);
  assert.deepEqual(selected('Exclude Noida; show only Gurugram.'), ['venue-ofis-gurugram-sohna-road']);
  assert.deepEqual(selected('Not Gurugram; show Noida.'), ['venue-ofis-noida-sector-62']);
  assert.deepEqual(selected('Show both Noida and Gurugram.'), ['venue-ofis-noida-sector-62','venue-ofis-gurugram-sohna-road']);
  assert.deepEqual(selected('Not only Noida, but also Gurugram.'), ['venue-ofis-noida-sector-62','venue-ofis-gurugram-sohna-road']);
});

test('exclusions win contradictory or ambiguous locality mentions', () => {
  assert.deepEqual(selected('Noida or Gurugram, but not Gurugram.'), ['venue-ofis-noida-sector-62']);
  assert.deepEqual(selected('Exclude Noida.'), ['venue-ofis-gurugram-sohna-road']);
});

test('shared Ofis Square wording does not make location-specific outline paths interchangeable', () => {
  assert.equal(outlineEntryMatchesVenuePath('venues/delhi_ncr/ofis_square_noida', venues[0]), true);
  assert.equal(outlineEntryMatchesVenuePath('venues/delhi_ncr/ofis_square_gurugram', venues[1]), true);
  assert.equal(outlineEntryMatchesVenuePath('venues/delhi_ncr/ofis_square_noida', venues[1]), false);
  assert.equal(outlineEntryMatchesVenuePath('venues/delhi_ncr/ofis_square_gurgaon', venues[0]), false);
});

test("outline eligibility works for per-venue, per-city and topic entries without crossing cities or exclusions", async () => {
  const {outlineEntryIsEligible} = await import("./venue-outline-matching.mjs");
  const noida = {_id: "venue-ofis-noida-sector-62", name: "Ofis Square — Sector 62, Noida", locality: "Sector 62, Noida"};
  const gurugram = {_id: "venue-ofis-gurugram-sohna-road", name: "Ofis Square — Sohna Road", locality: "Sohna Road, Gurugram"};
  const shifu = {_id: "venue-shifu-den-bengaluru", name: "Shifu Den", locality: "Bengaluru"};
  const all = [noida, gurugram, shifu];
  assert.equal(outlineEntryIsEligible("venues/delhi_ncr/ofis_square_gurugram", [gurugram], all, "Delhi NCR"), true);
  assert.equal(outlineEntryIsEligible("venues/delhi_ncr/ofis_square_noida", [gurugram], all, "Delhi NCR"), false, "an excluded venue's own entry stays out");
  assert.equal(outlineEntryIsEligible("venues/delhi_ncr", [gurugram], all, "Delhi NCR"), true, "a city entry is readable; sections are verified per venue");
  assert.equal(outlineEntryIsEligible("venues/bengaluru", [gurugram], all, "Delhi NCR"), false, "never the other city");
  assert.equal(outlineEntryIsEligible("facilities", [shifu], all, "Bengaluru"), true);
  assert.equal(outlineEntryIsEligible("venues/delhi_ncr", [shifu], all, "Bengaluru"), false);
});

test("a shortened locality is accepted only when all its words belong to the published locality", async () => {
  const {localityCompatible} = await import("./locality-scope.mjs");
  assert.equal(localityCompatible("Bengaluru", "Bengaluru (neighborhood not stated)"), true);
  assert.equal(localityCompatible("North Bengaluru", "North Bengaluru"), true);
  assert.equal(localityCompatible("Sector 62", "Sector 62, Noida"), true);
  assert.equal(localityCompatible("Sector 62, Noida", "Sohna Road, Gurugram"), false, "never another branch");
  assert.equal(localityCompatible("Gurugram", "Sector 62, Noida"), false);
  assert.equal(localityCompatible("", "Noida"), false);
});
