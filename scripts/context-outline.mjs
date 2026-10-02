const KNOWLEDGE_BASE_LINE = /^Knowledge base id:\s*`?(kb[\w-]+)`?\s*$/i;
const ENTRY_COUNT_LINE = /^\s*\d+\s+entr(?:y|ies)\.\s*$/i;
const ENTRY_PATH_LINE = /^([^\s/:][^\s/:]*(?:\/[^\s/:][^\s/:]*)*)(?: \[(core|peripheral)\])?\s*$/i;

/**
 * Parse the documented Context initial_context outline format. Entry paths are
 * flush-left rows following an "N entries." line; summaries and annotations
 * are indented. Paths are opaque identifiers and are returned verbatim.
 */
export function parseContextOutline(outline) {
  const entries = [];
  let knowledgeBase = null;
  let inEntries = false;
  const seen = new Set();

  for (const line of String(outline).split(/\r?\n/)) {
    const idMatch = line.match(KNOWLEDGE_BASE_LINE);
    if (idMatch) {
      knowledgeBase = idMatch[1];
      inEntries = false;
      continue;
    }
    if (/^\s*##\s+/.test(line)) {
      inEntries = false;
      continue;
    }
    if (ENTRY_COUNT_LINE.test(line)) {
      inEntries = Boolean(knowledgeBase);
      continue;
    }
    if (!inEntries || !knowledgeBase) continue;

    const match = line.match(ENTRY_PATH_LINE);
    if (!match) continue;
    const path = match[1];
    const key = `${knowledgeBase}\0${path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({knowledgeBase, path, tag: match[2]?.toLowerCase() ?? null});
  }

  return entries;
}
