type VerifiedRecommendation = {
  venueId: string;
  evidencePaths: string[];
  sourceReferences: Array<{id: string; title: string; url: string}>;
  requirementCoverage: Array<{requirement: string; status: "supported" | "unknown" | "contradicted"}>;
};

export function validateAgentRecommendations(args: Record<string, unknown>): {recommendations: VerifiedRecommendation[]; requestedRequirements: string[]};
