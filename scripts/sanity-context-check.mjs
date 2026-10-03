import "./load-env.mjs";
import {createMCPClient} from "@ai-sdk/mcp";
import {createClient} from "@sanity/client";
import {catalog} from "./catalog-lib.mjs";
import {canonicalUrl, verifyVenueEvidence} from "./context-citations.mjs";
import {parseContextOutline} from "./context-outline.mjs";

const mcpUrl = process.env.SANITY_CONTEXT_MCP_URL;
const contextToken = process.env.SANITY_ORGANIZATION_TOKEN;
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const projectToken = process.env.SANITY_PROJECT_READ_TOKEN;
const missing = [
  ["SANITY_CONTEXT_MCP_URL", mcpUrl],
  ["SANITY_ORGANIZATION_TOKEN", contextToken],
  ["NEXT_PUBLIC_SANITY_PROJECT_ID", projectId],
  ["NEXT_PUBLIC_SANITY_DATASET", dataset],
  ["SANITY_PROJECT_READ_TOKEN", projectToken],
].filter(([, value]) => !value || value.includes("replace-with")).map(([name]) => name);
if (missing.length) {
  console.error(`Live Context check not run: configure ${missing.join(", ")} in ignored .env.local. Use an organization Context Viewer token for MCP and a project read-only token for published source verification; never expose either in public environment variables.`);
  process.exit(1);
}
const endpoint = new URL(mcpUrl);
if (endpoint.protocol !== "https:") throw new Error("SANITY_CONTEXT_MCP_URL must use HTTPS.");

