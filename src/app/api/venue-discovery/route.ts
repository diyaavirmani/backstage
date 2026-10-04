import {createVenueDiscoveryHandler} from "@/lib/venue-discovery-handler";

export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = createVenueDiscoveryHandler();
