const IGNORE = new Set(['venue', 'campus', 'office', 'historical', 'event', 'location', 'the']);

/** Match an outline path to one structured venue, including location-specific slugs. */
export function outlineEntryMatchesVenuePath(entryPath, venue) {
  const pathWords = new Set(String(entryPath).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const identityWords = [...new Set(`${String(venue._id || '').replace(/^venue-/, '')} ${venue.name || ''}`
    .toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !IGNORE.has(word)))];
  if (identityWords.filter((word) => pathWords.has(word)).length < 2) return false;

  const pathNoida = pathWords.has('noida');
  const pathGurugram = pathWords.has('gurugram') || pathWords.has('gurgaon');
  const locality = String(venue.locality || '').toLowerCase();
  const venueNoida = /\bnoida\b/.test(locality);
  const venueGurugram = /\b(?:gurugram|gurgaon)\b/.test(locality);
  // If an outline path carries a location discriminator, it must agree with the
  // structured record. This keeps shared Ofis Square wording from merging sites.
  if (pathNoida && !venueNoida) return false;
  if (pathGurugram && !venueGurugram) return false;
  if (venueNoida && pathGurugram) return false;
  if (venueGurugram && pathNoida) return false;
  return true;
}