const timeout = 20_000;
let client;
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
  const sanity = createClient({projectId, dataset, token: projectToken, apiVersion: "2025-02-19", useCdn: false});
  const published = await withDeadline(sanity.fetch(`*[_type == "venue" && knowledgeBaseEligible == true && isDemonstration == false && relationshipStatus == "research-lead"]{
    _id, name, city, locality, relationshipStatus, isDemonstration,
    "sources": sourceReferences[]->{_id, title, url},
    claims[]{_key, subject, claim, value, evidenceType, "sources": sourceReferences[]->{_id, title, url}}
  }`), "Published venue/source verification");
  const expectedById = new Map(catalog.venues.map((venue) => [venue.id, venue]));
  const recordIssues = [];
  const publishedIds = new Set(published.map((venue) => venue._id));
  for (const id of expectedById.keys()) if (!publishedIds.has(id)) recordIssues.push(`published source dataset is missing expected venue ${id}`);
  for (const venue of published) {
    const expected = expectedById.get(venue._id);
    if (!expected) {
      recordIssues.push(`published eligible venue ${venue._id} is outside the reviewed six-venue catalog`);
      continue;
    }
    if (venue.name !== expected.name || venue.city !== expected.city || venue.locality !== expected.locality) recordIssues.push(`published identity/location differs from reviewed record ${venue._id}`);
    const expectedVenueSourceIds = new Set(expected.sourceIds || []);
    const actualVenueSourceIds = new Set((venue.sources || []).filter(Boolean).map((source) => source._id));
    if (expectedVenueSourceIds.size !== actualVenueSourceIds.size || [...expectedVenueSourceIds].some((id) => !actualVenueSourceIds.has(id))) recordIssues.push(`published venue-level source identities differ from the reviewed record ${venue._id}`);
    const expectedClaims = new Map((expected.claims || []).map((claim) => [claim.id, claim]));
    const actualClaims = new Map((venue.claims || []).map((claim) => [claim._key, claim]));
    if (expectedClaims.size !== actualClaims.size) recordIssues.push(`published claim count differs from the reviewed record ${venue._id}`);
    for (const [claimId, expectedClaim] of expectedClaims) {
      const actualClaim = actualClaims.get(claimId);
      if (!actualClaim) {
        recordIssues.push(`published claim ${claimId} is missing from ${venue._id}`);
        continue;
      }
      if (actualClaim.claim !== expectedClaim.claim || actualClaim.value !== expectedClaim.value || actualClaim.subject !== expectedClaim.claimType) recordIssues.push(`published claim text/value/subject differs for ${venue._id}:${claimId}`);
      const expectedClaimSourceIds = new Set(expectedClaim.sourceIds || []);
      const actualClaimSourceIds = new Set((actualClaim.sources || []).filter(Boolean).map((source) => source._id));
      if (expectedClaimSourceIds.size !== actualClaimSourceIds.size || [...expectedClaimSourceIds].some((id) => !actualClaimSourceIds.has(id))) recordIssues.push(`published claim source identities differ for ${venue._id}:${claimId}`);
    }
    const expectedSourceIds = new Set([...expectedVenueSourceIds, ...[...expectedClaims.values()].flatMap((claim) => claim.sourceIds || [])]);
    for (const sourceId of expectedSourceIds) {
      const local = catalog.sources.find((source) => source.id === sourceId);
      const remote = [...(venue.sources || []), ...(venue.claims || []).flatMap((claim) => claim.sources || [])].find((source) => source?._id === sourceId);
      if (!local || !remote || local.title !== remote.title || canonicalUrl(local.url) !== canonicalUrl(remote.url)) recordIssues.push(`published source identity or canonical URL mismatch for ${venue._id}:${sourceId}`);
    }
  }
  if (published.length !== catalog.venues.length) recordIssues.push(`published query returned ${published.length} venues; expected ${catalog.venues.length}`);
  if (recordIssues.length) throw new Error(`Published source verification failed: ${recordIssues.join("; ")}`);

  client = await withDeadline(createMCPClient({
    transport: {type: "http", url: endpoint.toString(), headers: {Authorization: `Bearer ${contextToken}`}},
    initializationOptions: {timeout, maxTotalTimeout: timeout},
    clientName: "backstage-context-check",
  }), "MCP initialization");
  const listed = await withDeadline(client.listTools({options: {timeout, maxTotalTimeout: timeout}}), "MCP tool listing");
  const toolNames = listed.tools.map((tool) => tool.name);
  console.log(`Context check started at: ${checkStartedAt}\nVerified published venue/source records: ${published.length}\nAvailable Context tools: ${toolNames.join(", ") || "(none)"}`);
  for (const required of ["initial_context", "knowledge_base_read"]) if (!toolNames.includes(required)) {
    throw new Error(`Required tool ${required} is missing. This endpoint may be GROQ-only: remove any dataset attached directly to the MCP and attach the Knowledge Base as its source.`);
  }
  const outlineResult = await withDeadline(client.callTool({name: "initial_context", arguments: {}, options: {timeout, maxTotalTimeout: timeout}}), "initial_context");
  const outline = textContent(outlineResult);
  if (outlineResult.isError) throw new Error(`initial_context returned a tool error: ${outline || "no error detail"}`);
  const outlineEntries = parseContextOutline(outline);
  if (!outlineEntries.length) throw new Error("initial_context returned no Knowledge Base entry paths. Review the documented outline format and confirm the build completed.");
  const knowledgeBases = [...new Set(outlineEntries.map(({knowledgeBase}) => knowledgeBase))];
  if (outlineEntries.length > 100) throw new Error(`The outline contains ${outlineEntries.length} paths across ${knowledgeBases.length} Knowledge Bases; refusing an unbounded catalog-wide read.`);
  const entries = [];
  for (const {knowledgeBase, path, tag} of outlineEntries) {
    const result = await withDeadline(client.callTool({name: "knowledge_base_read", arguments: {knowledgeBase, paths: [path]}, options: {timeout, maxTotalTimeout: timeout}}), `knowledge_base_read (${knowledgeBase}: ${path})`);
    const text = textContent(result);
    if (result.isError) throw new Error(`knowledge_base_read returned a tool error for ${knowledgeBase}:${path}: ${text || "no error detail"}`);
    if (!text.trim()) throw new Error(`Knowledge Base read returned no content for ${knowledgeBase}:${path}. Inspect Knowledge Base issues and rebuild.`);
    entries.push({knowledgeBase, path, tag, text});
  }

  const evidence = verifyVenueEvidence(entries, published);
  console.log(`Knowledge Bases: ${knowledgeBases.join(", ")}\nOutline paths read (${entries.length}): ${entries.map(({knowledgeBase, path, tag}) => `${knowledgeBase}:${path}${tag ? ` [${tag}]` : ""}`).join(", ")}`);
  if (evidence.issues.length) {
    console.error(`Live source-backed venue verification failed:\n${evidence.issues.map((issue) => `- ${issue}`).join("\n")}`);
    process.exitCode = 1;
  }
  for (const venue of published) {
    const checks = evidence.checks.filter((item) => item.venue._id === venue._id);
    const best = checks.find((item) => item.valid) || checks[0];
    console.log(`${venue.name} (${venue.city}; ${venue.locality}) — ${best ? `${best.path}; ${best.valid ? "verified" : "needs review"}` : "no venue section found"}`);
    if (best) {
      console.log(`  Published record: ${venue._id}; source IDs: ${[...new Set([...venue.sources, ...venue.claims.flatMap((claim) => claim.sources || [])].filter(Boolean).map((source) => source._id))].join(", ")}`);
      console.log(`  Citation labels: ${best.citationLabels.map(({number, label, valid, reason}) => `[${number}] ${label || "missing"}${valid ? " (matched)" : ` (mismatch: ${reason})`}`).join("; ") || "inline source links"}`);
      console.log(`  Source URLs: ${best.matchedUrls.join(", ")}`);
    }
  }
  if (!evidence.issues.length && published.length === catalog.venues.length) console.log(`Live Knowledge Base source-grounded retrieval succeeded\nRetrieved at: ${new Date().toISOString()}\nAll ${published.length} published venues have identity- and URL-matched evidence.`);
} catch (error) {
  console.error(`Live Context check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (client) {
    try { await withDeadline(client.close(), "MCP close"); }
    catch (error) { console.error(`MCP close warning: ${error instanceof Error ? error.message : String(error)}`); }
  }
}
