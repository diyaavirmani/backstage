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
  if (!idMatch) throw new Error("initial_context returned no Knowledge Base ID. Check that a Knowledge Base is attached and its build completed.");
  const knowledgeBase = idMatch[1];
  const knownNames = catalog.venues.map((venue) => venue.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
  const paths = [...new Set([...outline.matchAll(/(?:^|[\s`(])([\w./-]+\.md)(?=[)`\s,]|$)/gim)].map((match) => match[1]))];
  const entryPath = paths.find((candidate) => knownNames.some((name) => candidate.toLowerCase().replace(/[^a-z0-9]+/g, " ").includes(name))) || paths.find((candidate) => /venue/i.test(candidate) && !/outline|index|readme/i.test(candidate));
  if (!entryPath) throw new Error("Could not discover a venue entry path from initial_context. Review the Knowledge Base outline and confirm published venue entries are included.");
  const readResult = await withDeadline(client.callTool({name: "knowledge_base_read", arguments: {knowledgeBase, paths: [entryPath]}, options: {timeout, maxTotalTimeout: timeout}}), "knowledge_base_read");
  const entry = textContent(readResult);
  if (readResult.isError || !entry.trim()) throw new Error(`Knowledge Base read returned no entry for the outline path ${entryPath}. Inspect Knowledge Base issues and rebuild.`);
  const urls = [...new Set(entry.match(/https?:\/\/[^\s)\]>"']+/g) || [])];
  if (!urls.length) throw new Error(`Retrieved ${entryPath}, but found no source URL citations. Check that source references are projected into Knowledge Base entries.`);
  console.log(`Live Knowledge Base retrieval succeeded\nKnowledge Base: ${knowledgeBase}\nEntry path: ${entryPath}\nSource references:\n${urls.slice(0, 5).map((source) => `- ${source}`).join("\n")}`);
} catch (error) {
  console.error(`Live Context check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (client) {
    try { await withDeadline(client.close(), "MCP close"); }
    catch (error) { console.error(`MCP close warning: ${error instanceof Error ? error.message : String(error)}`); }
  }
}
