import "./load-env.mjs";
import {createMCPClient} from "@ai-sdk/mcp";
import {catalog} from "./catalog-lib.mjs";
import {parseContextOutline} from "./context-outline.mjs";
import {inspectVenueCitations} from "./context-citations.mjs";

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
const checkStartedAt = new Date().toISOString();
try {
  client = await withDeadline(createMCPClient({
    transport: {type: "http", url: endpoint.toString(), headers: {Authorization: `Bearer ${token}`}},
    initializationOptions: {timeout, maxTotalTimeout: timeout},
    clientName: "backstage-context-check",
  }), "MCP initialization");
  const listed = await withDeadline(client.listTools({options: {timeout, maxTotalTimeout: timeout}}), "MCP tool listing");
  const toolNames = listed.tools.map((tool) => tool.name);
  console.log(`Context check started at: ${checkStartedAt}\nAvailable Context tools: ${toolNames.join(", ") || "(none)"}`);
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
        return {knowledgeBase, path, tag, venueCitations: inspectVenueCitations(entry, catalog.venues, catalog.sources)};
      }));
      for (const result of results) {
        for (const evidence of result.venueCitations) {
          const previous = retrieved.get(evidence.venue.id) || {venue: evidence.venue, paths: [], associations: [], matchedSourceUrls: []};
          previous.paths.push(`${result.knowledgeBase}:${result.path}`);
          previous.associations.push(...evidence.associations);
          previous.matchedSourceUrls.push(...evidence.matchedSourceUrls);
          retrieved.set(evidence.venue.id, previous);
        }
      }
      if (["Delhi NCR", "Bengaluru"].every((city) => [...retrieved.values()].some((item) => item.venue.city === city && item.associations.length))) break;
    }
  };
  await withDeadline(readOutlineEntries(), "Knowledge Base entry reads", 120_000);
  const retrievedVenues = [...retrieved.entries()];
  const missingCities = ["Delhi NCR", "Bengaluru"].filter((city) => !retrievedVenues.some(([, value]) => value.venue.city === city && value.associations.length));
  const mismatches = retrievedVenues.flatMap(([, value]) => value.associations.filter(({matchesVenue}) => !matchesVenue).map(({number, label}) => `${value.venue.name} cites [${number}] → ${label || "missing source label"}`));
  const missingSourceLinks = retrievedVenues.filter(([, value]) => value.associations.length && !value.matchedSourceUrls.length).map(([, value]) => value.venue.name);
  const venuesWithoutCitations = retrievedVenues.filter(([, value]) => !value.associations.length).map(([, value]) => value.venue.name);
  if (missingCities.length || mismatches.length || missingSourceLinks.length || venuesWithoutCitations.length) {
    const details = [
      missingCities.length ? `missing city evidence: ${missingCities.join(", ")}` : null,
      venuesWithoutCitations.length ? `venue sections without numbered citations: ${venuesWithoutCitations.join(", ")}` : null,
      mismatches.length ? `citation/source mismatches: ${mismatches.join("; ")}` : null,
      missingSourceLinks.length ? `venue sections without an original source URL: ${missingSourceLinks.join(", ")}` : null,
    ].filter(Boolean).join(". ");
    throw new Error(`Live Knowledge Base entries were read, but source citations did not verify for both cities. ${details}. Read paths: ${attemptedPaths.join(", ")}. Review generated Knowledge Base citations and rebuild before relying on them.`);
  }
  console.log(`Live Knowledge Base retrieval and venue citation associations verified\nRetrieved at: ${new Date().toISOString()}\nKnowledge Bases: ${knowledgeBases.join(", ")}\nRetrieved venue evidence:\n${retrievedVenues.map(([, value]) => {
    const sources = new Map((value.venue.sourceIds || []).map((id) => [id, catalog.sources.find((source) => source.id === id)]).filter(([, source]) => source));
    return `${value.venue.name} (${value.venue.city})\n  Paths: ${[...new Set(value.paths)].join(", ")}\n  Context citation labels: ${[...new Set(value.associations.map(({number, label}) => `[${number}] ${label}`))].join("; ")}\n  Original source references: ${[...sources.values()].map(({title, url}) => `${title} — ${url}`).join("; ")}`;
  }).join("\n")}`);
} catch (error) {
  console.error(`Live Context check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (client) {
    try { await withDeadline(client.close(), "MCP close"); }
    catch (error) { console.error(`MCP close warning: ${error instanceof Error ? error.message : String(error)}`); }
  }
}
