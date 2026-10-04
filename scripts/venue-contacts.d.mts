import type { VenueContact } from "../src/types/index";

export type RawContactRecord = {
  _id: string;
  venueIds: string[];
  type: string;
  value: string;
  purpose: string;
  scope: string;
  checkedAt: string;
  sourceReferences: Array<{ _id: string; title: string; url: string; checkedAt?: string } | null>;
};
export const contactTypes: VenueContact["type"][];
export const contactScopes: VenueContact["scope"][];
export const contactProjection: string;
export function contactValueIsValid(type: string, value: string, sourceUrls?: string[]): boolean;
export function normalizeContacts(records: RawContactRecord[] | null | undefined, venueId: string): VenueContact[];
export function reviewedContactRecords(
  enrichment: {
    sources?: Array<{ id: string; title: string; url: string; checkedAt?: string }>;
    contacts?: Array<Record<string, unknown> & { id: string; sourceId: string }>;
  },
  catalogSources?: Array<{ id: string; title: string; url: string; checkedAt?: string }>,
): RawContactRecord[];
export function formatContactValue(contact: Pick<VenueContact, "type" | "value">): string;
export function contactHref(contact: Pick<VenueContact, "type" | "value">): string;
