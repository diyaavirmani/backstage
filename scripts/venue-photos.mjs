/**
 * Curated venue photos are decorative context only. They are never evidence of capacity, layout,
 * eligibility or availability, and they are loaded directly from these official hosts — there is
 * no Backstage image proxy. Any URL outside this allowlist is dropped server-side.
 */
export const photoHosts = [
  {origin: "https://ofissquare.com", pathPrefix: "/wp-content/uploads/"},
  {origin: "https://saiacs-ceocenter.com", pathPrefix: "/images/uploads/"},
  {origin: "https://res.cloudinary.com", pathPrefix: "/dkwqszhed/image/upload/"},
];
export const photoCategories = ["event", "event-space", "meeting-space", "workspace", "outdoor-space", "dining", "exterior", "accommodation"];
export const maxPhotos = 6;

export function isAllowedPhotoUrl(value) {
  let url;
  try { url = new URL(value); } catch { return false; }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.port) return false;
  return photoHosts.some((host) => url.origin === host.origin && url.pathname.startsWith(host.pathPrefix));
}

const isDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isText = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 300;
const isSize = (value) => Number.isInteger(value) && value > 0 && value <= 4000;
const isHttpUrl = (value) => { try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } };
const source = (value) => (value?._id && value.title && isHttpUrl(value.url) ? {id: value._id, title: value.title, url: value.url} : null);

export function photoIsValid(photo) {
  return Boolean(photo && isAllowedPhotoUrl(photo.thumbnailUrl) && isAllowedPhotoUrl(photo.imageUrl)
    && [photo.width, photo.height, photo.thumbnailWidth, photo.thumbnailHeight].every(isSize)
    && photoCategories.includes(photo.category)
    && [photo.caption, photo.alt, photo.credit, photo.reuse, photo.locationEvidence].every(isText)
    && (photo.photoDate === undefined || photo.photoDate === null || isDate(photo.photoDate)));
}

export const galleryProjection = `"gallery": *[_type == "venueGallery" && venue._ref == ^._id][0]{_id, "venueId": venue._ref, displayPolicy, rightsNote, checkedAt, "officialGallery": officialGallerySource->{_id, title, url}, photos[]{_key, thumbnailUrl, thumbnailWidth, thumbnailHeight, imageUrl, width, height, category, caption, alt, locationEvidence, credit, reuse, photoDate, "source": sourceReference->{_id, title, url}}}`;

/** Server-side gate: only a gallery linked to this exact venue, with allowlisted and fully described photos. */
export function normalizeGallery(record, venueId) {
  if (!record || record.venueId !== venueId || !["embed", "link-only"].includes(record.displayPolicy) || !isText(record.rightsNote)) return null;
  const officialGallery = source(record.officialGallery);
  const photos = record.displayPolicy === "embed"
    ? (Array.isArray(record.photos) ? record.photos : []).filter((photo) => photoIsValid(photo) && source(photo.source)).slice(0, maxPhotos).map((photo) => ({
      id: photo._key,
      thumbnailUrl: photo.thumbnailUrl,
      thumbnailWidth: photo.thumbnailWidth,
      thumbnailHeight: photo.thumbnailHeight,
      imageUrl: photo.imageUrl,
      width: photo.width,
      height: photo.height,
      category: photo.category,
      caption: photo.caption,
      alt: photo.alt,
      locationEvidence: photo.locationEvidence,
      credit: photo.credit,
      reuse: photo.reuse,
      photoDate: photo.photoDate || null,
      source: source(photo.source),
    }))
    : [];
  if (!photos.length && !officialGallery) return null;
  return {displayPolicy: record.displayPolicy, rightsNote: record.rightsNote, checkedAt: isDate(record.checkedAt) ? record.checkedAt : null, officialGallery, photos};
}

/** Builds the same record from reviewed JSON for the explicitly labelled local preview. */
export function reviewedGalleryRecord(enrichment, catalogSources, venueId) {
  const gallery = (enrichment.galleries || []).find((item) => item.venueId === venueId);
  if (!gallery) return null;
  const sources = new Map([...catalogSources, ...(enrichment.sources || [])].map((item) => [item.id, item]));
  const reference = (id) => (sources.has(id) ? {_id: id, title: sources.get(id).title, url: sources.get(id).url} : null);
  return {
    _id: gallery.id,
    venueId: gallery.venueId,
    displayPolicy: gallery.displayPolicy,
    rightsNote: gallery.rightsNote,
    checkedAt: gallery.checkedAt,
    officialGallery: reference(gallery.officialGallerySourceId),
    photos: gallery.photos.map(({key, sourceId, ...photo}) => ({...photo, _key: key, source: reference(sourceId)})),
  };
}
