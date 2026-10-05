const ALIASES = new Map([['noida', 'noida'], ['gurugram', 'gurugram'], ['gurgaon', 'gurugram']]);

/** Parse explicit Delhi NCR locality intent. Exclusions take precedence on ambiguity. */
export function parseLocalityIntent(question) {
  const text = String(question || '').toLowerCase();
  const included = new Set();
  const excluded = new Set();
  const pattern = /\b(noida|gurugram|gurgaon)\b/g;
  for (const match of text.matchAll(pattern)) {
    const locality = ALIASES.get(match[1]);
    const before = text.slice(Math.max(0, match.index - 48), match.index);
    const isNotOnly = /\bnot\s+only\s*$/.test(before);
    const isExcluded = !isNotOnly && /\b(?:not|exclude|excluding|without|except|avoid|other\s+than)\s+(?:(?:the|locality|leads|results)\s+){0,2}$/.test(before);
    (isExcluded ? excluded : included).add(locality);
  }
  for (const locality of excluded) included.delete(locality);
  return {included: [...included], excluded: [...excluded], constrained: included.size > 0 || excluded.size > 0};
}

export function filterLocalities(venues, intent) {
  if (!intent?.constrained) return venues;
  const included = new Set(intent.included);
  const excluded = new Set(intent.excluded);
  const localityOf = (venue) => {
    const value = String(venue.locality || '').toLowerCase();
    return /\bnoida\b/.test(value) ? 'noida' : /\b(?:gurugram|gurgaon)\b/.test(value) ? 'gurugram' : null;
  };
  return venues.filter((venue) => {
    const locality = localityOf(venue);
    if (!locality) return included.size === 0;
    if (excluded.has(locality)) return false;
    return included.size === 0 || included.has(locality);
  });
}

const localityWords = (value) => String(value || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);

/**
 * The model may shorten a locality ("Bengaluru" for "Bengaluru (neighborhood not stated)"). It is accepted only when
 * every word it gives appears in the venue's published locality, so "Sector 62, Noida" never passes for Sohna Road.
 */
export function localityCompatible(candidateLocality, publishedLocality) {
  const given = localityWords(candidateLocality);
  const published = new Set(localityWords(publishedLocality));
  return given.length > 0 && given.every((word) => published.has(word));
}
