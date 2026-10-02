import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Worker} from 'node:worker_threads';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {getOverview,mutate,openOperationsStore,resolveWorkspace} from './operations-store.mjs';

function setup() {
  const dir=mkdtempSync(join(tmpdir(),'backstage-ops-'));
  const path=join(dir,'ops.sqlite');
  const db=openOperationsStore(path);
  const session=resolveWorkspace(db,undefined);
  let closed=false;
  return {dir,path,db,session,close(){if(!closed){db.close();closed=true;}rmSync(dir,{recursive:true,force:true});},markClosed(){closed=true;}};
}
function nextWeekday(offset=14) {
  const d=new Date(Date.now()+offset*86400000);d.setUTCHours(0,0,0,0);
  while(d.getUTCDay()===0)d.setUTCDate(d.getUTCDate()+1);
  return d.toISOString().slice(0,10);
}
function appPayload(venueId,resourceIds,options={}) {
  const date=options.date||nextWeekday();
  return {venueId,brief:{id:`brief-${Math.random()}`,title:options.title||'Community workshop',city:options.city||'Delhi NCR',eventType:'Workshop',date,startTime:options.startTime||'10:00',endTime:options.endTime||'12:00',audience:'Local community members',headcount:options.headcount||20,budgetAmount:0,currency:'INR',roomRequirements:[],equipmentRequirements:[],essentialRequirements:options.essentials||[],flexibleRequirements:[],setupMinutes:options.setupMinutes??30,cleanupMinutes:options.cleanupMinutes??30,savedAt:new Date().toISOString()},organizer:{name:'Test Organizer',email:'organizer@example.test'},resources:resourceIds.map((id)=>({id,quantity:1})),questions:['Is outside catering permitted?'],reviewed:true,idempotencyKey:options.key||crypto.randomUUID(),flexibleSlot:options.flexibleSlot||null};
}
function createApp(t,resources,options={}) {
  const city=options.city||'Delhi NCR';
  const venueId=options.venueId||getOverview(t.db,t.session.workspaceId,'organizer').venues.find((v)=>v.kind==='demo'&&v.city===city).id;
  const payload=appPayload(venueId,resources,{...options,city});
  const result=mutate(t.db,t.session.workspaceId,'organizer',{type:options.research?'save-application':'submit-application',payload});
  return {id:result.applicationId,payload};
}
function approve(t,applicationId){return mutate(t.db,t.session.workspaceId,'host',{type:'approve',applicationId});}
function resource(t,name,venueName='Backstage Demo House · Delhi NCR') {return getOverview(t.db,t.session.workspaceId,'organizer').venues.find((v)=>v.name===venueName).resources.find((r)=>r.name===name).id;}
function room(t){return resource(t,'Workshop Studio');}

test('workspace demo inventory is fictional, city-scoped, and separates access from approval',t=>{
  const x=setup();t.after(()=>x.close());
  const overview=getOverview(x.db,x.session.workspaceId,'organizer');
  const demos=overview.venues.filter((venue)=>venue.kind==='demo');
  const research=overview.venues.filter((venue)=>venue.kind==='research');
  assert.equal(demos.length,2);assert.deepEqual(new Set(demos.map((venue)=>venue.city)),new Set(['Delhi NCR','Bengaluru']));assert.equal(research.length,6);
  for(const venue of demos){assert.ok(['sponsored','pro-bono'].includes(venue.accessModel));assert.equal(venue.fulfillmentModel,'host-approval');assert.ok(venue.policy.accessHours);assert.ok(venue.resources.some((resource)=>resource.kind==='room'&&resource.capacity&&resource.capacity_layout));assert.ok(venue.resources.some((resource)=>resource.kind==='equipment'&&resource.quantity>0));assert.ok(x.db.prepare('SELECT 1 FROM availability_windows WHERE workspace_id=? AND venue_id=? LIMIT 1').get(x.session.workspaceId,venue.id));}
  assert.ok(research.every((venue)=>venue.accessModel==='unknown'&&venue.fulfillmentModel==='unknown'&&venue.resources.length===0));
});

