import type {EventBrief, VenueRecommendation} from "@/types";

export const APPLICATION_HANDOFF_KEY="backstage.research-application-handoff.v1";
export type ResearchApplicationHandoff={venueId:string;venueName:string;brief:EventBrief;questions:string[];recommendation:VenueRecommendation;createdAt:string};

export function publishResearchApplicationHandoff(value:ResearchApplicationHandoff) {
  if(typeof window==="undefined") return;
  sessionStorage.setItem(APPLICATION_HANDOFF_KEY,JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("backstage:prepare-research-application",{detail:value}));
}
