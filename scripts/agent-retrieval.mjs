export function assertContextTools(toolNames) {
  const names = new Set(toolNames || []);
  for (const required of ["initial_context", "knowledge_base_read"]) {
    if (!names.has(required)) throw new Error(`Required Sanity Context tool ${required} is unavailable.`);
  }
}

export function assertContextOutline(entries) {
  if (!Array.isArray(entries) || entries.length === 0) throw new Error("The Context outline contains no Knowledge Base entry paths.");
  if (entries.length > 80) throw new Error("The Context outline exceeds the bounded entry limit.");
  if (entries.some((entry) => !entry.knowledgeBase || !entry.path)) throw new Error("The Context outline contains an invalid Knowledge Base path.");
}

export function assertKnowledgeReads(entries, modelToolCalls) {
  if (!modelToolCalls || !entries?.length) throw new Error("The model did not read a Knowledge Base entry; no recommendations can be returned.");
  if (entries.some((entry) => !entry.text?.trim() || !entry.knowledgeBase || !entry.path)) throw new Error("A Knowledge Base entry read was empty or incomplete.");
}
