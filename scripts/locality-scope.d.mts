export type LocalityIntent = {included: string[]; excluded: string[]; constrained: boolean};
export function parseLocalityIntent(question: string): LocalityIntent;
export function filterLocalities<T extends {locality: string}>(venues: T[], intent: LocalityIntent): T[];