test('real research venue applications can save drafts but cannot be submitted',t=>{
  const x=setup();t.after(()=>x.close());
  const researchId=getOverview(x.db,x.session.workspaceId,'organizer').venues.find((v)=>v.name.startsWith('Paytm Office, Noida')).id;
  const payload=appPayload(researchId,[],{city:'Delhi NCR'});
  const result=mutate(x.db,x.session.workspaceId,'organizer',{type:'save-application',payload});
  assert.equal(result.applicationId!==undefined,true);
  const saved=getOverview(x.db,x.session.workspaceId,'organizer').applications[0];
  assert.ok(saved.payload.sources.length>0);assert.ok(saved.payload.evidence.length>0);assert.ok(saved.payload.questions.some((question)=>question.includes('availability')));
  assert.throws(()=>mutate(x.db,x.session.workspaceId,'organizer',{type:'submit-application',payload}),/no verified Backstage booking authority/);
});

test('review is required and idempotency prevents duplicate submissions',t=>{
  const x=setup();t.after(()=>x.close());
  const payload=appPayload(getOverview(x.db,x.session.workspaceId,'organizer').venues.find((v)=>v.kind==='demo'&&v.city==='Delhi NCR').id,[room(x)]);payload.reviewed=false;
  assert.throws(()=>mutate(x.db,x.session.workspaceId,'organizer',{type:'submit-application',payload}),/review is required/);
  payload.reviewed=true;
  const first=mutate(x.db,x.session.workspaceId,'organizer',{type:'submit-application',payload});
  const second=mutate(x.db,x.session.workspaceId,'organizer',{type:'submit-application',payload});
  assert.equal(first.applicationId,second.applicationId);
  assert.equal(x.db.prepare('SELECT count(*) n FROM applications WHERE workspace_id=?').get(x.session.workspaceId).n,1);
});

test('an application draft can be reopened, edited, and submitted without creating a second request',t=>{
  const x=setup();t.after(()=>x.close());
  const payload=appPayload(getOverview(x.db,x.session.workspaceId,'organizer').venues.find((v)=>v.kind==='demo'&&v.city==='Delhi NCR').id,[room(x)]);
  const first=mutate(x.db,x.session.workspaceId,'organizer',{type:'save-application',payload});
  payload.applicationId=first.applicationId;payload.brief.title='Edited workshop';
  const saved=mutate(x.db,x.session.workspaceId,'organizer',{type:'save-application',payload});
  assert.equal(saved.applicationId,first.applicationId);
  const submitted=mutate(x.db,x.session.workspaceId,'organizer',{type:'submit-application',payload});
  assert.equal(submitted.applicationId,first.applicationId);
  assert.equal(x.db.prepare('SELECT count(*) n FROM applications WHERE workspace_id=?').get(x.session.workspaceId).n,1);
  assert.equal(x.db.prepare('SELECT status FROM applications WHERE id=?').get(first.applicationId).status,'submitted');
});

test('workspace cookie scopes applications and rejects foreign identifiers',t=>{
  const x=setup();t.after(()=>x.close());
  const first=createApp(x,[room(x)]);
  const other=resolveWorkspace(x.db,undefined);
  assert.equal(getOverview(x.db,other.workspaceId,'organizer').applications.length,0);
  assert.throws(()=>mutate(x.db,other.workspaceId,'host',{type:'approve',applicationId:first.id}),/not found in this demo workspace/);
});

test('invalid state transitions are rejected',t=>{
  const x=setup();t.after(()=>x.close());
  const app=createApp(x,[room(x)]);
  assert.throws(()=>mutate(x.db,x.session.workspaceId,'organizer',{type:'accept-alternative',applicationId:app.id}),/no proposed alternative/);
});

test('expired holds stop blocking a subsequent approval',t=>{
  const x=setup();t.after(()=>x.close());
  const date=nextWeekday(),one=createApp(x,[room(x)],{date}),two=createApp(x,[room(x)],{date});
  mutate(x.db,x.session.workspaceId,'host',{type:'hold',applicationId:one.id});
  x.db.prepare("UPDATE allocations SET expires_at='2000-01-01T00:00:00.000Z' WHERE application_id=?").run(one.id);
  const overview=getOverview(x.db,x.session.workspaceId,'host');
  assert.equal(overview.calendar.allocations.some(a=>a.application_id===one.id),false);
  assert.equal(overview.applications.find(app=>app.id===one.id).status,'submitted');
  assert.doesNotThrow(()=>approve(x,two.id));
});

