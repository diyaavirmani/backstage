import type { EventBrief } from "../src/types/index";
export const audienceChoices: string[];
export function parseAudience(value: string): {
  choice: string;
  details: string;
  community: string;
};
export function serializeAudience(value: {
  choice: string;
  details: string;
  community: string;
}): string;
export function deduplicateRequirements(items: string[]): string[];
export function suggestEventSetup(brief: EventBrief): {
  rooms: string[];
  reason: string;
  equipmentPlacement: string;
  assumptions: string[];
};
