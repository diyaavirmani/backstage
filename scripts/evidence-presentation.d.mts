import type { EventBrief, SourceReference, VenueRecommendation } from "../src/types/index";

type LinkSource = Pick<SourceReference, "id" | "title" | "url" | "sourceType" | "checkedAt">;
type FactLike = {
  subject?: string;
  claim: string;
  value: string;
  evidenceType: string;
  qualification?: string | null;
  sourceReferences?: LinkSource[];
};
export function factIsRelevant(fact: FactLike, brief?: EventBrief): boolean;
export function orderVenueFacts<T extends FactLike>(facts: T[], brief?: EventBrief): T[];
export function orderVenueLeads<T extends Pick<VenueRecommendation, "requirementCoverage" | "documentedFacts" | "contacts">>(
  leads: T[],
  brief: EventBrief,
): T[];
export function sourceLabel(subject: string | null | undefined, source?: Partial<LinkSource>, evidenceType?: string): string;
export function labelledSources(
  facts: FactLike[],
  fallbackSources?: LinkSource[],
  brief?: EventBrief,
): Array<LinkSource & { label: string }>;
export function confirmationQuestions(
  venue: Pick<VenueRecommendation, "requirementCoverage" | "importantUnknowns" | "documentedConflicts">,
): string[];
export function audienceLabel(value: string): string;
export function composeEnquiry(input: { venueName: string; brief: EventBrief; questions?: string[] }): string;
