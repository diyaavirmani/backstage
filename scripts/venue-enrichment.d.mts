export const enrichment: {
  checkedAt: string;
  sources: Array<{
    id: string;
    title: string;
    url: string;
    publisher: string;
    sourceType: string;
    checkedAt: string;
    reviewNote: string;
  }>;
  contacts: Array<{
    id: string;
    venueIds: string[];
    sourceId: string;
    type: string;
    value: string;
    purpose: string;
    scope: string;
    checkedAt: string;
  }>;
  galleries: Array<{
    id: string;
    venueId: string;
    displayPolicy: string;
    officialGallerySourceId: string;
    rightsNote: string;
    checkedAt: string;
    photos: Array<Record<string, unknown> & { key: string; sourceId: string }>;
  }>;
};
export function validateEnrichment(
  catalogData: { venues?: Array<{ id: string; hostOrganizationId?: string }>; sources?: Array<{ id: string; url: string }> },
  data?: typeof enrichment,
): string[];
export function enrichmentDocuments(data?: typeof enrichment): Array<Record<string, unknown> & { _id: string; _type: string }>;
export function differingFields(expected: Record<string, unknown>, actual: Record<string, unknown> | null | undefined): string[];
