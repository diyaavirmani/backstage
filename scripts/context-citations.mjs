const normalize = (value) => String(value)
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

export function canonicalUrl(value) {
  try {
    const parsed = new URL(String(value).replace(/[.,;]+$/, ""));
    if (!/https?:/.test(parsed.protocol)) return null;
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return parsed.href;
  } catch {
    return null;
  }
}

const urlsIn = (text) => [...new Set((String(text).match(/https?:\/\/[^\s)\] >"']+/g) || []).map(canonicalUrl).filter(Boolean))];
const venueNameKey = (venue) => normalize(String(venue.name).replace(/\s*\([^)]*\)\s*$/, ""));
const localityWords = (venue) => normalize(String(venue.locality || "").replace(/\([^)]*\)/g, " "))
  .split(" ")
  .filter((word) => word && !["neighborhood", "neighbourhood", "not", "stated", "unknown"].includes(word));

function headingIdentifiesVenue(heading, venue) {
  const headingWords = new Set(normalize(heading).split(" "));
  const nameWords = venueNameKey(venue).split(" ").filter(Boolean);
  const locationWords = localityWords(venue);
  return nameWords.every((word) => headingWords.has(word)) && locationWords.every((word) => headingWords.has(word));
}

function parseSourceIndex(lines) {
  const sourceHeadings = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/^##\s+Sources\s*$/i.test(lines[index])) sourceHeadings.push(index);
  }
  let sourceStart = -1;
  for (const index of sourceHeadings) {
    if (lines.slice(index + 1).some((line) => /^\s*\d+\.\s+.+$/.test(line))) sourceStart = index;
  }
  const sourceItems = new Map();
  if (sourceStart >= 0) {
    for (const line of lines.slice(sourceStart + 1)) {
      const match = line.match(/^\s*(\d+)\.\s+(.+?)\s*$/);
      if (!match) continue;
      const raw = match[2];
      const sourceUrls = urlsIn(raw);
      const label = raw
        .replace(/https?:\/\/[^\s)\] >"']+/g, " ")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/[\[\]]/g, " ")
        .replace(/\(\s*\)/g, " ")
        .replace(/\s+[—–-]\s+Dataset\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim();
      sourceItems.set(Number(match[1]), {label, urls: sourceUrls});
    }
  }

  const headings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^#{1,3}\s+(.+?)\s*$/);
    if (match) headings.push({index, title: match[1]});
  }
  return {sourceStart, sourceItems, headings};
}

function sourceIdentity(item, venue, venues) {
  if (!item) return {matches: false, sourceIds: [], reason: "citation has no matching entry in the Sources list"};
  const labelKey = normalize(item.label);
  const namedVenue = venues.find((candidate) => normalize(candidate.name) === labelKey);
  if (namedVenue) {
    return namedVenue._id === venue._id
      ? {matches: true, sourceIds: (venue.sources || []).map((source) => source._id), reason: null}
      : {matches: false, sourceIds: [], reason: `source label identifies ${namedVenue.name}`};
  }

  const titleMatches = (venue.sources || []).filter((source) => normalize(source.title) === labelKey);
  if (titleMatches.length) return {matches: true, sourceIds: titleMatches.map((source) => source._id), reason: null};

  const knownOtherTitle = venues.flatMap((candidate) => (candidate.sources || []).map((source) => ({candidate, source})))
    .find(({source}) => normalize(source.title) === labelKey);
  if (knownOtherTitle) return {matches: false, sourceIds: [], reason: `source label identifies source ${knownOtherTitle.source._id}`};

  const urlMatches = (venue.sources || []).filter((source) => item.urls.includes(canonicalUrl(source.url)));
  const identitiesFromUrls = venues.flatMap((candidate) => (candidate.sources || [])
    .filter((source) => item.urls.includes(canonicalUrl(source.url)))
    .map(() => candidate._id));
  if (urlMatches.length && identitiesFromUrls.includes(venue._id)) {
    return {matches: true, sourceIds: urlMatches.map((source) => source._id), reason: null};
  }
  return {matches: false, sourceIds: [], reason: "source label or URL does not resolve to this venue's published source records"};
}

/**
 * Verify every venue-scoped section in the retrieved entries. Footnote numbers
 * are resolved only through that entry's own Sources list. Inline URLs are
 * collected only from the venue section; an unrelated URL elsewhere cannot
 * repair a wrong footnote. Exact venue/source identities and locality tokens
 * keep venues sharing a webpage distinct.
 */