test('setup and cleanup buffers block overlapping occupied intervals',t=>{
  const x=setup();t.after(()=>x.close());
  const date=nextWeekday();const first=createApp(x,[room(x)],{date,startTime:'11:00',endTime:'12:00',setupMinutes:30,cleanupMinutes:30});
  const second=createApp(x,[room(x)],{date,startTime:'12:15',endTime:'13:15',setupMinutes:30,cleanupMinutes:0});
  approve(x,first.id);
  assert.throws(()=>approve(x,second.id),/Conflict on Workshop Studio/);
});

test('adjacent setup-to-cleanup occupied intervals may both be approved',t=>{
  const x=setup();t.after(()=>x.close());
  const date=nextWeekday();
  const first=createApp(x,[room(x)],{date,startTime:'10:00',endTime:'12:00',setupMinutes:30,cleanupMinutes:30});
  const adjacent=createApp(x,[room(x)],{date,startTime:'13:00',endTime:'15:00',setupMinutes:30,cleanupMinutes:30});
  assert.doesNotThrow(()=>approve(x,first.id));
  assert.doesNotThrow(()=>approve(x,adjacent.id));
});

test('internal blocks prevent allocation and duplicate resource units are rejected',t=>{
  const x=setup();t.after(()=>x.close());
  const date=nextWeekday();const app=createApp(x,[room(x)],{date});
  assert.throws(()=>mutate(x.db,x.session.workspaceId,'organizer',{type:'save-application',payload:{...app.payload,idempotencyKey:crypto.randomUUID(),resources:[{id:room(x),quantity:1},{id:room(x),quantity:1}]}}),/appear only once/);
  mutate(x.db,x.session.workspaceId,'host',{type:'add-internal-block',venueId:getOverview(x.db,x.session.workspaceId,'host').venues.find((v)=>v.name.includes('Delhi NCR')).id,resourceId:room(x),date,startTime:'09:00',endTime:'13:30',reason:'Demo host setup'});
  assert.throws(()=>approve(x,app.id),/internal block/);
});

test('shared equipment is conflict-safe even when separate rooms are allocated',t=>{
  const x=setup();t.after(()=>x.close());
  const date=nextWeekday();
  const first=createApp(x,[resource(x,'Workshop Studio'),resource(x,'Projector')],{date});
  const second=createApp(x,[resource(x,'Gathering Salon'),resource(x,'Projector')],{date});
  approve(x,first.id);
  assert.throws(()=>approve(x,second.id),/Conflict on Projector/);
});

test('approval requires all requested room count and named shared equipment quantities',t=>{
  const x=setup();t.after(()=>x.close());
  const date=nextWeekday();
  const twoBreakouts=createApp(x,[room(x)],{date});
  const brief=twoBreakouts.payload.brief;brief.roomRequirements=['two breakout rooms'];
  x.db.prepare('UPDATE applications SET brief_json=? WHERE id=?').run(JSON.stringify(brief),twoBreakouts.id);
  assert.throws(()=>approve(x,twoBreakouts.id),/room condition/);
  const equipment=createApp(x,[room(x),resource(x,'Projector')],{date:nextWeekday(18)});
  const equipmentBrief=equipment.payload.brief;equipmentBrief.equipmentRequirements=['2 projectors'];
  x.db.prepare('UPDATE applications SET brief_json=? WHERE id=?').run(JSON.stringify(equipmentBrief),equipment.id);
  assert.throws(()=>approve(x,equipment.id),/equipment “2 projectors”/);
});

test('unknown essential conditions cannot be silently approved',t=>{
  const x=setup();t.after(()=>x.close());
  const app=createApp(x,[room(x)],{essentials:['step-free wheelchair access']});
  assert.throws(()=>approve(x,app.id),/not established/);
});

