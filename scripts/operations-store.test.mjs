import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Worker} from 'node:worker_threads';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {consumeDiscoveryQuota,getOverview,mutate,openOperationsStore,resolveWorkspace} from './operations-store.mjs';

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

test('research drafts keep server-resolved contact routes and ignore client-supplied contacts',t=>{
  const x=setup();t.after(()=>x.close());
  const venue=getOverview(x.db,x.session.workspaceId,'organizer').venues.find((v)=>v.name==='SAIACS CEO Centre');
  const contacts=[{id:'contact-saiacs-events-email',venueIds:['venue-saiacs-ceo-centre-bengaluru'],type:'email',value:'ceoenquiry@saiacs-ceocenter.com',purpose:'Booking requests and event requirements.',scope:'venue-specific',checkedAt:'2026-10-05',sourceReferences:[{id:'source-saiacs-contact',title:'Contact SAIACS CEO Centre',url:'https://saiacs-ceocenter.com/contact-hotel-in-bengaluru.html',checkedAt:'2026-10-05'}]}];
  const trusted={venueId:'venue-saiacs-ceo-centre-bengaluru',name:venue.name,city:venue.city,locality:venue.locality,summary:'Published summary',capturedAt:new Date().toISOString(),contacts,sources:[{id:'source-saiacs-ceo-centre',title:'SAIACS',url:'https://saiacs-ceocenter.com/'}],evidence:[{claim:'Hosts events',value:'Documented',evidenceType:'public-documentation',qualification:null,checkedAt:'2026-10-02',sourceReferences:[]}]};
  const payload={...appPayload(venue.id,[],{city:'Bengaluru'}),contacts:[{type:'phone',value:'+910000000000'}]};
  mutate(x.db,x.session.workspaceId,'organizer',{type:'save-application',payload},trusted);
  const saved=getOverview(x.db,x.session.workspaceId,'organizer').applications[0];
  assert.deepEqual(saved.payload.contacts,contacts);
  assert.equal(saved.payload.venueKind,'research');
  const untrusted=getOverview(x.db,x.session.workspaceId,'organizer').venues.find((v)=>v.name.startsWith('Paytm Office, Noida'));
  mutate(x.db,x.session.workspaceId,'organizer',{type:'save-application',payload:{...appPayload(untrusted.id,[],{city:'Delhi NCR'}),contacts:[{type:'phone',value:'+910000000000'}]}},trusted);
  assert.deepEqual(getOverview(x.db,x.session.workspaceId,'organizer').applications.find((app)=>app.venue_id===untrusted.id).payload.contacts,[],'evidence for another venue identity is never attached');
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

test('essential equipment must be selected for this request, even when the venue owns it',t=>{
  const x=setup();t.after(()=>x.close());
  const app=createApp(x,[room(x)],{essentials:['Projector']});
  assert.ok(getOverview(x.db,x.session.workspaceId,'host').venues.find(v=>v.kind==='demo'&&v.city==='Delhi NCR').resources.some(r=>r.name==='Projector'));
  assert.throws(()=>approve(x,app.id),/essential condition “projector” is not established/i);
});

test('resource labels do not satisfy undocumented equipment qualifications',t=>{
  const x=setup();t.after(()=>x.close());
  const projector=resource(x,'Projector');
  const requested=createApp(x,[room(x),projector],{essentials:['Projector with HDMI']});
  assert.throws(()=>approve(x,requested.id),/not established by the selected resources/);
  const equipment=createApp(x,[room(x),projector],{date:nextWeekday(18)});
  equipment.payload.brief.equipmentRequirements=['Projector with HDMI'];
  x.db.prepare('UPDATE applications SET brief_json=? WHERE id=?').run(JSON.stringify(equipment.payload.brief),equipment.id);
  assert.throws(()=>approve(x,equipment.id),/selected resources at the requested quantity/);
});

test('general food permission does not establish dietary guarantees and room requests inspect selected identities',t=>{
  const x=setup();t.after(()=>x.close());
  const dietary=createApp(x,[room(x)],{essentials:['Vegan food options']});
  assert.throws(()=>approve(x,dietary.id),/dietary or allergy guarantee/);
  const specific=createApp(x,[room(x)],{date:nextWeekday(18)});specific.payload.brief.roomRequirements=['Gathering Salon'];
  x.db.prepare('UPDATE applications SET brief_json=? WHERE id=?').run(JSON.stringify(specific.payload.brief),specific.id);
  assert.throws(()=>approve(x,specific.id),/selected rooms and layouts/);
  const size=createApp(x,[room(x)],{date:nextWeekday(22)});size.payload.brief.roomRequirements=['large workshop room'];
  x.db.prepare('UPDATE applications SET brief_json=? WHERE id=?').run(JSON.stringify(size.payload.brief),size.id);
  assert.throws(()=>approve(x,size.id),/selected rooms and layouts/);
});

test('explicit negative host rules are preserved while opposite or unestablished conditions block approval',t=>{
  const x=setup();t.after(()=>x.close());
  const prohibited=createApp(x,[room(x)],{essentials:['No alcohol at this event']});
  assert.doesNotThrow(()=>approve(x,prohibited.id));
  const required=createApp(x,[room(x)],{date:nextWeekday(18),essentials:['Alcohol must be available']});
  assert.throws(()=>approve(x,required.id),/explicitly prohibits/);
  const host= getOverview(x.db,x.session.workspaceId,'host').venues.find((venue)=>venue.kind==='demo'&&venue.city==='Delhi NCR');
  const policy={...host.policy,alcoholAllowed:true};
  x.db.prepare('UPDATE venues SET policy_json=? WHERE workspace_id=? AND id=?').run(JSON.stringify(policy),x.session.workspaceId,host.id);
  const unknown=createApp(x,[room(x)],{date:nextWeekday(22),essentials:['No alcohol at this event']});
  assert.throws(()=>approve(x,unknown.id),/not established by the host's alcohol policy/);
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
  const task=x.db.prepare("SELECT id FROM checklist_items WHERE application_id=? AND owner='organizer' LIMIT 1").get(first.id);
  mutate(x.db,x.session.workspaceId,'organizer',{type:'toggle-checklist',applicationId:first.id,itemId:task.id});
  assert.equal(x.db.prepare('SELECT count(*) n FROM checklist_history WHERE checklist_item_id=?').get(task.id).n,1);
  assert.doesNotThrow(()=>approve(x,first.id));
  assert.equal(x.db.prepare('SELECT count(*) n FROM checklist_items WHERE application_id=?').get(first.id).n,7);
  mutate(x.db,x.session.workspaceId,'organizer',{type:'cancel-application',applicationId:first.id});
  const second=createApp(x,[room(x),resource(x,'Projector')],{date});
  assert.doesNotThrow(()=>approve(x,second.id));
});

test('checklist tasks have schedule-based deadlines and role ownership is enforced',t=>{
  const x=setup();t.after(()=>x.close());
  const app=createApp(x,[room(x),resource(x,'Projector')],{startTime:'10:00',endTime:'12:00',setupMinutes:30,cleanupMinutes:20});
  approve(x,app.id);
  const tasks=x.db.prepare('SELECT * FROM checklist_items WHERE application_id=?').all(app.id);
  const due=(label)=>new Date(tasks.find((task)=>task.label===label).due_at).getTime();
  const start=new Date(`${app.payload.brief.date}T10:00:00+05:30`).getTime(),end=new Date(`${app.payload.brief.date}T12:00:00+05:30`).getTime();
  assert.equal(due('Confirm room layout and prepare the selected room'),start-30*60000);
  assert.equal(due('Test allocated AV and shared equipment before doors open'),start-15*60000);
  assert.equal(due('Complete room setup before guest arrival'),start);
  assert.equal(due('Restore the room and complete cleanup'),end+30*60000);
  assert.equal(due('Return shared equipment after the event'),end+30*60000);
  const allocation=x.db.prepare("SELECT ends_at FROM allocations WHERE application_id=? AND state='reservation' LIMIT 1").get(app.id);
  assert.equal(new Date(allocation.ends_at).getTime(),end+30*60000);
  const hostTask=tasks.find((task)=>task.owner==='host'),organizerTask=tasks.find((task)=>task.owner==='organizer');
  assert.throws(()=>mutate(x.db,x.session.workspaceId,'organizer',{type:'toggle-checklist',applicationId:app.id,itemId:hostTask.id}),/belongs to the host/);
  assert.throws(()=>mutate(x.db,x.session.workspaceId,'host',{type:'toggle-checklist',applicationId:app.id,itemId:organizerTask.id}),/belongs to the organizer/);
  mutate(x.db,x.session.workspaceId,'host',{type:'toggle-checklist',applicationId:app.id,itemId:hostTask.id});
  mutate(x.db,x.session.workspaceId,'organizer',{type:'toggle-checklist',applicationId:app.id,itemId:organizerTask.id});
  const shared=getOverview(x.db,x.session.workspaceId,'host').applications.find((row)=>row.id===app.id).checklist;
  assert.equal(shared.find((item)=>item.id===hostTask.id).completed_at!==null,true);
  assert.equal(shared.find((item)=>item.id===organizerTask.id).completed_at!==null,true);
});

test('deadline migration repairs only incomplete tasks and preserves completed history',t=>{
  const x=setup();
  const app=createApp(x,[room(x),resource(x,'Projector')],{startTime:'10:00',endTime:'12:00',cleanupMinutes:25});approve(x,app.id);
  const tasks=x.db.prepare('SELECT * FROM checklist_items WHERE application_id=? ORDER BY created_at').all(app.id);
  const incomplete=tasks.find(task=>task.label==='Return shared equipment after the event');
  const completed=tasks.find(task=>task.label==='Complete room setup before guest arrival');
  const oldDue='2000-01-01T00:00:00.000Z',completedAt='2026-08-01T01:00:00.000Z';
  x.db.prepare('UPDATE checklist_items SET due_at=? WHERE id IN (?,?)').run(oldDue,incomplete.id,completed.id);
  x.db.prepare('UPDATE checklist_items SET completed_at=? WHERE id=?').run(completedAt,completed.id);
  x.db.prepare('INSERT INTO checklist_history(id,workspace_id,checklist_item_id,actor,completed,created_at) VALUES(?,?,?,?,?,?)').run('preserved-history',x.session.workspaceId,completed.id,'host',1,completedAt);
  x.db.prepare("UPDATE venues SET policy_json=json_remove(policy_json,'$.cleanupBufferMinutes') WHERE workspace_id=? AND kind='demo'").run(x.session.workspaceId);
  x.db.prepare('DELETE FROM schema_migrations WHERE version=3').run();const path=x.path;x.db.close();x.markClosed();
  const migrated=openOperationsStore(path);t.after(()=>migrated.close());
  const repaired=migrated.prepare('SELECT due_at,completed_at FROM checklist_items WHERE id=?').get(incomplete.id);
  assert.notEqual(repaired.due_at,oldDue);assert.equal(repaired.completed_at,null);
  const preserved=migrated.prepare('SELECT due_at,completed_at FROM checklist_items WHERE id=?').get(completed.id);
  assert.equal(preserved.due_at,oldDue);assert.equal(preserved.completed_at,completedAt);
  assert.equal(migrated.prepare('SELECT count(*) n FROM checklist_history WHERE checklist_item_id=?').get(completed.id).n,1);
  assert.equal(JSON.parse(migrated.prepare('SELECT policy_json FROM venues WHERE id=?').get(app.payload.venueId).policy_json).cleanupBufferMinutes,30);
});

test('expired holds do not prevent availability withdrawal or internal blocks, active reservations remain protected',t=>{
  const x=setup();t.after(()=>x.close());
  const app=createApp(x,[room(x)]),resourceId=room(x);const venueId=x.db.prepare('SELECT venue_id FROM resources WHERE workspace_id=? AND id=?').get(x.session.workspaceId,resourceId).venue_id;
  mutate(x.db,x.session.workspaceId,'host',{type:'hold',applicationId:app.id});
  const occupied=x.db.prepare("SELECT starts_at,ends_at FROM allocations WHERE application_id=?").get(app.id);
  const availability=x.db.prepare('SELECT * FROM availability_windows WHERE workspace_id=? AND resource_id=? AND released=1 AND starts_at<=? AND ends_at>=? LIMIT 1').get(x.session.workspaceId,resourceId,occupied.starts_at,occupied.ends_at);
  assert.ok(availability);
  assert.throws(()=>mutate(x.db,x.session.workspaceId,'host',{type:'withdraw-availability',availabilityId:availability.id}),/active allocation/);
  assert.throws(()=>mutate(x.db,x.session.workspaceId,'host',{type:'add-internal-block',venueId,resourceId,date:app.payload.brief.date,startTime:'10:30',endTime:'11:00',reason:'Block during live hold'}),/active allocation/);
  x.db.prepare("UPDATE allocations SET expires_at='2000-01-01T00:00:00.000Z' WHERE application_id=?").run(app.id);
  assert.doesNotThrow(()=>mutate(x.db,x.session.workspaceId,'host',{type:'add-internal-block',venueId,resourceId,date:app.payload.brief.date,startTime:'10:30',endTime:'11:00',reason:'Block after hold expiry'}));
  assert.doesNotThrow(()=>mutate(x.db,x.session.workspaceId,'host',{type:'withdraw-availability',availabilityId:availability.id}));
  const another=createApp(x,[room(x)],{date:nextWeekday(18)});approve(x,another.id);
  const reservation=x.db.prepare("SELECT * FROM allocations WHERE application_id=? AND state='reservation'").get(another.id);
  assert.throws(()=>mutate(x.db,x.session.workspaceId,'host',{type:'add-internal-block',venueId:reservation.workspace_id+':demo-delhi-host',resourceId:reservation.resource_id,date:another.payload.brief.date,startTime:'10:30',endTime:'11:00'}),/active allocation/);
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

test('bounded SQLite initialization contention returns the sanitized storage sentinel and can recover',t=>{
  const dir=mkdtempSync(join(tmpdir(),'backstage-init-lock-')),path=join(dir,'locked.sqlite');
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const lock=new DatabaseSync(path);lock.exec('PRAGMA journal_mode=DELETE; BEGIN EXCLUSIVE;');
  assert.throws(()=>openOperationsStore(path,{initializationTimeoutMs:100}),error=>error instanceof Error&&error.message==='PERSISTENT_STORAGE_UNAVAILABLE');
  lock.exec('ROLLBACK');lock.close();
  const recovered=openOperationsStore(path);assert.equal(recovered.prepare('PRAGMA integrity_check').get().integrity_check,'ok');recovered.close();
});

test('upgrade preserves applications, allocations, completed checklist history, and discovery quotas',t=>{
  const x=setup();
  const roomId=resource(x,'Workshop Studio');const projectorId=resource(x,'Projector');
  const app=createApp(x,[roomId,projectorId]);approve(x,app.id);
  const approved=getOverview(x.db,x.session.workspaceId,'organizer').applications.find(item=>item.id===app.id);
  const organizerTask=approved.checklist.find(item=>item.owner==='organizer');
  mutate(x.db,x.session.workspaceId,'organizer',{type:'toggle-checklist',applicationId:app.id,itemId:organizerTask.id});
  consumeDiscoveryQuota(x.db,'upgrade-preservation-session',{perSession:10,global:50});
  const before={applications:x.db.prepare('SELECT id,status,payload_json,brief_json,accepted_brief_json FROM applications WHERE workspace_id=?').all(x.session.workspaceId),allocations:x.db.prepare('SELECT application_id,resource_id,state,starts_at,ends_at FROM allocations WHERE workspace_id=? ORDER BY resource_id').all(x.session.workspaceId),history:x.db.prepare('SELECT application_id,actor,from_status,to_status,note FROM transition_history WHERE workspace_id=? ORDER BY created_at').all(x.session.workspaceId),checklist:x.db.prepare('SELECT application_id,label,owner,due_at,completed_at FROM checklist_items WHERE workspace_id=? ORDER BY id').all(x.session.workspaceId),checklistHistory:x.db.prepare('SELECT actor,completed FROM checklist_history WHERE workspace_id=?').all(x.session.workspaceId),quota:x.db.prepare('SELECT period,scope,subject_hash,request_count FROM discovery_quota_counters ORDER BY scope,subject_hash').all()};
  x.db.prepare('DELETE FROM schema_migrations WHERE version IN (2,3,4)').run();
  const path=x.path;x.db.close();x.markClosed();
  const upgraded=openOperationsStore(path);t.after(()=>upgraded.close());
  const workspaceId=x.session.workspaceId;
  const after={applications:upgraded.prepare('SELECT id,status,payload_json,brief_json,accepted_brief_json FROM applications WHERE workspace_id=?').all(workspaceId),allocations:upgraded.prepare('SELECT application_id,resource_id,state,starts_at,ends_at FROM allocations WHERE workspace_id=? ORDER BY resource_id').all(workspaceId),history:upgraded.prepare('SELECT application_id,actor,from_status,to_status,note FROM transition_history WHERE workspace_id=? ORDER BY created_at').all(workspaceId),checklist:upgraded.prepare('SELECT application_id,label,owner,due_at,completed_at FROM checklist_items WHERE workspace_id=? ORDER BY id').all(workspaceId),checklistHistory:upgraded.prepare('SELECT actor,completed FROM checklist_history WHERE workspace_id=?').all(workspaceId),quota:upgraded.prepare('SELECT period,scope,subject_hash,request_count FROM discovery_quota_counters ORDER BY scope,subject_hash').all()};
  assert.deepEqual(after,before);
  assert.equal(upgraded.prepare('SELECT count(*) n FROM schema_migrations').get().n,4);
  t.after(()=>x.close());
});

function worker(path,workspaceId,applicationId) {
  return new Promise((resolveWorker,reject)=>{
    const w=new Worker(new URL('./ops-race-worker.mjs',import.meta.url),{workerData:{path,workspaceId,applicationId}});
    let settled=false;
    w.on('message',(message)=>{if(message.ready){w.postMessage('go');return;}settled=true;resolveWorker(message);});
    w.on('error',reject);w.on('exit',(code)=>{if(!settled&&code!==0)reject(new Error(`worker exited ${code}`));});
  });
}

function actionWorker(path,workspaceId,action,role='host') {
  return new Promise((resolveWorker,reject)=>{
    const w=new Worker(new URL('./ops-action-race-worker.mjs',import.meta.url),{workerData:{path,workspaceId,action,role}});
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

test('approval and an overlapping host internal block cannot both commit',async t=>{
  const x=setup();t.after(()=>x.close());
  const app=createApp(x,[room(x)]);const range=app.payload.brief;
  const venueId=x.db.prepare('SELECT venue_id FROM resources WHERE workspace_id=? AND id=?').get(x.session.workspaceId,room(x)).venue_id;
  const actions=[
    {type:'approve',applicationId:app.id},
    {type:'add-internal-block',venueId,resourceId:room(x),date:range.date,startTime:'10:30',endTime:'11:30',reason:'Fictional concurrent maintenance block'},
  ];
  const results=await Promise.all(actions.map(action=>actionWorker(x.path,x.session.workspaceId,action)));
  assert.equal(results.filter(result=>result.ok).length,1,JSON.stringify(results));
  assert.equal(results.filter(result=>!result.ok).length,1,JSON.stringify(results));
  const reservation=x.db.prepare("SELECT count(*) n FROM allocations WHERE workspace_id=? AND application_id=? AND state='reservation'").get(x.session.workspaceId,app.id).n;
  const block=x.db.prepare('SELECT count(*) n FROM internal_blocks WHERE workspace_id=? AND resource_id=?').get(x.session.workspaceId,room(x)).n;
  assert.equal(reservation+block,1,'either the reservation or the overlapping block must win atomically');
});

test('separate rooms racing for one shared projector produce exactly one allocation',async t=>{
  const x=setup();t.after(()=>x.close());
  const date=nextWeekday();const projector=resource(x,'Projector');
  const first=createApp(x,[room(x),projector],{date,title:'Room one shared projector race'});
  const second=createApp(x,[resource(x,'Gathering Salon'),projector],{date,title:'Room two shared projector race'});
  const results=await Promise.all([worker(x.path,x.session.workspaceId,first.id),worker(x.path,x.session.workspaceId,second.id)]);
  assert.equal(results.filter(result=>result.ok).length,1,JSON.stringify(results));
  assert.equal(results.filter(result=>!result.ok&&result.error.includes('Conflict on Projector')).length,1,JSON.stringify(results));
  assert.equal(x.db.prepare("SELECT count(*) n FROM allocations WHERE workspace_id=? AND resource_id=? AND state='reservation'").get(x.session.workspaceId,projector).n,1);
});

test('approval racing cancellation leaves no active allocations after cancellation settles',async t=>{
  const x=setup();t.after(()=>x.close());
  const app=createApp(x,[room(x)]);
  const results=await Promise.all([
    actionWorker(x.path,x.session.workspaceId,{type:'approve',applicationId:app.id}),
    actionWorker(x.path,x.session.workspaceId,{type:'cancel-application',applicationId:app.id},'organizer'),
  ]);
  assert.equal(results.filter(result=>result.ok).length>=1,true,JSON.stringify(results));
  const final=getOverview(x.db,x.session.workspaceId,'organizer').applications.find(item=>item.id===app.id);
  if(final.status==='cancelled')assert.equal(x.db.prepare("SELECT count(*) n FROM allocations WHERE workspace_id=? AND application_id=? AND state IN ('hold','reservation')").get(x.session.workspaceId,app.id).n,0);
  else assert.equal(final.status,'approved','a failed cancellation may leave the valid committed approval');
});
