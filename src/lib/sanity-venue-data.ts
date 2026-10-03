import {createClient} from "@sanity/client";
import type {SourceReference} from "@/types";

export type PublishedVenue = {
  id: string;
  name: string;
  city: string;
  locality: string;
  summary: string;
  relationshipStatus: string;
  sourceReferences: SourceReference[];
  claims: Array<{id:string;claim:string;value:string;evidenceType:string;checkedAt:string;historicalDate?:string|null;qualification?:string|null;sourceReferences:SourceReference[]}>;
  spaces: Array<{id:string;name:string;summary:string;layout?:string|null;capacity?:{guestCount:number;layout:string;checkedAt:string;sourceReferences:SourceReference[]}|null;sourceReferences:SourceReference[]}>
  resources: Array<{id:string;name:string;summary:string;availability:string;sourceReferences:SourceReference[]}>;
  policies: Array<{id:string;title:string;statement:string;evidenceType:string;checkedAt:string;sourceReferences:SourceReference[]}>;
};

export class SanityVenueUnavailable extends Error {}
type RawSource={_id:string;title:string;url:string;publisher?:string;sourceType?:SourceReference["sourceType"];checkedAt?:string};
type RawClaim={id:string;claim:string;value:string;evidenceType:string;checkedAt:string;historicalDate?:string|null;qualification?:string|null;sourceReferences:RawSource[]};
type RawVenue={_id:string;name:string;city:string;locality:string;summary:string;relationshipStatus:string;sourceReferences:RawSource[];claims:RawClaim[];spaces:Array<{_id:string;name:string;summary:string;layout?:string|null;capacity?:{guestCount:number;layout:string;checkedAt:string;sourceReferences:RawSource[]}|null;sourceReferences:RawSource[]}>;resources:Array<{_id:string;name:string;summary:string;availability:string;sourceReferences:RawSource[]}>;policies:Array<{_id:string;title:string;statement:string;evidenceType:string;checkedAt:string;sourceReferences:RawSource[]}>};
const source=(value:RawSource):SourceReference=>({id:value._id,title:value.title,url:value.url,publisher:value.publisher,sourceType:value.sourceType,checkedAt:value.checkedAt});
const mapVenue=(venue:RawVenue):PublishedVenue=>({id:venue._id,name:venue.name,city:venue.city,locality:venue.locality,summary:venue.summary,relationshipStatus:venue.relationshipStatus,sourceReferences:(venue.sourceReferences||[]).map(source),claims:(venue.claims||[]).map((claim)=>({...claim,sourceReferences:(claim.sourceReferences||[]).map(source)})),spaces:(venue.spaces||[]).map((space)=>({id:space._id,name:space.name,summary:space.summary,layout:space.layout,capacity:space.capacity?{...space.capacity,sourceReferences:space.capacity.sourceReferences.map(source)}:null,sourceReferences:space.sourceReferences.map(source)})),resources:(venue.resources||[]).map((resource)=>({id:resource._id,name:resource.name,summary:resource.summary,availability:resource.availability,sourceReferences:resource.sourceReferences.map(source)})),policies:(venue.policies||[]).map((policy)=>({id:policy._id,title:policy.title,statement:policy.statement,evidenceType:policy.evidenceType,checkedAt:policy.checkedAt,sourceReferences:policy.sourceReferences.map(source)}))});

function client() {
  const projectId=process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset=process.env.NEXT_PUBLIC_SANITY_DATASET;
  const token=process.env.SANITY_PROJECT_READ_TOKEN;
  if(!projectId||!dataset||!token) throw new SanityVenueUnavailable("Sanity venue content is not configured.");
  return createClient({projectId,dataset,token,apiVersion:"2025-02-19",perspective:"published",useCdn:false});
}

export async function getPublishedResearchVenues(): Promise<PublishedVenue[]> {
  try {
    const records=await client().fetch<RawVenue[]>(`*[_type == "venue" && knowledgeBaseEligible == true && isDemonstration == false && relationshipStatus == "research-lead"] | order(city asc, name asc){
      _id, name, city, locality, summary, relationshipStatus,
      "sourceReferences": sourceReferences[]->{_id,title,url,publisher,sourceType,checkedAt},
      "claims": claims[]{"id":_key,claim,value,evidenceType,checkedAt,historicalDate,qualification,"sourceReferences":sourceReferences[]->{_id,title,url,publisher,sourceType,checkedAt}},
      "spaces": spaces[]->{_id,name,summary,layout,capacity{guestCount,layout,checkedAt,"sourceReferences":sourceReferences[]->{_id,title,url,publisher,sourceType,checkedAt}},"sourceReferences":sourceReferences[]->{_id,title,url,publisher,sourceType,checkedAt}},
      "resources": resources[]->{_id,name,summary,availability,"sourceReferences":sourceReferences[]->{_id,title,url,publisher,sourceType,checkedAt}},
      "policies": policies[]->{_id,title,statement,evidenceType,checkedAt,"sourceReferences":sourceReferences[]->{_id,title,url,publisher,sourceType,checkedAt}}
    }`);
    return records.map(mapVenue);
  } catch (error) {
    if(error instanceof SanityVenueUnavailable) throw error;
    throw new SanityVenueUnavailable("Published Sanity venue content could not be reached.");
  }
}

export async function getPublishedResearchEvidence(catalogId:string) {
  const venueId=catalogId.trim();
  if(!/^venue-[a-z0-9-]{3,100}$/.test(venueId)) throw new Error("The selected research venue identity is invalid.");
  const venue=await client().fetch<RawVenue|null>(`*[_type == "venue" && _id == $venueId && knowledgeBaseEligible == true && isDemonstration == false && relationshipStatus == "research-lead"][0]{
    _id,name,city,locality,summary,relationshipStatus,
    "sourceReferences":sourceReferences[]->{_id,title,url,publisher,sourceType,checkedAt},
    "claims":claims[]{"id":_key,claim,value,evidenceType,checkedAt,historicalDate,qualification,"sourceReferences":sourceReferences[]->{_id,title,url,publisher,sourceType,checkedAt}}
  }`,{venueId});
  if(!venue||!venue.sourceReferences?.length||!venue.claims?.length) throw new Error("The selected research venue is not an eligible published Sanity record.");
  const used=new Set(venue.claims.flatMap((claim)=>claim.sourceReferences||[]).map((item)=>item?._id));
  const sources=venue.sourceReferences.filter((item)=>used.has(item?._id));
  return {venueId:venue._id,name:venue.name,city:venue.city,locality:venue.locality,summary:venue.summary,capturedAt:new Date().toISOString(),sources:sources.map((item)=>({id:item._id,title:item.title,url:item.url,checkedAt:item.checkedAt})),evidence:venue.claims.map((claim)=>({claim:claim.claim,value:claim.value,evidenceType:claim.evidenceType,qualification:claim.qualification||null,checkedAt:claim.checkedAt,sourceReferences:(claim.sourceReferences||[]).map((item)=>({id:item._id,title:item.title,url:item.url,checkedAt:item.checkedAt}))}))};
}
