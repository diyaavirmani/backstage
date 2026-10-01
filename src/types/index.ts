export type City = "Delhi NCR" | "Bengaluru";

export type SourceReference = {
  title: string;
  url: string;
  publisher?: string;
  accessedAt?: string;
  excerpt?: string;
};

export type Resource = {
  id: string;
  name: string;
  kind: "room" | "equipment" | "service";
  capacity?: number;
  quantity?: number;
  notes?: string;
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
  accessModel: "paid" | "sponsored" | "pro-bono";
  fulfillmentModel: "instant-booking" | "host-approval";
  resources: Resource[];
  sources: SourceReference[];
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
};

export type MatchExplanation = {
  venueId: string;
  reasons: string[];
  unknowns: string[];
  alternatives: string[];
  sourceReferences: SourceReference[];
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
