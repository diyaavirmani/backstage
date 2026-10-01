import {SiteHeader} from "@/components/site-header";
import VenueCatalog from "@/components/venue-catalog";

export const metadata = {title: "Venue research — Backstage"};

export default function VenuesPage() {
  return <><SiteHeader active="venues" /><VenueCatalog /></>;
}
