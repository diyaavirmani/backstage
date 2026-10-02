export type City = "Delhi NCR" | "Bengaluru";

export type SourceReference = {
  id?: string;
  title: string;
  url: string;
  publisher?: string;
  sourceType?: "official-page" | "historical-event-listing" | "host-confirmation" | "other";
  checkedAt?: string;
  accessedAt?: string;
  excerpt?: string;
};

export type EvidenceType =
  | "public-documentation"
  | "host-confirmed"
  | "historical-event"
  | "unknown"
  | "conflicting"
  | "demonstration";

export type VenueClaim = {
  id: string;
  venueId: string;
  subject: string;
  claim: string;
  value: string;
  evidenceType: EvidenceType;
  sourceReferenceIds: string[];
  checkedAt: string;
  historicalDate?: string;
  appliesToSpaceId?: string;
  layout?: string;
  qualification?: string;
};

/** Capacity assertions always name a room and layout; unresolved claims stay in VenueClaim. */
export type CapacityAssertion = {
  guestCount: number;
  appliesToSpaceId: string;
  layout: string;
  sourceReferenceIds: string[];
  checkedAt: string;
};

export type VenueSpace = {
  id: string;
  venueId: string;
  name: string;
  summary: string;
  sourceReferenceIds: string[];
  claimIds: string[];
  capacity?: CapacityAssertion;
};

export type Resource = {
  id: string;
  name: string;
  kind: "room" | "equipment" | "service";
  capacity?: CapacityAssertion;
  quantity?: number;
  notes?: string;
  sourceReferenceIds?: string[];
  availability?: "documented" | "unknown" | "conflicting";
};

export type EventBrief = {
  id: string;
  title: string;
  city: City;
  eventType: string;
  date: string;
  startTime: string;
  endTime: string;
  audience: string;
  headcount: number;
  budgetAmount: number;
  currency: "INR";
  roomRequirements: string[];
  equipmentRequirements: string[];
  essentialRequirements: string[];
  flexibleRequirements: string[];
  setupMinutes: number;
  cleanupMinutes: number;
  savedAt: string;
};

export type HostingOpportunity = {
  id: string;
  venueId: string;
  title: string;
  description: string;
  preferredEventTypes: string[];
  accessModel: "paid" | "sponsored" | "pro-bono" | "unknown";
  fulfillmentModel: "instant-booking" | "host-approval" | "unknown";
  resources: Resource[];
  sources: SourceReference[];
  relationshipStatus?: "research-lead" | "host-confirmed" | "demonstration";
  availability?: "documented" | "unknown" | "conflicting";
};

export type Venue = {
  id: string;
  name: string;
  city: City;
  neighborhood: string;
  description: string;
  resources: Resource[];
  permittedActivities: string[];
  eligibility: string[];
  sources: SourceReference[];
  hostOrganizationId?: string;
  locality?: string;
  spaces?: VenueSpace[];
  claims?: VenueClaim[];
  relationshipStatus?: "research-lead" | "host-confirmed" | "demonstration";
};

export type HostingPolicy = {
  id: string;
  venueId: string;
  title: string;
  statement: string;
  evidenceType: EvidenceType;
  sourceReferenceIds: string[];
  checkedAt: string;
};

export type MatchExplanation = {
  venueId: string;
  reasons: string[];
  unknowns: string[];
  alternatives: string[];
  sourceReferences: SourceReference[];
};

export type RequirementStatus = "supported" | "unknown" | "contradicted";

export type RequirementCoverage = {
  requirement: string;
  status: RequirementStatus;
  evidence: Array<{
    claim: string;
    value: string;
    evidenceType: EvidenceType;
    qualification?: string | null;
  }>;
};

export type VenueRecommendation = {
  venueId: string;
  name: string;
  city: City;
  locality: string;
  relationshipStatus: "research-lead" | "host-confirmed";
  historical: boolean;
  requirementCoverage: RequirementCoverage[];
  documentedFacts: Array<{
    claim: string;
    value: string;
    evidenceType: EvidenceType;
    historicalDate?: string | null;
    qualification?: string | null;
  }>;
  importantUnknowns: Array<{claim: string; value: string; evidenceType: EvidenceType}>;
  documentedConflicts: Array<{claim: string; value: string}>;
  sourceReferences: Array<Pick<SourceReference, "id" | "title" | "url">>;
  nextStep: string;
};

export type BookingRequest = {
  id: string;
  eventBriefId: string;
  venueId: string;
  status: "submitted" | "needs-information" | "approved" | "rejected" | "alternative-proposed";
  requestedResources: string[];
  message?: string;
  createdAt: string;
};

export type ChecklistItem = {
  id: string;
  bookingRequestId: string;
  label: string;
  completed: boolean;
  dueAt?: string;
  owner?: "organizer" | "host";
};
