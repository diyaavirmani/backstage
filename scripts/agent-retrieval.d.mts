export function assertContextTools(toolNames: string[]): void;
export function assertContextOutline(entries: Array<{knowledgeBase: string; path: string}>): void;
export function assertKnowledgeReads(entries: Array<{knowledgeBase: string; path: string; text: string}>, modelToolCalls: number): void;
