import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createServer} from 'node:net';
import {randomUUID} from 'node:crypto';

const standalone=resolve('.next/standalone/server.js');
const dataDirectory=mkdtempSync(join(tmpdir(),'backstage-backend-stress-'));
const database=join(dataDirectory,'operations.sqlite');
const requestTotal=500;
const levels=[{concurrency:1,count:100},{concurrency:5,count:100},{concurrency:20,count:100},{concurrency:50,count:100}];
let server;

function freePort(){return new Promise((resolvePort,reject)=>{const listener=createServer();listener.once('error',reject);listener.listen(0,'127.0.0.1',()=>{const address=listener.address();listener.close(error=>error?reject(error):resolvePort(address.port));});});}
async function waitForServer(url){const deadline=Date.now()+30_000;while(Date.now()<deadline){try{const response=await fetch(`${url}/api/health`,{signal:AbortSignal.timeout(1000)});if(response.ok)return;}catch{}await new Promise(resolveWait=>setTimeout(resolveWait,150));}throw new Error('Isolated standalone server did not become healthy within 30 seconds.');}
async function start(){
  const port=await freePort();const url=`http://127.0.0.1:${port}`;
  const env={PATH:process.env.PATH||'/usr/bin:/bin',NODE_ENV:'production',PORT:String(port),HOSTNAME:'127.0.0.1',APP_ORIGIN:url,BACKSTAGE_DB_PATH:database,DEMO_DISCOVERY_DAILY_PER_SESSION:'100',DEMO_DISCOVERY_DAILY_GLOBAL:'500',NEXT_TELEMETRY_DISABLED:'1'};
  // Credentials are deliberately absent: each valid request stops before external providers.
  server=spawn(process.execPath,[standalone],{cwd:resolve('.next/standalone'),env,stdio:'ignore'});
  await waitForServer(url);return{url,process:server};
}
async function stop(){if(!server)return;const child=server;server=null;if(child.exitCode!==null)return;child.kill('SIGTERM');await Promise.race([new Promise(resolveExit=>child.once('exit',resolveExit)),new Promise(resolveTimeout=>setTimeout(resolveTimeout,4000))]);if(child.exitCode===null)child.kill('SIGKILL');}
function rssKb(pid){try{return Number(execFileSync('ps',['-o','rss=','-p',String(pid)],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim())||0;}catch{return 0;}}
function percentile(values,p){if(!values.length)return 0;const ordered=[...values].sort((a,b)=>a-b);return Number(ordered[Math.min(ordered.length-1,Math.ceil(p*ordered.length)-1)].toFixed(1));}
function brief(){return{ id:'stress-brief',title:'Fictional localhost QA workshop',city:'Delhi NCR',eventType:'Workshop',date:'2030-11-12',startTime:'10:00',endTime:'12:00',audience:'Fictional test attendees',headcount:20,budgetAmount:0,currency:'INR',roomRequirements:[],equipmentRequirements:[],essentialRequirements:[],flexibleRequirements:[],setupMinutes:0,cleanupMinutes:0,savedAt:'2030-01-01T00:00:00.000Z' };}
async function sendDiscovery(url,index){
  const started=performance.now();
  try{
    const response=await fetch(`${url}/api/venue-discovery`,{method:'POST',headers:{Origin:url,'Content-Type':'application/json',Cookie:`backstage-demo-session=qa-forged-${randomUUID()}`},body:JSON.stringify({brief:brief(),conversation:[{role:'user',content:'Find researched leads and preserve unknowns.'}]}),signal:AbortSignal.timeout(15_000)});
    let body={};try{body=await response.json();}catch{}
    const category=response.status===503&&String(body.error||'').includes('OPENAI_API_KEY')?'expected-provider-configuration':response.status===429?'expected-quota-limit':response.status>=500?'unexpected-server-error':response.status===200?'unexpected-provider-success':`unexpected-http-${response.status}`;
    return{latencyMs:performance.now()-started,status:response.status,category,index};
  }catch{return{latencyMs:performance.now()-started,status:0,category:'unexpected-transport-error',index};}
}
async function runLevel(url,processHandle,level,offset){
  const results=[];let next=0;let maxRssKb=0;
  const sampler=setInterval(()=>{maxRssKb=Math.max(maxRssKb,rssKb(processHandle.pid));},100);
  const started=performance.now();
  await Promise.all(Array.from({length:level.concurrency},async()=>{while(true){const index=next++;if(index>=level.count)return;results.push(await sendDiscovery(url,offset+index));}}));
  const elapsedMs=performance.now()-started;clearInterval(sampler);maxRssKb=Math.max(maxRssKb,rssKb(processHandle.pid));
  const statuses={};for(const item of results)statuses[item.category]=(statuses[item.category]||0)+1;
  const metrics={concurrency:level.concurrency,requests:results.length,elapsedMs:Number(elapsedMs.toFixed(1)),throughputPerSecond:Number((results.length/(elapsedMs/1000)).toFixed(2)),p50Ms:percentile(results.map(item=>item.latencyMs),.50),p95Ms:percentile(results.map(item=>item.latencyMs),.95),p99Ms:percentile(results.map(item=>item.latencyMs),.99),maxServerRssMiB:Number((maxRssKb/1024).toFixed(1)),outcomes:statuses};
  assert.equal(results.length,level.count);assert.equal(statuses['expected-provider-configuration'],level.count,`unexpected statuses at concurrency ${level.concurrency}: ${JSON.stringify(statuses)}`);
  return metrics;
}

try{
  assert.ok(requestTotal<=500);assert.ok(levels.reduce((sum,level)=>sum+level.count,0)===400);
  let instance=await start();
  const metrics=[];let offset=0;
  for(const level of levels){metrics.push(await runLevel(instance.url,instance.process,level,offset));offset+=level.count;}
  await stop();

  const db=new DatabaseSync(database);db.exec('PRAGMA foreign_keys=ON');
  const before={integrity:db.prepare('PRAGMA integrity_check').get().integrity_check,foreignKeyFailures:db.prepare('PRAGMA foreign_key_check').all().length,globalRequests:db.prepare("SELECT COALESCE(SUM(request_count),0) n FROM discovery_quota_counters WHERE scope='global'").get().n};
  db.close();assert.equal(before.integrity,'ok');assert.equal(before.foreignKeyFailures,0);assert.equal(before.globalRequests,400);

  instance=await start();
  const restartLevel=await runLevel(instance.url,instance.process,{concurrency:50,count:100},400);
  await stop();
  const afterDb=new DatabaseSync(database);afterDb.exec('PRAGMA foreign_keys=ON');
  const after={integrity:afterDb.prepare('PRAGMA integrity_check').get().integrity_check,foreignKeyFailures:afterDb.prepare('PRAGMA foreign_key_check').all().length,globalRequests:afterDb.prepare("SELECT COALESCE(SUM(request_count),0) n FROM discovery_quota_counters WHERE scope='global'").get().n};afterDb.close();
  assert.equal(after.integrity,'ok');assert.equal(after.foreignKeyFailures,0);assert.equal(after.globalRequests,500);
  console.log(JSON.stringify({environment:'Node '+process.versions.node,server:'isolated standalone on 127.0.0.1',providerMode:'credentials absent; provider calls intentionally stopped before egress',requestedConcurrencyLevels:metrics.map(item=>item.concurrency),requests:offset+restartLevel.requests,metrics:[...metrics,restartLevel],memory:'maximum sampled standalone-server RSS per load phase',unexpectedErrors:0,expectedProviderConfigurationFailures:500,expectedBusinessConflicts:0,databaseBeforeRestart:before,databaseAfterRestart:after},null,2));
}finally{await stop();rmSync(dataDirectory,{recursive:true,force:true});}
