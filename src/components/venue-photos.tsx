"use client";
/* eslint-disable @next/next/no-img-element -- Photos load directly from allowlisted official hosts.
   next/image would fetch and cache copies through Backstage's optimizer, i.e. a remote-image proxy. */
import { useEffect, useRef, useState } from "react";
import type { VenueGallery, VenuePhoto } from "@/types";
import { Badge, Button, DetailDialog, SourceLink } from "@/components/ui";

const categoryLabels: Record<VenuePhoto["category"], string> = {
  event: "Event",
  "event-space": "Event space",
  "meeting-space": "Meeting room",
  workspace: "Workspace",
  "outdoor-space": "Outdoor space",
  dining: "Dining",
  exterior: "Exterior",
  accommodation: "Accommodation",
};

/**
 * Small card thumbnail and accessible gallery for curated official photos. Photos are decorative context:
 * images load straight from allowlisted official hosts, only when shown, and never feed evidence decisions.
 */
export function VenuePhotos({
  venueName,
  gallery,
}: {
  venueName: string;
  gallery?: VenueGallery | null;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const restoringFocus = useRef(false);
  const photos = gallery?.photos || [];
  const count = photos.length;
  const step = (delta: number) =>
    setIndex((current) => (current + delta + count) % count);
  useEffect(() => {
    if (!open || count < 2) return;
    const onKey = (event: KeyboardEvent) => {
      const delta = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (delta) setIndex((current) => (current + delta + count) % count);
      else if (event.key === "Home") setIndex(0);
      else if (event.key === "End") setIndex(count - 1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, count]);
  if (!gallery) return null;
  if (!count)
    return gallery.officialGallery ? (
      <div className="venue-photos venue-photos-link">
        <SourceLink url={gallery.officialGallery.url}>Official photos</SourceLink>
        <small>Shown on the owner’s site, not reproduced here.</small>
      </div>
    ) : null;
  const first = photos[0];
  const photo = photos[index] || first;
  return (
    <div className="venue-photos">
      <button
        type="button"
        className="venue-photo-trigger"
        onClick={() => {
          setIndex(0);
          setPreviewing(false);
          setOpen(true);
        }}
        onPointerEnter={(event) =>
          event.pointerType === "mouse" && setPreviewing(true)
        }
        onPointerLeave={() => setPreviewing(false)}
        onFocus={(event) => {
          // Focus returning from the closed gallery should not reopen the preview.
          if (restoringFocus.current) restoringFocus.current = false;
          else if (event.currentTarget.matches(":focus-visible"))
            setPreviewing(true);
        }}
        onBlur={() => setPreviewing(false)}
      >
        <span className="venue-thumb">
          {thumbFailed ? (
            <span className="venue-thumb-fallback">Photo unavailable</span>
          ) : (
            <img
              src={first.thumbnailUrl}
              width={first.thumbnailWidth}
              height={first.thumbnailHeight}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              ref={(node) => {
                // A server-rendered image can fail before hydration attaches onError.
                if (node?.complete && node.naturalWidth === 0) setThumbFailed(true);
              }}
              onError={() => setThumbFailed(true)}
            />
          )}
        </span>
        <span className="venue-photo-label">
          View photos<span className="sr-only"> of {venueName}</span> ({count})
        </span>
      </button>
      {previewing && count > 1 && (
        <span className="photo-preview" aria-hidden="true">
          {photos.slice(1, 4).map((item) => (
            <img
              key={item.id}
              src={item.thumbnailUrl}
              width={item.thumbnailWidth}
              height={item.thumbnailHeight}
              alt=""
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ))}
        </span>
      )}
      <DetailDialog
        open={open}
        onClose={() => {
          restoringFocus.current = true;
          setOpen(false);
        }}
        title={`Photos — ${venueName}`}
      >
        <div className="photo-gallery">
          <p className="helper-text">
            Official photos shown with credit. They show what each source shows;
            they do not establish capacity, current layout, eligibility or
            availability.
          </p>
          <figure>
            <div
              className="gallery-frame"
              onPointerDown={(event) => {
                swipe.current = { x: event.clientX, y: event.clientY };
              }}
              onPointerUp={(event) => {
                const start = swipe.current;
                swipe.current = null;
                if (!start || count < 2) return;
                const dx = event.clientX - start.x;
                if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(event.clientY - start.y))
                  step(dx < 0 ? 1 : -1);
              }}
            >
              {failed.has(photo.id) ? (
                <p className="gallery-error" role="status">
                  This photo could not be loaded.{" "}
                  <SourceLink url={photo.source.url}>
                    View it on the official page
                  </SourceLink>
                </p>
              ) : (
                <img
                  key={photo.id}
                  src={photo.imageUrl}
                  width={photo.width}
                  height={photo.height}
                  alt={photo.alt}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  draggable={false}
                  onError={() =>
                    setFailed((current) => new Set(current).add(photo.id))
                  }
                />
              )}
            </div>
            {count > 1 && (
              <div className="gallery-controls">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => step(-1)}
                >
                  <span aria-hidden="true">← </span>Previous photo
                </Button>
                <p aria-live="polite" className="gallery-status">
                  Photo {index + 1} of {count}
                </p>
                <Button type="button" variant="secondary" onClick={() => step(1)}>
                  Next photo<span aria-hidden="true"> →</span>
                </Button>
              </div>
            )}
            <figcaption>
              <p>
                <Badge
                  tone={photo.category === "accommodation" ? "unknown" : "neutral"}
                >
                  {categoryLabels[photo.category]}
                </Badge>{" "}
                {photo.caption}
              </p>
              <p className="helper-text">
                Why this venue: {photo.locationEvidence}
              </p>
              <p className="helper-text">
                {photo.credit}
                {photo.photoDate ? ` · photo dated ${photo.photoDate}` : ""} ·{" "}
                {photo.reuse}{" "}
                <SourceLink url={photo.source.url}>
                  Source: {photo.source.title}
                </SourceLink>
              </p>
            </figcaption>
          </figure>
          {count > 1 && (
            <div className="gallery-thumbs" role="group" aria-label="Choose a photo">
              {photos.map((item, position) => (
                <button
                  type="button"
                  key={item.id}
                  aria-label={`Photo ${position + 1}: ${item.caption}`}
                  aria-current={position === index ? "true" : undefined}
                  onClick={() => setIndex(position)}
                >
                  <img
                    src={item.thumbnailUrl}
                    width={item.thumbnailWidth}
                    height={item.thumbnailHeight}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}
          {gallery.officialGallery && (
            <SourceLink url={gallery.officialGallery.url}>
              Official page: {gallery.officialGallery.title}
            </SourceLink>
          )}
        </div>
      </DetailDialog>
    </div>
  );
}
