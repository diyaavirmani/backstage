const normalize = (value) => String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Check the numbered source footnotes in one Context entry against the venue
 * section they appear in. Context's entry citations can be numbered separately
 * from the order in which a summary mentions its venues, so never infer that
 * every source in an entry supports every venue.
 */
export function inspectVenueCitations(entry, venues, sources = []) {
  const lines = String(entry).split(/\r?\n/);
  const sourceStart = lines.findIndex((line) => /^##\s+Sources\s*$/i.test(line));
  const labels = new Map();
  if (sourceStart >= 0) {
    for (const line of lines.slice(sourceStart + 1)) {
      const match = line.match(/^\s*(\d+)\.\s+(.+?)\s*$/);
      if (match) labels.set(Number(match[1]), match[2].replace(/\s+—\s+Dataset\s*$/i, "").trim());
    }
  }

  const sections = new Map();
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      current = {title: heading[1], body: []};
      sections.set(current.title, current);
      continue;
    }
    if (current) current.body.push(line);
  }

  const result = [];
  for (const venue of venues) {
    const section = [...sections.values()].find(({title}) => normalize(title).includes(normalize(venue.name.split("(")[0])));
    if (!section) continue;
    const citationNumbers = [...new Set([...section.body.join("\n").matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1])))];
    const citedUrls = [...new Set(section.body.join("\n").match(/https?:\/\/[^\s)\] >"']+/g) || [])].map((url) => {
      try {
        const parsed = new URL(url.replace(/[.,;]+$/, ""));
        parsed.hash = "";
        return parsed.href;
      } catch { return null; }
    }).filter(Boolean);
    const expectedUrls = sources.filter((source) => (venue.sourceIds || []).includes(source.id)).map((source) => source.url);
    const matchedSourceUrls = expectedUrls.filter((url) => citedUrls.includes(url));
    const associations = citationNumbers.map((number) => {
      const label = labels.get(number) || null;
      const matchesVenue = Boolean(label && normalize(label).includes(normalize(venue.name)));
      return {number, label, matchesVenue};
    });
    result.push({venue, pathHasVenueSection: true, associations, matchedSourceUrls, valid: associations.length > 0 && associations.every(({matchesVenue}) => matchesVenue) && matchedSourceUrls.length > 0});
  }
  return result;
}
