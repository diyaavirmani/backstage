import { WorkspaceShell } from "@/components/workspace-shell";
import { SiteHeader } from "@/components/site-header";
import VenueCatalog from "@/components/venue-catalog";
import {
  getPublishedResearchVenues,
  SanityVenueUnavailable,
} from "@/lib/sanity-venue-data";
import catalog from "@/data/research-catalog.json";

export const metadata = { title: "Venue research — Backstage" };

export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  let venues;
  let origin: "live" | "preview" = "live";
  try {
    venues = await getPublishedResearchVenues();
    if (!venues.length)
      throw new SanityVenueUnavailable(
        "No eligible published research venues were returned.",
      );
  } catch {
    origin = "preview";
    venues = catalog.venues.map((venue) => ({
      id: venue.id,
      name: venue.name,
      city: venue.city,
      locality: venue.locality,
      summary: venue.summary,
      relationshipStatus: venue.relationshipStatus,
      sourceReferences: venue.sourceIds
        .map((id) => catalog.sources.find((source) => source.id === id))
        .filter(Boolean)
        .map((source) => ({
          id: source!.id,
          title: source!.title,
          url: source!.url,
          checkedAt: source!.checkedAt,
        })),
      claims: venue.claims.map((claim) => ({
        id: claim.id,
        claim: claim.claim,
        value: claim.value,
        evidenceType: claim.evidenceType,
        checkedAt: claim.checkedAt,
        historicalDate: (claim as { historicalDate?: string }).historicalDate,
        qualification: (claim as { qualification?: string }).qualification,
        sourceReferences: claim.sourceIds
          .map((id) => catalog.sources.find((source) => source.id === id))
          .filter(Boolean)
          .map((source) => ({
            id: source!.id,
            title: source!.title,
            url: source!.url,
            checkedAt: source!.checkedAt,
          })),
      })),
      spaces: venue.spaces.map((space) => ({
        id: space.id,
        name: space.name,
        summary: space.summary,
        layout: space.layout,
        capacity:
          space.capacity === null
            ? null
            : {
                guestCount: space.capacity,
                layout: space.layout,
                checkedAt: "",
                sourceReferences: [],
              },
        sourceReferences: space.sourceIds
          .map((id) => catalog.sources.find((source) => source.id === id))
          .filter(Boolean)
          .map((source) => ({
            id: source!.id,
            title: source!.title,
            url: source!.url,
            checkedAt: source!.checkedAt,
          })),
      })),
      resources: venue.resources.map((resource) => ({
        id: resource.id,
        name: resource.name,
        summary: resource.summary,
        availability: "unknown",
        sourceReferences: [],
      })),
      policies: [],
    }));
  }
  return (
    <>
      <SiteHeader active="venues" />
      <WorkspaceShell kind="venues">
        <VenueCatalog venues={venues} origin={origin} />
      </WorkspaceShell>
    </>
  );
}