export function verifyVenueEvidence(entries, venues) {
  const checks = [];
  const issues = [];
  const foundById = new Map();

  for (const entry of entries) {
    const lines = String(entry.text).split(/\r?\n/);
    const {sourceStart, sourceItems, headings} = parseSourceIndex(lines);
    const venueHeadings = headings.flatMap((heading) => venues
      .filter((venue) => headingIdentifiesVenue(heading.title, venue))
      .map((venue) => ({...heading, venue})));

    for (let index = 0; index < venueHeadings.length; index += 1) {
      const current = venueHeadings[index];
      const nextVenueHeading = venueHeadings[index + 1]?.index ?? lines.length;
      const end = sourceStart >= 0 && sourceStart > current.index && sourceStart < nextVenueHeading ? sourceStart : nextVenueHeading;
      const scopedText = lines.slice(current.index, end).join("\n");
      const inlineUrls = urlsIn(scopedText);
      const expectedSources = venueSources(current.venue);
      const expectedUrls = [...new Set(expectedSources.map((source) => canonicalUrl(source.url)).filter(Boolean))];
      const citations = [...new Set([...scopedText.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1])))];
      const associations = citations.map((number) => {
        const item = sourceItems.get(number);
        const identity = sourceIdentity(item, current.venue, venues);
        const citedUrls = item?.urls || [];
        const badUrl = citedUrls.some((url) => !expectedUrls.includes(url));
        return {
          number,
          label: item?.label || null,
          sourceIds: identity.sourceIds,
          matchedUrls: citedUrls.filter((url) => expectedUrls.includes(url)),
          valid: identity.matches && !badUrl,
          reason: !identity.matches ? identity.reason : badUrl ? "footnote includes a URL outside this venue's published source set" : null,
        };
      });

      const citationIssues = associations.filter(({valid}) => !valid);
      for (const citation of citationIssues) {
        issues.push(`${current.venue.name} in ${entry.path} footnote [${citation.number}] → ${citation.label || "missing source"}: ${citation.reason}`);
      }
      const matchedInlineUrls = inlineUrls.filter((url) => expectedUrls.includes(url));
      const matchedFootnoteUrls = associations.filter(({valid}) => valid).flatMap(({matchedUrls}) => matchedUrls);
      const coveredUrls = new Set([...matchedInlineUrls, ...matchedFootnoteUrls]);
      const missingUrls = expectedUrls.filter((url) => !coveredUrls.has(url));
      if (missingUrls.length) issues.push(`${current.venue.name} in ${entry.path} is missing published source URL(s): ${missingUrls.join(", ")}`);

      const sectionWords = new Set(normalize(scopedText).split(" "));
      const missingLocality = localityWords(current.venue).filter((word) => !sectionWords.has(word));
      if (missingLocality.length) issues.push(`${current.venue.name} in ${entry.path} does not preserve locality tokens: ${missingLocality.join(", ")}`);

      const uncertainty = /unknown|not established|not stated|not specified|not published|not documented|not authorized|does not authorize/;
      const semanticUnknowns = [
        ["capacity", /capacity|seats|guest count/],
        ["availability", /availability|calendar/],
        ["price", /price|pricing|sponsorship/],
        ["booking authority", /booking authority|backstage.*authorize|backstage.*book|backstage.*reserve/],
      ];
      const linesWithNeighbors = scopedText.split(/\r?\n/).map((line, index, all) => normalize(`${line} ${all[index + 1] || ""}`));
      const scopedWords = normalize(scopedText);
      const explicitUnknownSection = /what remains unknown|what is unknown|what is not known|unknown and unverified|status and unknowns/.test(scopedWords);
      for (const [label, concept] of semanticUnknowns) {
        const statedUnknown = linesWithNeighbors.some((line) => concept.test(line) && uncertainty.test(line));
        if (!statedUnknown && !(explicitUnknownSection && concept.test(scopedWords))) issues.push(`${current.venue.name} in ${entry.path} does not preserve explicit unknown ${label}`);
      }

      const check = {
        venue: current.venue,
        path: entry.path,
        heading: current.title,
        citationLabels: associations,
        matchedUrls: [...coveredUrls],
        expectedUrls,
        valid: citationIssues.length === 0 && missingUrls.length === 0 && missingLocality.length === 0,
      };
      checks.push(check);
      const existing = foundById.get(current.venue._id) || [];
      existing.push(check);
      foundById.set(current.venue._id, existing);
    }
  }

  for (const venue of venues) {
    const found = foundById.get(venue._id) || [];
    if (!found.length) issues.push(`${venue.name} (${venue._id}) was not found in any retrieved Knowledge Base entry`);
    else if (!found.some(({valid}) => valid)) issues.push(`${venue.name} has no valid source-backed venue section among its retrieved entries`);
  }
  return {checks, issues, foundVenueIds: [...foundById.keys()]};
}

function venueSources(venue) {
  const byId = new Map((venue.sources || []).map((source) => [source._id, source]));
  for (const claim of venue.claims || []) for (const source of claim.sources || []) byId.set(source._id, source);
  return [...byId.values()];
}
