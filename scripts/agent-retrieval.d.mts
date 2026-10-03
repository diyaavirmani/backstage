export function assertContextTools(toolNames: string[]): void;
export function assertContextOutline(entries: Array<{knowledgeBase: string; path: string}>): void;
export function assertKnowledgeReads(entries: Array<{knowledgeBase: string; path: string; text: string}>, modelToolCalls: number): void;
export function candidateHasVerifiedSources(candidate: {venueId:string;entryPaths:string[]}, evidence: {checks:Array<{valid:boolean;venue:{_id:string};path:string;citationLabels:Array<{sourceIds:string[]}>}>}): boolean;
