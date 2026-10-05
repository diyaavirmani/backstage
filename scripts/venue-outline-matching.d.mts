export function outlineEntryMatchesVenuePath(entryPath: string, venue: {_id: string; name: string; locality: string}): boolean;
export function outlineEntryIsEligible(
  entryPath: string,
  selectedVenues: Array<{ _id?: string; name?: string; locality?: string }>,
  allVenues: Array<{ _id?: string; name?: string; locality?: string }>,
  city: string,
): boolean;
