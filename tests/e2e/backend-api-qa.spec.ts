import {expect,test} from "@playwright/test";
import {request as nodeRequest} from "node:http";
import {join,resolve} from "node:path";
import {createRequire} from "node:module";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
const {DatabaseSync}=createRequire(`${process.cwd()}/tests/e2e/backend-api-qa.spec.ts`)("node:sqlite") as {DatabaseSync:new(path:string)=>{exec(sql:string):void;close():void}};

const origin="http://127.0.0.1:3107";
const validBrief=(overrides:Record<string,unknown>={})=>({
  id:"qa-brief",title:"Backend API QA workshop",city:"Delhi NCR",eventType:"Workshop",date:futureWeekday(21),startTime:"10:00",endTime:"12:00",audience:"Fictional local workshop attendees",headcount:20,budgetAmount:0,currency:"INR",roomRequirements:[],equipmentRequirements:[],essentialRequirements:[],flexibleRequirements:[],setupMinutes:30,cleanupMinutes:30,savedAt:new Date().toISOString(),...overrides,
});
function futureWeekday(offset:number){const date=new Date();date.setUTCHours(12,0,0,0);date.setUTCDate(date.getUTCDate()+offset);while(date.getUTCDay()===0)date.setUTCDate(date.getUTCDate()+1);return date.toISOString().slice(0,10);}
async function streamedPost(path:string,chunks:string[]){
  return await new Promise<{status:number;body:string}>((resolve,reject)=>{
    const outgoing=nodeRequest(new URL(path,origin),{method:"POST",headers:{Origin:origin,"Transfer-Encoding":"chunked","Content-Type":"application/json"}},incoming=>{
      let body="";incoming.setEncoding("utf8");incoming.on("data",part=>body+=part);incoming.on("end",()=>resolve({status:incoming.statusCode||0,body}));
    });
    outgoing.on("error",reject);for(const chunk of chunks)outgoing.write(chunk);outgoing.end();
  });
}

test("route handlers reject malformed briefs, dates, origins, and streamed oversized bodies before providers",async({request})=>{
  const noOrigin=await request.post("/api/venue-discovery",{data:"{}"});expect(noOrigin.status()).toBe(403);
  const wrongOrigin=await request.post("/api/venue-discovery",{headers:{Origin:"https://attacker.invalid"},data:"{}"});expect(wrongOrigin.status()).toBe(403);
  const malformed=await request.post("/api/venue-discovery",{headers:{Origin:origin,"Content-Type":"application/json"},data:"{"});expect(malformed.status()).toBe(400);
  for(const brief of [
    validBrief({title:""}),validBrief({date:"2026-02-30"}),validBrief({startTime:"25:00"}),validBrief({startTime:"12:00",endTime:"12:00"}),validBrief({headcount:-2}),validBrief({budgetAmount:-1}),
  ]){
    const response=await request.post("/api/venue-discovery",{headers:{Origin:origin},data:{brief,conversation:[{role:"user",content:"Find potential hosts."}]}});
    expect(response.status(),JSON.stringify(brief)).toBe(400);
  }
  const missingFields=await request.post("/api/venue-discovery",{headers:{Origin:origin},data:{brief:{title:"Missing required fields"},conversation:[]}});expect(missingFields.status()).toBe(400);
  const streamed=await streamedPost("/api/venue-discovery",["{\"brief\":\"","x".repeat(10_000),"y".repeat(3_000),"\"}"]);
  expect(streamed.status).toBe(413);
  expect(streamed.body).not.toMatch(/OPENAI_API_KEY|SANITY_CONTEXT_MCP_URL|Bearer\s/i);
  const oversizedOperations=await streamedPost("/api/operations",["{\"type\":\"x\",\"padding\":\"","z".repeat(260_000),"\"}"]);
  expect(oversizedOperations.status).toBe(413);
});

