import {cookies} from "next/headers";
import {NextRequest, NextResponse} from "next/server";
import {getOverview, mutate, openOperationsStore, researchVenues, resolveWorkspace, type OperationsDatabase} from "../../../../scripts/operations-store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "backstage-demo-session";

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
  } catch(error) {return NextResponse.json({error:error instanceof Error?error.message:"Unable to load the operations workspace."},{status:500});}
  finally {db?.close();}
}

export async function POST(request: NextRequest) {
  let db:OperationsDatabase|undefined;
  try {
    const raw=await request.text();
    if(raw.length>256_000)return NextResponse.json({error:"This request is too large. Shorten the application details and try again."},{status:413});
    const body=JSON.parse(raw) as Record<string,unknown>;
    if (!body||typeof body!=="object"||typeof body.type!=="string") return NextResponse.json({error:"Choose a supported workspace action."},{status:400});
    const current=await session();db=current.db;
    const result=mutate(db,current.workspace.workspaceId,current.workspace.role,body);
    const response=NextResponse.json({ok:true,...result});
    if (current.jar.get(COOKIE)?.value!==current.workspace.token) response.cookies.set(COOKIE,current.workspace.token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*30});
    return response;
  } catch(error) {return NextResponse.json({error:error instanceof Error?error.message:"Unable to complete this workspace action."},{status:400});}
  finally {db?.close();}
}
