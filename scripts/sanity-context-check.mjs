import "./load-env.mjs";
import {createMCPClient} from "@ai-sdk/mcp";
import {catalog} from "./catalog-lib.mjs";
import {parseContextOutline} from "./context-outline.mjs";

const url = process.env.SANITY_CONTEXT_MCP_URL;
const token = process.env.SANITY_ORGANIZATION_TOKEN;
if (!url || !token || url.includes("replace-with") || token.includes("replace-with")) {
  console.error("Live Context check not run: set SANITY_CONTEXT_MCP_URL and SANITY_ORGANIZATION_TOKEN in .env.local. Use a Context MCP configured with Knowledge Base sources only and an organization Context Viewer token; local catalogue data does not count as a live check.");
  process.exit(1);
}
const endpoint = new URL(url);
if (endpoint.protocol !== "https:") throw new Error("SANITY_CONTEXT_MCP_URL must use HTTPS.");

let client;
const timeout = 20_000;
const withDeadline = async (promise, label, timeoutMs = timeout) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs / 1000}s`)), timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};
const textContent = (result) => (result?.content || []).filter((part) => part.type === "text").map((part) => part.text).join("\n");
try {
  client = await withDeadline(createMCPClient({
    transport: {type: "http", url: endpoint.toString(), headers: {Authorization: `Bearer ${token}`}},
    initializationOptions: {timeout, maxTotalTimeout: timeout},
    clientName: "backstage-context-check",
  }), "MCP initialization");
  const listed = await withDeadline(client.listTools({options: {timeout, maxTotalTimeout: timeout}}), "MCP tool listing");
  const toolNames = listed.tools.map((tool) => tool.name);
  console.log(`Available Context tools: ${toolNames.join(", ") || "(none)"}`);
  for (const required of ["initial_context", "knowledge_base_read"]) if (!toolNames.includes(required)) {
    throw new Error(`Required tool ${required} is missing. This endpoint may be GROQ-only: remove any dataset attached directly to the MCP and attach the Knowledge Base as its source.`);
  }
  const outlineResult = await withDeadline(client.callTool({name: "initial_context", arguments: {}, options: {timeout, maxTotalTimeout: timeout}}), "initial_context");
  const outline = textContent(outlineResult);
  if (outlineResult.isError) throw new Error(`initial_context returned a tool error: ${outline || "no error detail"}`);
  const outlineEntries = parseContextOutline(outline);
  if (!outlineEntries.length) throw new Error("initial_context returned no Knowledge Base entry paths. Review the documented outline format and confirm the build completed.");
  const knowledgeBases = [...new Set(outlineEntries.map(({knowledgeBase}) => knowledgeBase))];
  if (outlineEntries.length > 100) throw new Error(`The outline contains ${outlineEntries.length} paths across ${knowledgeBases.length} Knowledge Bases; refusing an unbounded catalog-wide read. Narrow the Knowledge Base to the reviewed venue dataset.`);
  const normalize = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const canonicalUrl = (value) => {
    try {
      const parsed = new URL(value.replace(/[.,;]+$/, ""));
      parsed.hash = "";
      return parsed.href;
    } catch { return null; }
  };
  const sourceById = new Map(catalog.sources.map((source) => [source.id, source]));
  const retrieved = new Map();
  const attemptedPaths = [];
  const readOutlineEntries = async () => {
    for (let offset = 0; offset < outlineEntries.length; offset += 4) {
      const batch = outlineEntries.slice(offset, offset + 4);
      attemptedPaths.push(...batch.map(({knowledgeBase, path}) => `${knowledgeBase}:${path}`));
      const results = await Promise.all(batch.map(async ({knowledgeBase, path, tag}) => {
        const readResult = await withDeadline(client.callTool({name: "knowledge_base_read", arguments: {knowledgeBase, paths: [path]}, options: {timeout, maxTotalTimeout: timeout}}), `knowledge_base_read (${knowledgeBase}: ${path})`);
        const entry = textContent(readResult);
        if (readResult.isError) throw new Error(`knowledge_base_read returned a tool error for ${knowledgeBase}:${path}: ${entry || "no error detail"}`);
        if (!entry.trim()) throw new Error(`Knowledge Base read returned no content for ${knowledgeBase}:${path}. Inspect Knowledge Base issues and rebuild.`);
        const urls = [...new Set(entry.match(/https?:\/\/[^\s)\]>"']+/g) || [])].map((url) => ({url, canonical: canonicalUrl(url)})).filter(({canonical}) => canonical);
        const normalizedEntry = normalize(entry);
        const venues = catalog.venues.filter((venue) => normalizedEntry.includes(normalize(venue.name)));
        const citedVenues = [];
        for (const venue of venues) {
          const venueClaims = venue.claims || [];
          const sourceIds = new Set([
            ...(venue.sourceIds || []),
            ...venueClaims.flatMap((claim) => claim.sourceIds || []),
          ]);
          const citations = urls.filter(({canonical}) => [...sourceIds].some((sourceId) => canonicalUrl(sourceById.get(sourceId)?.url || "") === canonical));
          if (citations.length) citedVenues.push({venue, citations});
        }
        return {knowledgeBase, path, tag, entry, citedVenues};
      }));
      for (const result of results) {
        for (const {venue, citations} of result.citedVenues) {
          const previous = retrieved.get(venue.name) || {city: venue.city, paths: [], citations: new Map()};
          previous.paths.push(`${result.knowledgeBase}:${result.path}`);
          for (const {url, canonical} of citations) {
            const source = catalog.sources.find((item) => canonicalUrl(item.url) === canonical);
            const supportedClaims = (venue.claims || []).filter((claim) => (claim.sourceIds || []).includes(source?.id));
            previous.citations.set(canonical, {url, claimDescriptions: supportedClaims.map((claim) => claim.claim)});
          }
          retrieved.set(venue.name, previous);
        }
      }
      if (["Delhi NCR", "Bengaluru"].every((city) => [...retrieved.values()].some((item) => item.city === city && item.citations.size))) break;
    }
  };
  await withDeadline(readOutlineEntries(), "Knowledge Base entry reads", 120_000);
  const retrievedVenues = [...retrieved.entries()];
  const missingCities = ["Delhi NCR", "Bengaluru"].filter((city) => !retrievedVenues.some(([, value]) => value.city === city && value.citations.size));
  if (missingCities.length) {
    throw new Error(`Live entries did not return source-cited venue information for both cities; missing: ${missingCities.join(", ")}. Read ${attemptedPaths.length} outline entries; cited ${retrievedVenues.length} catalog venue records. Review the Knowledge Base query, source URLs, and build.`);
  }
  console.log(`Live Knowledge Base retrieval succeeded\nRetrieved at: ${new Date().toISOString()}\nKnowledge Bases: ${knowledgeBases.join(", ")}\nRetrieved venue evidence:\n${retrievedVenues.map(([name, value]) => `${name} (${value.city})\n  Paths: ${[...new Set(value.paths)].join(", ")}\n  Citations: ${[...value.citations.values()].map(({url, claimDescriptions}) => `${url}${claimDescriptions.length ? ` — ${[...new Set(claimDescriptions)].join("; ")}` : ""}`).join("; ")}`).join("\n")}`);
} catch (error) {
  console.error(`Live Context check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (client) {
    try { await withDeadline(client.close(), "MCP close"); }
    catch (error) { console.error(`MCP close warning: ${error instanceof Error ? error.message : String(error)}`); }
  }
}