test("exhausted fresh-database initialization waits return a sanitized storage-unavailable response",async()=>{
  test.setTimeout(45_000);
  const dataDirectory=process.env.BACKSTAGE_PLAYWRIGHT_DATA_DIR;expect(dataDirectory).toBeTruthy();
  const path=join(dataDirectory!,"blocked-initialization.sqlite");const blocker=new DatabaseSync(path);blocker.exec("PRAGMA journal_mode=DELETE; BEGIN EXCLUSIVE;");
  const port=await new Promise<number>((resolvePort,reject)=>{const server=createServer();server.once("error",reject);server.listen(0,"127.0.0.1",()=>{const address=server.address();server.close(error=>error?reject(error):resolvePort(typeof address==="object"&&address?address.port:0));});});
  const origin=`http://127.0.0.1:${port}`;const isolated=spawn(process.execPath,[resolve(".next/standalone/server.js")],{cwd:resolve(".next/standalone"),env:{PATH:process.env.PATH||"/usr/bin:/bin",NODE_ENV:"production",PORT:String(port),HOSTNAME:"127.0.0.1",APP_ORIGIN:origin,BACKSTAGE_DB_PATH:path,NEXT_TELEMETRY_DISABLED:"1"},stdio:"ignore"});
  try{
    const healthDeadline=Date.now()+10_000;let ready=false;while(Date.now()<healthDeadline){try{const health=await fetch(`${origin}/api/health`);if(health.ok){ready=true;break;}}catch{}await new Promise(resolveWait=>setTimeout(resolveWait,100));}expect(ready).toBeTruthy();
    const response=await fetch(`${origin}/api/operations`);expect(response.status).toBe(503);const result=await response.json();expect(result.error).toMatch(/storage is not ready/i);expect(JSON.stringify(result)).not.toMatch(/Bearer|SANITY_CONTEXT_MCP_URL|OPENAI_API_KEY/i);
  }finally{blocker.exec("ROLLBACK");blocker.close();isolated.kill("SIGTERM");await new Promise(resolveExit=>isolated.once("exit",resolveExit));}
  const restartPort=await new Promise<number>((resolvePort,reject)=>{const server=createServer();server.once("error",reject);server.listen(0,"127.0.0.1",()=>{const address=server.address();server.close(error=>error?reject(error):resolvePort(typeof address==="object"&&address?address.port:0));});});
  const retryOrigin=`http://127.0.0.1:${restartPort}`;const recoveredServer=spawn(process.execPath,[resolve(".next/standalone/server.js")],{cwd:resolve(".next/standalone"),env:{PATH:process.env.PATH||"/usr/bin:/bin",NODE_ENV:"production",PORT:String(restartPort),HOSTNAME:"127.0.0.1",APP_ORIGIN:retryOrigin,BACKSTAGE_DB_PATH:path,NEXT_TELEMETRY_DISABLED:"1"},stdio:"ignore"});
  try{const deadline=Date.now()+10_000;let recovered=false;while(Date.now()<deadline){try{const response=await fetch(`${retryOrigin}/api/operations`);if(response.ok){recovered=true;break;}}catch{}await new Promise(resolveWait=>setTimeout(resolveWait,100));}expect(recovered).toBeTruthy();}finally{recoveredServer.kill("SIGTERM");await new Promise(resolveExit=>recoveredServer.once("exit",resolveExit));}
});

