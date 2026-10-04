import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:net';

const standalone=resolve('.next/standalone/server.js');
const dataDirectory=mkdtempSync(join(tmpdir(),'backstage-operations-load-'));
const database=join(dataDirectory,'operations.sqlite');
const levels=[{concurrency:1,count:90,action:'successful workspace reads'},{concurrency:5,count:90,action:'draft saves'},{concurrency:20,count:90,action:'application submissions'},{concurrency:50,count:90,action:'competing approvals'}];
let child;
function freePort(){return new Promise((resolvePort,reject)=>{const listener=createServer();listener.once('error',reject);listener.listen(0,'127.0.0.1',()=>{const address=listener.address();listener.close(error=>error?reject(error):resolvePort(address.port));});});}
async function waitForServer(url){const deadline=Date.now()+30_000;while(Date.now()<deadline){try{const res=await fetch(`${url}/api/health`,{signal:AbortSignal.timeout(1000)});if(res.ok)return;}catch{}await new Promise(resolveWait=>setTimeout(resolveWait,120));}throw new Error('Isolated operations load server did not become healthy within 30 seconds.');}
async function start(){const port=await freePort();const url=`http://127.0.0.1:${port}`;const env={PATH:process.env.PATH||'/usr/bin:/bin',NODE_ENV:'production',PORT:String(port),HOSTNAME:'127.0.0.1',APP_ORIGIN:url,BACKSTAGE_DB_PATH:database,DEMO_DISCOVERY_DAILY_PER_SESSION:'100',DEMO_DISCOVERY_DAILY_GLOBAL:'500',NEXT_TELEMETRY_DISABLED:'1'};child=spawn(process.execPath,[standalone],{cwd:resolve('.next/standalone'),env,stdio:'ignore'});await waitForServer(url);return{url,process:child};}
async function stop(){if(!child)return;const server=child;child=null;if(server.exitCode!==null)return;server.kill('SIGTERM');await Promise.race([new Promise(resolveExit=>server.once('exit',resolveExit)),new Promise(resolveTimeout=>setTimeout(resolveTimeout,4000))]);if(server.exitCode===null)server.kill('SIGKILL');}
function percentile(values,p){const sorted=[...values].sort((a,b)=>a-b);return Number(sorted[Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1)].toFixed(1));}
function rssMiB(pid){try{return Number((Number(execFileSync('ps',['-o','rss=','-p',String(pid)],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim())/1024).toFixed(1));}catch{return 0;}}
function futureDate(){const date=new Date(Date.now()+35*86400000);date.setUTCHours(0,0,0,0);while(date.getUTCDay()===0)date.setUTCDate(date.getUTCDate()+1);return date.toISOString().slice(0,10);}
const date=futureDate();
const brief={id:'operations-load-brief',title:'Fictional operations load workshop',city:'Delhi NCR',eventType:'Workshop',date,startTime:'10:00',endTime:'12:00',audience:'Fictional local QA attendees',headcount:16,budgetAmount:0,currency:'INR',roomRequirements:[],equipmentRequirements:[],essentialRequirements:[],flexibleRequirements:[],setupMinutes:0,cleanupMinutes:0,savedAt:new Date().toISOString()};
let baseUrl,cookie,hostVenue,room,applicationIds=[],applicationKeys=[],winnerId,completedItemId,hostCompletedItemId,globalPeakRss=0,requestCount=0;
async function request(path,method='GET',body,phase='request'){
  requestCount++;
  const started=performance.now();let response,result;
  try{response=await fetch(`${baseUrl}${path}`,{method,headers:{Origin:baseUrl,Cookie:cookie?`backstage-demo-session=${cookie}`:'',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12_000)});result=await response.json();}
  catch(error){return{phase,status:0,category:'unexpected-transport-failure',error:String(error),latency:performance.now()-started};}
  const category=response.ok?'success':response.status===400&&phase==='competing approval'&&/conflict on/i.test(String(result.error||''))?'expected-resource-conflict':response.status===503&&phase==='quota persistence probe'&&/OPENAI_API_KEY/.test(String(result.error||''))?'expected-provider-configuration':'unexpected-http-failure';
  return{phase,status:response.status,category,error:category==='unexpected-http-failure'?String(result.error||'HTTP failure'):undefined,latency:performance.now()-started,result,headers:response.headers};
}
async function phase(instance,level,offset,call){let next=0;const results=[];const rss=setInterval(()=>{globalPeakRss=Math.max(globalPeakRss,rssMiB(instance.process.pid));},100);const started=performance.now();await Promise.all(Array.from({length:level.concurrency},async()=>{while(true){const index=next++;if(index>=level.count)return;results.push(await call(index));}}));clearInterval(rss);const elapsed=performance.now()-started;globalPeakRss=Math.max(globalPeakRss,rssMiB(instance.process.pid));const counts={};for(const result of results)counts[result.category]=(counts[result.category]||0)+1;return{concurrency:level.concurrency,action:level.action,requests:results.length,elapsedMs:+elapsed.toFixed(1),throughputPerSecond:+(results.length/(elapsed/1000)).toFixed(2),p50Ms:percentile(results.map(item=>item.latency),.5),p95Ms:percentile(results.map(item=>item.latency),.95),p99Ms:percentile(results.map(item=>item.latency),.99),outcomes:counts,unexpected:results.filter(item=>item.category==='unexpected-http-failure'||item.category==='unexpected-transport-failure').slice(0,3)};}
function payload(index){return{venueId:hostVenue.id,brief:{...brief,id:`load-brief-${index}`},organizer:{name:'Fictional Load Organizer',email:`load-${index}@example.test`,phone:'',organization:'Local QA'},resources:[{id:room.id,quantity:1}],questions:[],flexibleSlot:null,reviewed:true,idempotencyKey:`ops-load-${index}`};}
try{
  assert.ok(levels.reduce((sum,item)=>sum+item.count,0)<=500,'bounded profile must not exceed 500 requests');
  let instance=await start();baseUrl=instance.url;
  const initial=await request('/api/operations');assert.equal(initial.category,'success',JSON.stringify(initial));cookie=initial.headers.get('set-cookie')?.match(/backstage-demo-session=([^;]+)/)?.[1];assert.ok(cookie,'server issues a workspace session cookie');
  hostVenue=initial.result.venues.find(item=>item.kind==='demo'&&item.city==='Delhi NCR');room=hostVenue.resources.find(item=>item.kind==='room');assert.ok(hostVenue&&room);
  const results=[];
  for(const level of levels){
    let measured;
    if(level.action==='successful workspace reads')measured=await phase(instance,level,0,async()=>await request('/api/operations'));
    if(level.action==='draft saves')measured=await phase(instance,level,0,async index=>{const out=await request('/api/operations','POST',{type:'save-application',payload:payload(index)},'draft save');if(out.category==='success')out.applicationId=out.result.applicationId;return out;});
    if(level.action==='application submissions'){
      const drafts=(await request('/api/operations')).result.applications.filter(item=>item.status==='draft').slice(0,level.count);applicationIds=drafts.map(item=>item.id);applicationKeys=drafts.map(item=>item.idempotency_key);assert.equal(applicationIds.length,level.count);assert.ok(applicationKeys.every(Boolean));
      measured=await phase(instance,level,0,async index=>await request('/api/operations','POST',{type:'submit-application',payload:{...payload(index),idempotencyKey:applicationKeys[index],applicationId:applicationIds[index]}},'submission'));
    }
    if(level.action==='competing approvals'){
      const host=await request('/api/operations','POST',{type:'switch-role',role:'host'},'role switch');assert.equal(host.category,'success',JSON.stringify(host));
      measured=await phase(instance,level,0,async index=>await request('/api/operations','POST',{type:'approve',applicationId:applicationIds[index]},'competing approval'));
      const winners=measured; // Find the unique application whose approval committed.
      const after=(await request('/api/operations')).result.applications;const approved=after.filter(item=>item.status==='approved');assert.equal(approved.length,1);winnerId=approved[0].id;
      const organizer=await request('/api/operations','POST',{type:'switch-role',role:'organizer'},'role switch');assert.equal(organizer.category,'success');
      const winner=after.find(item=>item.id===winnerId);const organizerTask=winner.checklist.find(item=>item.owner==='organizer');completedItemId=organizerTask.id;
      const completion=await request('/api/operations','POST',{type:'toggle-checklist',applicationId:winnerId,itemId:completedItemId},'organizer checklist');assert.equal(completion.category,'success',JSON.stringify(completion));
      const hostRole=await request('/api/operations','POST',{type:'switch-role',role:'host'},'role switch');assert.equal(hostRole.category,'success');
      const hostTask=winner.checklist.find(item=>item.owner==='host');hostCompletedItemId=hostTask.id;
      const hostCompletion=await request('/api/operations','POST',{type:'toggle-checklist',applicationId:winnerId,itemId:hostCompletedItemId},'host checklist');assert.equal(hostCompletion.category,'success',JSON.stringify(hostCompletion));
      const restoreOrganizer=await request('/api/operations','POST',{type:'switch-role',role:'organizer'},'role switch');assert.equal(restoreOrganizer.category,'success');
      void winners;
    }
    if(measured.unexpected.length||Object.keys(measured.outcomes).length!==1&&!(level.action==='competing approvals'&&Object.keys(measured.outcomes).every(key=>['success','expected-resource-conflict'].includes(key))))throw new Error(`Unexpected errors during ${level.action}: ${JSON.stringify(measured)}`);
    results.push(measured);
  }
  const conflictPhase=results.at(-1);assert.equal(conflictPhase.outcomes.success,1);assert.equal(conflictPhase.outcomes['expected-resource-conflict'],89);
  const quotaProbe=await request('/api/venue-discovery','POST',{brief,conversation:[{role:'user',content:'Find researched venues.'}]},'quota persistence probe');assert.equal(quotaProbe.category,'expected-provider-configuration',JSON.stringify(quotaProbe));
  await stop();
  const readDb=new DatabaseSync(database);readDb.exec('PRAGMA foreign_keys=ON');const before={integrity:readDb.prepare('PRAGMA integrity_check').get().integrity_check,foreignKeyFailures:readDb.prepare('PRAGMA foreign_key_check').all().length,globalRequests:readDb.prepare("SELECT COALESCE(SUM(request_count),0) n FROM discovery_quota_counters WHERE scope='global'").get().n,applicationCount:readDb.prepare('SELECT count(*) n FROM applications').get().n,activeAllocations:readDb.prepare("SELECT count(*) n FROM allocations WHERE state='reservation'").get().n,completedChecklist:readDb.prepare('SELECT count(*) n FROM checklist_items WHERE completed_at IS NOT NULL').get().n};readDb.close();assert.equal(before.integrity,'ok');assert.equal(before.foreignKeyFailures,0);assert.equal(before.applicationCount,90);assert.equal(before.activeAllocations,1);assert.ok(before.completedChecklist>=2);assert.equal(before.globalRequests,1);
  instance=await start();baseUrl=instance.url;
  const restored=await request(`/api/operations?month=${date.slice(0,7)}`);assert.equal(restored.category,'success');const restoredApp=restored.result.applications.find(item=>item.id===winnerId);assert.equal(restoredApp.status,'approved');assert.ok(restoredApp.checklist.find(item=>item.id===completedItemId)?.completed_at);assert.ok(restoredApp.checklist.find(item=>item.id===hostCompletedItemId)?.completed_at);assert.equal(restored.result.calendar.allocations.filter(item=>item.state==='reservation').length,1);
  await stop();
  const afterDb=new DatabaseSync(database);afterDb.exec('PRAGMA foreign_keys=ON');const after={integrity:afterDb.prepare('PRAGMA integrity_check').get().integrity_check,foreignKeyFailures:afterDb.prepare('PRAGMA foreign_key_check').all().length,globalRequests:afterDb.prepare("SELECT COALESCE(SUM(request_count),0) n FROM discovery_quota_counters WHERE scope='global'").get().n,applicationCount:afterDb.prepare('SELECT count(*) n FROM applications').get().n,activeAllocations:afterDb.prepare("SELECT count(*) n FROM allocations WHERE state='reservation'").get().n,completedChecklist:afterDb.prepare('SELECT count(*) n FROM checklist_items WHERE completed_at IS NOT NULL').get().n};afterDb.close();assert.deepEqual(after,before);
  assert.ok(requestCount<=500);
  console.log(JSON.stringify({profile:'isolated successful operations workflow; provider check intentionally stops at missing OpenAI key',runtime:process.version,host:'localhost only',concurrency:results.map(item=>item.concurrency),requests:requestCount,phases:results,extraSuccessfulActions:['workspace initialization','role switches between simulations','organizer checklist completion','host checklist completion','one expected missing-provider quota probe','post-restart workspace read'],expectedBusinessRejections:conflictPhase.outcomes['expected-resource-conflict'],unexpectedErrors:0,peakSampledServerRssMiB:globalPeakRss,databaseBeforeRestart:before,databaseAfterRestart:after,persistenceVerified:true},null,2));
}finally{await stop();rmSync(dataDirectory,{recursive:true,force:true});}
