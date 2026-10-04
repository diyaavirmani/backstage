import type { VenueGallery, VenuePhoto } from "../src/types/index";

export type RawGalleryRecord = {
  _id?: string;
  venueId: string;
  displayPolicy: string;
  rightsNote: string;
  checkedAt?: string;
  officialGallery: { _id: string; title: string; url: string } | null;
  photos?: Array<Record<string, unknown>>;
};
export const photoHosts: Array<{ origin: string; pathPrefix: string }>;
export const photoCategories: VenuePhoto["category"][];
export const maxPhotos: number;
export const galleryProjection: string;
export function isAllowedPhotoUrl(value: string): boolean;
export function photoIsValid(photo: Record<string, unknown> | null | undefined): boolean;
export function normalizeGallery(record: RawGalleryRecord | null | undefined, venueId: string): VenueGallery | null;
export function reviewedGalleryRecord(
  enrichment: { sources?: Array<{ id: string; title: string; url: string }>; galleries?: Array<Record<string, unknown> & { venueId: string }> },
  catalogSources: Array<{ id: string; title: string; url: string }>,
  venueId: string,
): RawGalleryRecord | null;