test("operations API scopes forged identifiers and concurrent retries to the cookie workspace",async({browser})=>{
  const organizerContext=await browser.newContext();
  const organizer=await organizerContext.newPage();
  const get=async(path:string)=>organizer.evaluate(async path=>{const response=await fetch(path);return{status:response.status,body:await response.json()};},path);
  const post=async(body:unknown)=>organizer.evaluate(async body=>{const response=await fetch("/api/operations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});return{status:response.status,body:await response.json()};},body);
  try{
    await organizer.goto(origin);
    const missingOrigin=await fetch(`${origin}/api/operations`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"switch-role",role:"host"})});expect(missingOrigin.status).toBe(403);
    const wrongOrigin=await fetch(`${origin}/api/operations`,{method:"POST",headers:{Origin:"https://attacker.invalid","Content-Type":"application/json"},body:JSON.stringify({type:"switch-role",role:"host"})});expect(wrongOrigin.status).toBe(403);
    const initialResponse=await get("/api/operations");expect(initialResponse.status).toBe(200);
    const initial=initialResponse.body;
    const fictionalHost=initial.venues.find((venue:{kind:string;city:string})=>venue.kind==="demo"&&venue.city==="Delhi NCR");
    const room=fictionalHost.resources.find((resource:{kind:string})=>resource.kind==="room");
    const save=(venueId:string,resourceId:string,key:string,applicationId?:string)=>post({type:"save-application",payload:{venueId,brief:validBrief(),organizer:{name:"Fictional QA Organizer",email:"qa@example.test",phone:"",organization:"Test workspace"},resources:[{id:resourceId,quantity:1}],questions:["Confirm setup details"],flexibleSlot:null,reviewed:false,idempotencyKey:key,applicationId,authoritativeResearchEvidence:{sources:[{url:"https://attacker.invalid/fake-evidence"}],claims:["Invented capacity"]},evidence:[{url:"https://attacker.invalid/fake-evidence",value:"Invented availability"}]}});
    const forgedVenue=await save("foreign:venue-not-real","foreign:resource-not-real","forged-venue-key");expect(forgedVenue.status).toBe(400);
    const forgedResource=await save(fictionalHost.id,"foreign:resource-not-real","forged-resource-key");expect(forgedResource.status).toBe(400);

    const draftResponse=await save(fictionalHost.id,room.id,"simultaneous-retry-key");expect(draftResponse.status,JSON.stringify(draftResponse.body)).toBe(200);const {applicationId}=draftResponse.body;
    const submitPayload={type:"submit-application",payload:{venueId:fictionalHost.id,brief:validBrief(),organizer:{name:"Fictional QA Organizer",email:"qa@example.test",phone:"",organization:"Test workspace"},resources:[{id:room.id,quantity:1}],questions:["Confirm setup details"],flexibleSlot:null,reviewed:true,idempotencyKey:"simultaneous-retry-key",applicationId}};
    const attempts=await Promise.all([1,2].map(()=>post(submitPayload)));
    expect(attempts.map(response=>response.status)).toEqual([200,200]);
    const ids=attempts.map(response=>response.body.applicationId);expect(ids).toEqual([applicationId,applicationId]);
    const organizerData=(await get("/api/operations")).body;const matching=organizerData.applications.filter((app:{id:string})=>app.id===applicationId);expect(matching).toHaveLength(1);expect(matching[0].history).toHaveLength(2);
    expect(JSON.stringify(matching[0].payload)).not.toContain("attacker.invalid");expect(matching[0].payload.evidence).toEqual([]);

    const research=initial.venues.find((venue:{kind:string})=>venue.kind==="research");
    const researchSubmit=await post({type:"submit-application",payload:{venueId:research.id,brief:validBrief(),organizer:{name:"Fictional QA Organizer",email:"qa@example.test"},resources:[],questions:[],reviewed:true,idempotencyKey:"research-booking-key"}});expect(researchSubmit.status).toBe(400);expect(researchSubmit.body.error).toMatch(/draft-only|no verified Backstage booking authority/i);

    const otherContext=await browser.newContext();const other=await otherContext.newPage();
    try{
      await other.goto(origin);const otherOverview=await other.evaluate(async()=>{const response=await fetch("/api/operations");return await response.json();});expect(otherOverview.applications).toHaveLength(0);
      const otherPost=async(body:unknown)=>other.evaluate(async body=>{const response=await fetch("/api/operations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});return{status:response.status,body:await response.json()};},body);
      const switchRole=await otherPost({type:"switch-role",role:"host"});expect(switchRole.status).toBe(200);
      const crossWorkspace=await otherPost({type:"approve",applicationId});expect(crossWorkspace.status).toBe(400);expect(crossWorkspace.body.error).toMatch(/not found in this demo workspace/i);
      const forgedChecklist=await otherPost({type:"toggle-checklist",applicationId,itemId:"checklist-forged"});expect(forgedChecklist.status).toBe(400);
    }finally{await otherContext.close();}
  }finally{await organizerContext.close();}
});