test('cancellation releases allocations and approval snapshots brief and checklist',t=>{
  const x=setup();t.after(()=>x.close());
  const date=nextWeekday();const first=createApp(x,[room(x),resource(x,'Projector')],{date});
  approve(x,first.id);
  const row=x.db.prepare('SELECT accepted_brief_json FROM applications WHERE id=?').get(first.id);
  assert.ok(JSON.parse(row.accepted_brief_json).title);
  assert.ok(x.db.prepare('SELECT count(*) n FROM checklist_items WHERE application_id=?').get(first.id).n>=5);
  const task=x.db.prepare('SELECT id FROM checklist_items WHERE application_id=? LIMIT 1').get(first.id);
  mutate(x.db,x.session.workspaceId,'organizer',{type:'toggle-checklist',applicationId:first.id,itemId:task.id});
  assert.equal(x.db.prepare('SELECT count(*) n FROM checklist_history WHERE checklist_item_id=?').get(task.id).n,1);
  assert.doesNotThrow(()=>approve(x,first.id));
  assert.equal(x.db.prepare('SELECT count(*) n FROM checklist_items WHERE application_id=?').get(first.id).n,7);
  mutate(x.db,x.session.workspaceId,'organizer',{type:'cancel-application',applicationId:first.id});
  const second=createApp(x,[room(x),resource(x,'Projector')],{date});
  assert.doesNotThrow(()=>approve(x,second.id));
});

test('proposed alternatives require pre-approved flexibility and explicit organizer acceptance',t=>{
  const x=setup();t.after(()=>x.close());
  const initial=nextWeekday(20),alternate=nextWeekday(22);const flexDate=nextWeekday(18);const flexEnd=nextWeekday(28);
  const app=createApp(x,[room(x)],{date:initial,flexibleSlot:{dateStart:flexDate,dateEnd:flexEnd,startTime:'09:00',endTime:'16:00'}});
  mutate(x.db,x.session.workspaceId,'host',{type:'propose-alternative',applicationId:app.id,date:alternate,startTime:'13:00',endTime:'15:00'});
  assert.equal(x.db.prepare('SELECT count(*) n FROM allocations WHERE application_id=?').get(app.id).n,0);
  mutate(x.db,x.session.workspaceId,'organizer',{type:'accept-alternative',applicationId:app.id});
  assert.equal(JSON.parse(x.db.prepare('SELECT brief_json FROM applications WHERE id=?').get(app.id).brief_json).date,alternate);
  assert.doesNotThrow(()=>approve(x,app.id));
});

test('end-to-end demo: shared projector conflict, accepted free slot, both reservations and checklists',t=>{
  const x=setup();t.after(()=>x.close());
  const requestedDate=nextWeekday(20),alternativeDate=nextWeekday(24),flexFrom=nextWeekday(18),flexTo=nextWeekday(30);
  const projector=resource(x,'Projector');
  const first=createApp(x,[room(x),projector],{date:requestedDate,title:'First demo workshop'});
  const second=createApp(x,[resource(x,'Gathering Salon'),projector],{date:requestedDate,title:'Second demo workshop',flexibleSlot:{dateStart:flexFrom,dateEnd:flexTo,startTime:'09:00',endTime:'16:00'}});
  approve(x,first.id);
  assert.throws(()=>approve(x,second.id),/Conflict on Projector/);
  mutate(x.db,x.session.workspaceId,'host',{type:'propose-alternative',applicationId:second.id,date:alternativeDate,startTime:'13:00',endTime:'15:00'});
  assert.equal(x.db.prepare("SELECT count(*) n FROM allocations WHERE application_id=? AND state='reservation'").get(second.id).n,0);
  mutate(x.db,x.session.workspaceId,'organizer',{type:'accept-alternative',applicationId:second.id});
  assert.equal(x.db.prepare('SELECT count(*) n FROM allocations WHERE application_id=? AND state=\'reservation\'').get(second.id).n,0);
  approve(x,second.id);
  const overview=getOverview(x.db,x.session.workspaceId,'host',requestedDate.slice(0,7));
  const reservations=overview.calendar.allocations.filter((allocation)=>allocation.state==='reservation'&&allocation.resource_id===projector);
  assert.equal(reservations.length,2);
  assert.equal(overview.applications.filter((app)=>app.status==='approved').length,2);
  assert.ok(overview.applications.filter((app)=>app.status==='approved').every((app)=>app.checklist.length>=5));
  assert.equal(JSON.parse(x.db.prepare('SELECT brief_json FROM applications WHERE id=?').get(second.id).brief_json).date,alternativeDate);
});

