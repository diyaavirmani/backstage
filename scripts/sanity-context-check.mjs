import "./load-env.mjs";
import {createMCPClient} from "@ai-sdk/mcp";
import {catalog} from "./catalog-lib.mjs";

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
const withDeadline = async (promise, label) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeout / 1000}s`)), timeout); }),
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
  const idMatch = outline.match(/Knowledge Base id\s*:\s*([\w-]+)/i) || outline.match(/knowledgeBase\s*[=:]\s*["']?([\w-]+)/i);
  if (outlineResult.isError) throw new Error(`initial_context returned a tool error: ${outline || "no error detail"}`);
  if (!idMatch) throw new Error("initial_context returned no Knowledge Base ID. Check that a Knowledge Base is attached and its build completed.");
  const knowledgeBase = idMatch[1];
  const paths = [...new Set([...outline.matchAll(/(?:^|[\s`(])([\w./-]+\.md)(?=[)`\s,]|$)/gim)].map((match) => match[1]))];
  if (!paths.length) throw new Error("initial_context returned no entry paths. Review the Knowledge Base outline and confirm its build completed.");
  if (paths.length > 100) throw new Error(`The outline contains ${paths.length} paths; refusing an unbounded catalog-wide read. Narrow the Knowledge Base to the reviewed venue dataset.`);
  const normalize = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const retrievedPaths = [];
  const retrievedVenues = new Set();
  const citationsByCity = new Map();
  for (let offset = 0; offset < paths.length; offset += 20) {
    const batch = paths.slice(offset, offset + 20);
    const readResult = await withDeadline(client.callTool({name: "knowledge_base_read", arguments: {knowledgeBase, paths: batch}, options: {timeout, maxTotalTimeout: timeout}}), "knowledge_base_read");
    const entry = textContent(readResult);
    if (readResult.isError) throw new Error(`knowledge_base_read returned a tool error for outline paths ${batch.join(", ")}: ${entry || "no error detail"}`);
    if (!entry.trim()) throw new Error(`Knowledge Base read returned no content for outline paths ${batch.join(", ")}. Inspect Knowledge Base issues and rebuild.`);
    const urls = [...new Set(entry.match(/https?:\/\/[^\s)\]>"']+/g) || [])];
    const normalizedEntry = normalize(entry);
    const matched = catalog.venues.filter((venue) => normalizedEntry.includes(normalize(venue.name)));
    if (matched.length && !urls.length) throw new Error(`Retrieved venue information for ${matched.map((venue) => venue.name).join(", ")}, but found no source URL citations. Check source projections and rebuild.`);
    for (const venue of matched) {
      retrievedVenues.add(venue.name);
      const cityUrls = citationsByCity.get(venue.city) || new Set();
      for (const source of urls) cityUrls.add(source);
      citationsByCity.set(venue.city, cityUrls);
    }
    retrievedPaths.push(...batch);
    if (["Delhi NCR", "Bengaluru"].every((city) => citationsByCity.get(city)?.size)) break;
  }
  const missingCities = ["Delhi NCR", "Bengaluru"].filter((city) => !citationsByCity.get(city)?.size);
  if (missingCities.length) throw new Error(`Live entries did not identify source-cited venues in both cities; missing: ${missingCities.join(", ")}. Retrieved ${retrievedVenues.size} catalog venue names from the discovered outline paths. Review the Knowledge Base query and build.`);
  const totalUrls = [...new Set([...citationsByCity.values()].flatMap((set) => [...set]))];
  console.log(`Live Knowledge Base retrieval succeeded\nRetrieved at: ${new Date().toISOString()}\nKnowledge Base: ${knowledgeBase}\nEntry paths read: ${retrievedPaths.join(", ")}\nVenue information: ${[...retrievedVenues].join("; ")}\nCitations (Delhi NCR):\n${[...citationsByCity.get("Delhi NCR")].slice(0, 5).map((source) => `- ${source}`).join("\n")}\nCitations (Bengaluru):\n${[...citationsByCity.get("Bengaluru")].slice(0, 5).map((source) => `- ${source}`).join("\n")}\nTotal distinct citations: ${totalUrls.length}`);
} catch (error) {
  console.error(`Live Context check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (client) {
    try { await withDeadline(client.close(), "MCP close"); }
    catch (error) { console.error(`MCP close warning: ${error instanceof Error ? error.message : String(error)}`); }
  }
}
