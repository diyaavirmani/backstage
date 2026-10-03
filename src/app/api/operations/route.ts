import {cookies} from "next/headers";
import {NextRequest, NextResponse} from "next/server";
import {getOverview, mutate, openOperationsStore, researchVenues, resolveWorkspace, type OperationsDatabase} from "../../../../scripts/operations-store.mjs";
import {getPublishedResearchEvidence} from "@/lib/sanity-venue-data";
import {readRequestTextBounded, RequestBodyTooLarge, validateMutationOrigin} from "../../../../scripts/deployment-controls.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "backstage-demo-session";
type OperationsRequest={type:string;payload?:Record<string,unknown>;[key:string]:unknown};

async function session() {
  const jar=await cookies();
  const db=openOperationsStore();
  try {
    const workspace=resolveWorkspace(db,jar.get(COOKIE)?.value);
    return {db,workspace,jar};
  } catch(error) {
    db.close();
    throw error;
  }
}

export async function GET(request: NextRequest) {
  let db:OperationsDatabase|undefined;
  try {
    const current=await session();db=current.db;
    const data=getOverview(db,current.workspace.workspaceId,current.workspace.role,request.nextUrl.searchParams.get("month"));
    const response=NextResponse.json({...data,researchVenues:researchVenues(current.workspace.workspaceId)});
    if (current.jar.get(COOKIE)?.value!==current.workspace.token) response.cookies.set(COOKIE,current.workspace.token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*30});
    return response;
  } catch(error) {return NextResponse.json({error:error instanceof Error&&error.message==="PERSISTENT_STORAGE_UNAVAILABLE"?"The demo storage is not ready. Please retry shortly.":"Unable to load the operations workspace."},{status:error instanceof Error&&error.message==="PERSISTENT_STORAGE_UNAVAILABLE"?503:500});}
  finally {db?.close();}
}

export async function POST(request: NextRequest) {
  let db:OperationsDatabase|undefined;
  let resolvingPublishedEvidence=false;
  try {
    const originCheck=validateMutationOrigin(request);
    if(!originCheck.ok)return NextResponse.json({error:originCheck.reason==="missing_configuration"?"This demo is not configured to accept browser changes yet.":"This request did not come from the configured Backstage site."},{status:originCheck.reason==="missing_configuration"?503:403});
    let raw:string;
    try {raw=await readRequestTextBounded(request,256_000);}
    catch(error) {if(error instanceof RequestBodyTooLarge)return NextResponse.json({error:"This request is too large. Shorten the application details and try again."},{status:413});throw error;}
    let body:OperationsRequest;
    try {body=JSON.parse(raw) as OperationsRequest;}
    catch {return NextResponse.json({error:"Choose a supported workspace action."},{status:400});}
    if (!body||typeof body!=="object"||typeof body.type!=="string") return NextResponse.json({error:"Choose a supported workspace action."},{status:400});
    const current=await session();db=current.db;
    let trustedResearchEvidence=null;
    if(["save-application","submit-application"].includes(body.type)&&typeof body.payload?.venueId==="string"){
      const venue=researchVenues(current.workspace.workspaceId).find((item)=>item.id===body.payload?.venueId);
      if(venue){
        if(body.type==="submit-application") throw new Error("Researched venues are draft-only because Backstage has no verified authority to submit booking requests.");
        resolvingPublishedEvidence=true;
        trustedResearchEvidence=await getPublishedResearchEvidence(venue.catalogId);
        resolvingPublishedEvidence=false;
        if(trustedResearchEvidence.name!==venue.name||trustedResearchEvidence.city!==venue.city||trustedResearchEvidence.locality!==venue.locality) throw new Error("Published venue identity no longer matches this workspace. Refresh and prepare the draft again.");
      }
    }
    const result=mutate(db,current.workspace.workspaceId,current.workspace.role,body as Record<string,unknown>,trustedResearchEvidence);
    const response=NextResponse.json({ok:true,...result});
    if (current.jar.get(COOKIE)?.value!==current.workspace.token) response.cookies.set(COOKIE,current.workspace.token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*30});
    return response;
  } catch(error) {const storageUnavailable=error instanceof Error&&error.message==="PERSISTENT_STORAGE_UNAVAILABLE";return NextResponse.json({error:storageUnavailable?"The demo storage is not ready. Please retry shortly.":resolvingPublishedEvidence?"Published venue evidence could not be refreshed. Please retry later.":error instanceof Error?error.message:"Unable to complete this workspace action."},{status:storageUnavailable||resolvingPublishedEvidence?503:400});}
  finally {db?.close();}
}