test('state and checklist persist after database restart',t=>{
  const x=setup();t.after(()=>x.close());
  const app=createApp(x,[room(x)]);approve(x,app.id);const sessionToken=x.session.token,workspaceId=x.session.workspaceId;
  x.db.close();
  x.markClosed();
  const reopened=openOperationsStore(x.path);t.after(()=>reopened.close());
  assert.equal(resolveWorkspace(reopened,sessionToken).workspaceId,workspaceId);
  const overview=getOverview(reopened,workspaceId,'organizer');
  assert.equal(overview.applications[0].status,'approved');assert.ok(overview.applications[0].checklist.length>0);
});

test('versioned migration upgrades an existing v1 operational database without losing venue data',t=>{
  const dir=mkdtempSync(join(tmpdir(),'backstage-migration-')),path=join(dir,'migration.sqlite');
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const db=new DatabaseSync(path);db.exec(readFileSync(new URL('../db/migrations/001_operations.sql',import.meta.url),'utf8'));
  db.exec("CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL); INSERT INTO schema_migrations VALUES(1,'2026-10-01T00:00:00.000Z'); INSERT INTO workspaces VALUES('ws:test','2026-10-01T00:00:00.000Z'); INSERT INTO venues(id,workspace_id,name,city,locality,kind,policy_json) VALUES('ws:test:demo-delhi-host','ws:test','Backstage Demo House · Delhi NCR','Delhi NCR','Fictional','demo','{\"accessModel\":\"sponsored\",\"approval\":\"host-approval\"}'); INSERT INTO resources(id,workspace_id,venue_id,name,kind,quantity,capacity) VALUES('ws:test:demo-room','ws:test','ws:test:demo-delhi-host','Workshop Studio','room',1,40)");db.close();
  const upgraded=openOperationsStore(path);
  const venue=upgraded.prepare('SELECT access_model,fulfillment_model FROM venues WHERE id=?').get('ws:test:demo-delhi-host');
  const resourceRow=upgraded.prepare('SELECT capacity_layout FROM resources WHERE id=?').get('ws:test:demo-room');
  assert.equal(venue.access_model,'sponsored');assert.equal(venue.fulfillment_model,'host-approval');assert.equal(resourceRow.capacity_layout,'classroom rows');
  assert.ok(upgraded.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='checklist_history'").get());upgraded.close();
});

function worker(path,workspaceId,applicationId) {
  return new Promise((resolveWorker,reject)=>{
    const w=new Worker(new URL('./ops-race-worker.mjs',import.meta.url),{workerData:{path,workspaceId,applicationId}});
    let settled=false;
    w.on('message',(message)=>{if(message.ready){w.postMessage('go');return;}settled=true;resolveWorker(message);});
    w.on('error',reject);w.on('exit',(code)=>{if(!settled&&code!==0)reject(new Error(`worker exited ${code}`));});
  });
}

test('separate SQLite connections cannot concurrently approve overlapping requests',async t=>{
  const x=setup();t.after(()=>x.close());
  const date=nextWeekday();const first=createApp(x,[room(x)],{date}),second=createApp(x,[room(x)],{date});
  const outcomes=await Promise.all([worker(x.path,x.session.workspaceId,first.id),worker(x.path,x.session.workspaceId,second.id)]);
  assert.equal(outcomes.filter((o)=>o.ok).length,1,JSON.stringify(outcomes));
  assert.equal(outcomes.filter((o)=>!o.ok&&o.error.includes('Conflict on')).length,1,JSON.stringify(outcomes));
});
