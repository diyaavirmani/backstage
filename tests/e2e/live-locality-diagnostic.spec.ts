import {expect,test} from "@playwright/test";
import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";

const enabled=process.env.BACKSTAGE_LIVE_LOCALITY_DIAGNOSTIC==="1";
test.skip(!enabled,"Opt in explicitly for one real local Sanity/OpenAI locality follow-up request.");
function futureDate(){const date=new Date();date.setUTCDate(date.getUTCDate()+21);while(date.getUTCDay()===0)date.setUTCDate(date.getUTCDate()+1);return date.toISOString().slice(0,10);}

test("diagnostic: latest explicit Gurugram-only instruction excludes Noida despite earlier Noida turn",async({page})=>{
  await page.goto("/organizer");
  const requestBody={brief:{id:"qa-locality-brief",title:"Fictional Delhi NCR hackathon",city:"Delhi NCR",eventType:"Other",date:futureDate(),startTime:"09:00",endTime:"18:00",audience:"Fictional builder teams",headcount:80,budgetAmount:15000,currency:"INR",roomRequirements:["Main event room","breakout rooms"],equipmentRequirements:["Projector","microphones","reliable Wi-Fi"],essentialRequirements:["Capacity for 80 in a documented room layout","Suitable equipment within budget"],flexibleRequirements:["Room arrangement"],setupMinutes:60,cleanupMinutes:45,savedAt:new Date().toISOString()},conversation:[{role:"user",content:"Show only Delhi NCR venue leads in Noida."},{role:"assistant",content:"The prior request was limited to Noida."},{role:"user",content:"Exclude Noida; show only Gurugram-locality leads. Keep the saved 80-person hackathon brief unchanged."}]};
  const result=await page.evaluate(async body=>{const response=await fetch("/api/venue-discovery",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});return{status:response.status,body:await response.json()};},requestBody);
  const data=result.body as {recommendations?:Array<{venueId:string;locality:string;historical:boolean;sourceReferences:Array<{id:string}>}>;retrievalEvidence?:Array<{venueId:string;entryPaths:string[];sourceReferenceIds:string[]}>;error?:string};
  const evidence={checkedAt:new Date().toISOString(),httpStatus:result.status,knowledgeBaseId:"kbPFAVeDOOjD",recommendations:(data.recommendations||[]).map(item=>({venueId:item.venueId,locality:item.locality,historical:item.historical,sourceIds:item.sourceReferences.map(source=>source.id)})),reads:(data.retrievalEvidence||[]).map(item=>({venueId:item.venueId,entryPaths:item.entryPaths,sourceReferenceIds:item.sourceReferenceIds}))};
  const output=process.env.PLAYWRIGHT_ARTIFACT_DIR||".playwright-artifacts";mkdirSync(output,{recursive:true});writeFileSync(join(output,"live-locality-diagnostic.json"),JSON.stringify(evidence,null,2));
  expect(result.status,JSON.stringify(evidence)).toBe(200);
  expect(evidence.recommendations.length).toBeGreaterThan(0);
  expect(evidence.recommendations.every(item=>/Gurugram|Gurgaon/i.test(item.locality)),JSON.stringify(evidence)).toBeTruthy();
});
