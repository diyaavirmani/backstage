import {DatabaseSync} from 'node:sqlite';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {mkdirSync, readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = process.env.BACKSTAGE_APP_ROOT ? resolve(process.env.BACKSTAGE_APP_ROOT) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrations = [
  {version:1,sql:readFileSync(resolve(root,'db/migrations/001_operations.sql'),'utf8')},
  {version:2,sql:readFileSync(resolve(root,'db/migrations/002_operational-policy-and-checklist-history.sql'),'utf8')},
  {version:3,sql:readFileSync(resolve(root,'db/migrations/003-checklist-deadlines.sql'),'utf8')},
  {version:4,sql:readFileSync(resolve(root,'db/migrations/004-discovery-quotas.sql'),'utf8')},
];
const catalog = JSON.parse(readFileSync(resolve(root, 'src/data/research-catalog.json'), 'utf8'));
const DEFAULT_DB = resolve(root, '.data/backstage.sqlite');
const nowIso = () => new Date().toISOString();
const uid = (prefix) => `${prefix}_${randomUUID()}`;
const hash = (token) => createHash('sha256').update(token).digest('hex');
const json = (value) => JSON.stringify(value);
const parse = (value) => JSON.parse(value);
const DEMOS = [
  {id:'demo-delhi-host',name:'Backstage Demo House · Delhi NCR',city:'Delhi NCR',locality:'Fictional Sector 44, Gurugram',rooms:[{id:'demo-delhi-room-studio',name:'Workshop Studio',capacity:40,layout:'classroom rows'},{id:'demo-delhi-room-salon',name:'Gathering Salon',capacity:24,layout:'circle seating'}],equipment:[{id:'demo-delhi-projector',name:'Projector',quantity:1},{id:'demo-delhi-mic',name:'Wireless microphone',quantity:2},{id:'demo-delhi-chairs',name:'Movable chairs',quantity:40}],policy:{eventTypes:['Workshop','Community meetup','Talk or panel','Other'],permittedActivities:['workshops','community gatherings','talks','panel discussions'],foodAllowed:true,alcoholAllowed:false,accessHours:'09:00–18:30 Asia/Kolkata',arrivalBufferMinutes:30,cleanupBufferMinutes:30,cleanupRequired:true,cancellationNoticeHours:24,accessModel:'sponsored',approval:'host-approval',notes:'Fictional demonstration policies and inventory. Organizer identity and event safety plan are reviewed by the host.'}},
  {id:'demo-bengaluru-host',name:'Backstage Demo Commons · Bengaluru',city:'Bengaluru',locality:'Fictional Indiranagar, Bengaluru',rooms:[{id:'demo-bengaluru-room-forum',name:'Forum Room',capacity:36,layout:'theatre seating'},{id:'demo-bengaluru-room-lab',name:'Maker Lab',capacity:18,layout:'workbench layout'}],equipment:[{id:'demo-bengaluru-projector',name:'Projector',quantity:1},{id:'demo-bengaluru-mic',name:'Wireless microphone',quantity:2},{id:'demo-bengaluru-whiteboard',name:'Whiteboard',quantity:2}],policy:{eventTypes:['Workshop','Community meetup','Talk or panel','Other'],permittedActivities:['workshops','community gatherings','talks','panel discussions','maker activities'],foodAllowed:true,alcoholAllowed:false,accessHours:'09:00–18:30 Asia/Kolkata',arrivalBufferMinutes:30,cleanupBufferMinutes:30,cleanupRequired:true,cancellationNoticeHours:24,accessModel:'pro-bono',approval:'host-approval',notes:'Fictional demonstration policies and inventory. Pro-bono is a demo access model and remains subject to host approval.'}},
];

export function openOperationsStore(path = process.env.BACKSTAGE_DB_PATH || DEFAULT_DB) {
  const dbPath = resolve(path);
  if (process.env.RAILWAY_ENVIRONMENT_ID) {
    const mountPath = process.env.RAILWAY_VOLUME_MOUNT_PATH ? resolve(process.env.RAILWAY_VOLUME_MOUNT_PATH) : '';
    if (!mountPath || dirname(dbPath) !== mountPath) throw new Error('PERSISTENT_STORAGE_UNAVAILABLE');
  }
  mkdirSync(dirname(dbPath), {recursive:true});
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  for(const migration of migrations){
    if(db.prepare('SELECT 1 FROM schema_migrations WHERE version=?').get(migration.version))continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      for(const statement of migration.sql.split(';').map((sql)=>sql.trim()).filter(Boolean)){
        const alter=statement.match(/^ALTER TABLE ([A-Za-z0-9_]+) ADD COLUMN ([A-Za-z0-9_]+)/i);
        if(alter&&db.prepare(`PRAGMA table_info(${alter[1]})`).all().some((column)=>column.name===alter[2]))continue;
        db.exec(statement);
      }
      db.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)').run(migration.version,nowIso());db.exec('COMMIT');
    }
    catch(error){db.exec('ROLLBACK');db.close();throw error;}
  }
  return db;
}

export function consumeDiscoveryQuota(db, sessionToken, limits, now = new Date()) {
  const period = now.toISOString().slice(0,10);
  const subject = hash(sessionToken || 'anonymous');
  const globalKey = 'all';
  const nowIsoValue = now.toISOString();
  const olderThan = new Date(now.getTime() - 31 * 86400000).toISOString().slice(0,10);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM discovery_quota_counters WHERE period < ?').run(olderThan);
    const global = db.prepare("SELECT request_count FROM discovery_quota_counters WHERE period=? AND scope='global' AND subject_hash=?").get(period,globalKey)?.request_count || 0;
    const personal = db.prepare("SELECT request_count FROM discovery_quota_counters WHERE period=? AND scope='session' AND subject_hash=?").get(period,subject)?.request_count || 0;
    if (global >= limits.global) {
      db.exec('COMMIT');
      return {allowed:false, reason:'global', globalRemaining:0, sessionRemaining:Math.max(0,limits.perSession-personal)};
    }
    if (personal >= limits.perSession) {
      db.exec('COMMIT');
      return {allowed:false, reason:'session', globalRemaining:Math.max(0,limits.global-global), sessionRemaining:0};
    }
    const insert = db.prepare(`INSERT INTO discovery_quota_counters(period,scope,subject_hash,request_count,updated_at)
      VALUES(?,?,?,?,?) ON CONFLICT(period,scope,subject_hash) DO UPDATE SET request_count=request_count+1,updated_at=excluded.updated_at`);
    insert.run(period,'global',globalKey,1,nowIsoValue);
    insert.run(period,'session',subject,1,nowIsoValue);
    db.exec('COMMIT');
    return {allowed:true, reason:null, globalRemaining:limits.global-global-1, sessionRemaining:limits.perSession-personal-1};
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function seedWorkspace(db, workspaceId) {
  const insertVenue = db.prepare('INSERT INTO venues(id,workspace_id,name,city,locality,kind,policy_json,access_model,fulfillment_model) VALUES(?,?,?,?,?,?,?,?,?)');
  const insertResource = db.prepare('INSERT INTO resources(id,workspace_id,venue_id,name,kind,quantity,capacity,capacity_layout) VALUES(?,?,?,?,?,?,?,?)');
  const insertAvailability = db.prepare('INSERT INTO availability_windows(id,workspace_id,venue_id,resource_id,starts_at,ends_at,released) VALUES(?,?,?,?,?,?,1)');
  const fromDate = new Date();
  fromDate.setUTCHours(0,0,0,0);
  for (const demo of DEMOS) {
    const venueId=`${workspaceId}:${demo.id}`;
    insertVenue.run(venueId,workspaceId,demo.name,demo.city,demo.locality,'demo',json(demo.policy),demo.policy.accessModel,demo.policy.approval);
    const resources = [...demo.rooms.map((r)=>({...r,kind:'room',quantity:1})),...demo.equipment.map((r)=>({...r,kind:'equipment'}))].map((r)=>({...r,id:`${workspaceId}:${r.id}`}));
    for (const resource of resources) insertResource.run(resource.id,workspaceId,venueId,resource.name,resource.kind,resource.quantity,resource.capacity ?? null,resource.layout ?? null);
    // Demonstration availability is explicit, fictional, and refreshed as dated daily windows.
    for (let day=0; day<100; day++) {
      const d = new Date(fromDate.getTime()+day*86400000);
      const weekday = d.getUTCDay();
      if (weekday === 0) continue;
      const date = d.toISOString().slice(0,10);
      for (const resource of resources) {
        insertAvailability.run(uid('avail'),workspaceId,venueId,resource.id,`${date}T03:30:00.000Z`,`${date}T13:00:00.000Z`);
      }
    }
  }
  const insertResearch=db.prepare('INSERT INTO venues(id,workspace_id,name,city,locality,kind,policy_json,access_model,fulfillment_model) VALUES(?,?,?,?,?,?,?,?,?)');
  for (const venue of catalog.venues) insertResearch.run(`${workspaceId}:${venue.id}`,workspaceId,venue.name,venue.city,venue.locality,'research',json({bookingAuthority:'unknown',sources:venue.sourceIds}),'unknown','unknown');
}

export function resolveWorkspace(db, presentedToken) {
  if (presentedToken) {
    const row = db.prepare('SELECT workspace_id,role FROM sessions WHERE token_hash=?').get(hash(presentedToken));
    if (row) return {token:presentedToken,workspaceId:row.workspace_id,role:row.role};
  }
  const token = randomBytes(32).toString('base64url');
  const workspaceId = uid('workspace');
  const at = nowIso();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO workspaces(id,created_at) VALUES(?,?)').run(workspaceId,at);
    db.prepare('INSERT INTO sessions(token_hash,workspace_id,role,created_at) VALUES(?,?,?,?)').run(hash(token),workspaceId,'organizer',at);
    seedWorkspace(db,workspaceId);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return {token,workspaceId,role:'organizer'};
}

const getVenue = (db, ws, id) => db.prepare('SELECT * FROM venues WHERE workspace_id=? AND id=?').get(ws,id);
const getResources = (db, ws, venueId) => db.prepare('SELECT * FROM resources WHERE workspace_id=? AND venue_id=? ORDER BY kind,name').all(ws,venueId);
function ensureRole(db, ws, role) {
  const exists = db.prepare('SELECT 1 as yes FROM sessions WHERE workspace_id=? LIMIT 1').get(ws);
  if (!exists) throw new Error('Workspace session is no longer available. Refresh to start a new demo workspace.');
  if (!['organizer','host'].includes(role)) throw new Error('Choose organizer or host simulation.');
}
function appRows(db, ws) {
  return db.prepare(`SELECT a.*,v.name venue_name,v.city,v.locality,v.kind FROM applications a JOIN venues v ON v.id=a.venue_id WHERE a.workspace_id=? ORDER BY a.created_at DESC`).all(ws).map((r)=>({...r,payload:parse(r.payload_json),brief:parse(r.brief_json),acceptedBrief:r.accepted_brief_json?parse(r.accepted_brief_json):null,proposed:r.proposed_json?parse(r.proposed_json):null,history:db.prepare('SELECT actor,from_status,to_status,note,created_at FROM transition_history WHERE workspace_id=? AND application_id=? ORDER BY created_at').all(ws,r.id),checklist:db.prepare('SELECT id,label,owner,due_at,completed_at FROM checklist_items WHERE workspace_id=? AND application_id=? ORDER BY created_at').all(ws,r.id).map((item)=>({...item,history:db.prepare('SELECT actor,completed,created_at FROM checklist_history WHERE workspace_id=? AND checklist_item_id=? ORDER BY created_at').all(ws,item.id)}))}));
}
export function getOverview(db, ws, role, month = null) {
  ensureRole(db,ws,role);
  if(db.prepare("SELECT 1 FROM allocations WHERE workspace_id=? AND state='hold' AND expires_at<=? LIMIT 1").get(ws,nowIso())){
    db.exec('BEGIN IMMEDIATE');try{releaseExpiredHolds(db,ws);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
  }
  const venues = db.prepare('SELECT * FROM venues WHERE workspace_id=? ORDER BY kind,city,name').all(ws).map((v)=>({id:v.id,name:v.name,city:v.city,locality:v.locality,kind:v.kind,accessModel:v.access_model,fulfillmentModel:v.fulfillment_model,policy:parse(v.policy_json),resources:getResources(db,ws,v.id)}));
  const applications = appRows(db,ws);
  const monthKey = month && /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0,7);
  const start = `${monthKey}-01T00:00:00.000Z`, end = new Date(Date.UTC(Number(monthKey.slice(0,4)),Number(monthKey.slice(5,7)),1)).toISOString();
  const calendar = {
    month:monthKey,
    availability:db.prepare('SELECT * FROM availability_windows WHERE workspace_id=? AND released=1 AND starts_at < ? AND ends_at > ?').all(ws,end,start),
    blocks:db.prepare('SELECT * FROM internal_blocks WHERE workspace_id=? AND starts_at < ? AND ends_at > ?').all(ws,end,start),
    allocations:db.prepare("SELECT * FROM allocations WHERE workspace_id=? AND state IN ('hold','reservation') AND starts_at < ? AND ends_at > ?").all(ws,end,start),
    pending:applications.filter((a)=>['submitted','needs-information','alternative-proposed','held'].includes(a.status)),
  };
  return {workspace:{id:ws,role},venues,applications,calendar,timezone:'Asia/Kolkata',fictional:true};
}
function releaseExpiredHolds(db,ws) {
  const now=nowIso();
  const expired=db.prepare("SELECT DISTINCT application_id FROM allocations WHERE workspace_id=? AND state='hold' AND expires_at<=?").all(ws,now);
  if(!expired.length)return;
  db.prepare("UPDATE allocations SET state='released' WHERE workspace_id=? AND state='hold' AND expires_at<=?").run(ws,now);
  for(const row of expired){const app=db.prepare('SELECT * FROM applications WHERE workspace_id=? AND id=?').get(ws,row.application_id);if(app?.status==='held')transition(db,ws,app,'submitted','Temporary resource hold expired and was released.','system');}
}

function localInstant(date,time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Choose a valid event date and time.');
  const result = new Date(`${date}T${time}:00+05:30`);
  if (Number.isNaN(result.getTime())) throw new Error('Choose a valid event date and time.');
  if(new Date(result.getTime()+330*60000).toISOString().slice(0,16)!==`${date}T${time}`)throw new Error('Choose a real calendar date and time.');
  return result.toISOString();
}
function validateBrief(brief) {
  if (!brief || typeof brief !== 'object' || !brief.title?.trim() || !brief.city || !brief.eventType?.trim() || !brief.date || !brief.startTime || !brief.endTime || !brief.audience?.trim()) throw new Error('Complete the event title, city, gathering type, date, times, and audience before preparing an application.');
  if(brief.title.length>100||brief.audience.length>200||!['Delhi NCR','Bengaluru'].includes(brief.city)||String(brief.eventType||'').length>80)throw new Error('Event details exceed the supported limits or use an unsupported city.');
  if (!Number.isInteger(Number(brief.headcount)) || Number(brief.headcount)<1) throw new Error('Enter a guest count greater than zero.');
  if(!Number.isFinite(Number(brief.budgetAmount))||Number(brief.budgetAmount)<0||!Number.isInteger(Number(brief.setupMinutes))||Number(brief.setupMinutes)<0||Number(brief.setupMinutes)>1440||!Number.isInteger(Number(brief.cleanupMinutes))||Number(brief.cleanupMinutes)<0||Number(brief.cleanupMinutes)>1440)throw new Error('Check the non-negative budget and setup/cleanup time limits.');
  for(const field of ['roomRequirements','equipmentRequirements','essentialRequirements','flexibleRequirements'])if(!Array.isArray(brief[field])||brief[field].length>30||brief[field].some((item)=>typeof item!=='string'||item.length>160))throw new Error('Requirements must be short lists of up to 30 items.');
  const startsAt=localInstant(brief.date,brief.startTime), endsAt=localInstant(brief.date,brief.endTime);
  if (endsAt<=startsAt) throw new Error('Event end time must come after its start time.');
}
function createDraft(db, ws, payload, trustedResearchEvidence = null) {
  const venue=getVenue(db,ws,payload.venueId);
  if (!venue) throw new Error('That venue is not available in this workspace.');
  const brief=payload.brief;
  validateBrief(brief);
  if (brief.city!==venue.city) throw new Error('Choose a venue in the event city.');
  if (venue.kind==='research' && payload.submit) throw new Error('This research lead has no verified Backstage booking authority. You can save an application draft, but it cannot be submitted.');
  const organizer={name:String(payload.organizer?.name||'').trim(),email:String(payload.organizer?.email||'').trim(),phone:String(payload.organizer?.phone||'').trim(),organization:String(payload.organizer?.organization||'').trim()};
  if (payload.submit && payload.reviewed!==true) throw new Error('Organizer review is required before a request can be submitted.');
  if (payload.submit && (!organizer.name || !organizer.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizer.email))) throw new Error('Add a valid organizer name and email before submitting.');
  if([organizer.name,organizer.email,organizer.phone,organizer.organization].some((value)=>value.length>180))throw new Error('Organizer contact details exceed supported limits.');
  const idempotencyKey=String(payload.idempotencyKey||'').slice(0,100);
  if (!idempotencyKey) throw new Error('A request key is required to prevent duplicate applications.');
  const existing=payload.applicationId?db.prepare('SELECT * FROM applications WHERE workspace_id=? AND id=?').get(ws,String(payload.applicationId)):null;
  if (payload.applicationId&&!existing)throw new Error('Application draft not found in this demo workspace.');
  if(existing&&existing.venue_id!==venue.id)throw new Error('An application draft cannot be moved to another venue.');
  if(existing&&existing.status==='submitted'&&payload.submit&&existing.idempotency_key===idempotencyKey)return existing.id;
  if(existing&&existing.status!=='draft')throw new Error('Only an application draft can be edited or submitted.');
  const old=db.prepare('SELECT id FROM applications WHERE workspace_id=? AND idempotency_key=?').get(ws,idempotencyKey);
  if (old&&old.id!==existing?.id) return old.id;
  const resources=Array.isArray(payload.resources)?payload.resources.map((r)=>({id:String(r.id),quantity:Number(r.quantity)||1})):[];
  if(new Set(resources.map((resource)=>resource.id)).size!==resources.length)throw new Error('Each room or shared equipment resource must appear only once in an application.');
  const flexibleSlot=payload.flexibleSlot||null;
  if(flexibleSlot) {
    if(flexibleSlot.dateStart>flexibleSlot.dateEnd)throw new Error('The flexible date range must end after it begins.');
    if(localInstant(flexibleSlot.dateStart,flexibleSlot.startTime)>=localInstant(flexibleSlot.dateEnd,flexibleSlot.endTime))throw new Error('The organizer-approved flexible time range is invalid.');
  }
  if (venue.kind==='demo') {
    if (!resources.length || !resources.some((r)=>getResources(db,ws,venue.id).some((available)=>available.id===r.id&&available.kind==='room'))) throw new Error('Choose at least one demonstration room.');
    for (const r of resources) {
      const resource=getResources(db,ws,venue.id).find((available)=>available.id===r.id);
      if (!resource) throw new Error('A selected resource does not belong to this venue.');
      if (!Number.isInteger(r.quantity)||r.quantity<1||r.quantity>resource.quantity) throw new Error(`${resource.name} requests must stay within the known demonstration inventory quantity (${resource.quantity}).`);
    }
  }
  const catalogVenueId=venue.kind==='research'?venue.id.slice(venue.id.indexOf(':')+1):'';
  const sources=venue.kind==='research'?catalog.venues.find((v)=>v.id===catalogVenueId)?.sourceIds.map((sourceId)=>catalog.sources.find((source)=>source.id===sourceId)).filter(Boolean).map(({id,title,url})=>({id,title,url})):[];
  const researchRecord=venue.kind==='research'?catalog.venues.find((v)=>v.id===catalogVenueId):null;
  const evidence=researchRecord?researchRecord.claims.map((claim)=>({claim:claim.claim,value:claim.value,evidenceType:claim.evidenceType,qualification:claim.qualification||null,checkedAt:claim.checkedAt,sourceReferences:claim.sourceIds.map((id)=>catalog.sources.find((source)=>source.id===id)).filter(Boolean).map(({id,title,url})=>({id,title,url}))})):[];
  const unanswered=Array.isArray(payload.questions)?payload.questions.map(String).slice(0,20):[];
  if (venue.kind==='research') unanswered.push('Current availability and permitted dates','Current price and any sponsored or pro-bono eligibility','Whether the host permits Backstage to submit or confirm a booking');
  const authoritative=venue.kind==='research'&&trustedResearchEvidence?.venueId===catalogVenueId?trustedResearchEvidence:null;
  const appPayload={organizer,resources,questions:[...new Set(unanswered)],flexibleSlot,reviewed:payload.reviewed===true,sources:authoritative?.sources||sources,evidence:authoritative?.evidence||evidence,summary:authoritative?.summary||researchRecord?.summary||null,venueKind:venue.kind,researchEvidenceCapturedAt:authoritative?.capturedAt||null,researchVenueId:authoritative?.venueId||null,discoveryBriefSnapshot:payload.discoveryBriefSnapshot||null,discoveryCreatedAt:payload.discoveryCreatedAt||null};
  const id=existing?.id||uid('application'),created=nowIso(), status=payload.submit?'submitted':'draft';
  if(existing){db.prepare('UPDATE applications SET payload_json=?,brief_json=?,updated_at=? WHERE workspace_id=? AND id=?').run(json(appPayload),json(brief),created,ws,id);transition(db,ws,existing,status,payload.submit?'Organizer reviewed and submitted this demonstration request.':'Organizer updated the application draft.','organizer');}
  else {db.prepare('INSERT INTO applications(id,workspace_id,venue_id,status,idempotency_key,payload_json,brief_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,ws,venue.id,status,idempotencyKey,json(appPayload),json(brief),created,created);db.prepare('INSERT INTO transition_history(id,workspace_id,application_id,actor,from_status,to_status,note,created_at) VALUES(?,?,?,?,?,?,?,?)').run(uid('transition'),ws,id,'organizer',null,status,payload.submit?'Organizer reviewed and submitted this demonstration request.':'Application draft saved.',created);}
  return id;
}
function transition(db,ws,app,to,note,actor) {
  const at=nowIso();
  db.prepare('INSERT INTO transition_history(id,workspace_id,application_id,actor,from_status,to_status,note,created_at) VALUES(?,?,?,?,?,?,?,?)').run(uid('transition'),ws,app.id,actor,app.status,to,note||null,at);
  db.prepare('UPDATE applications SET status=?,updated_at=? WHERE workspace_id=? AND id=?').run(to,at,ws,app.id);
}
function occupiedRange(db,ws,app,brief) {
  const startsAt=localInstant(brief.date,brief.startTime),endsAt=localInstant(brief.date,brief.endTime);
  const chosen=parse(app.payload_json).resources;
  let setup=Number(brief.setupMinutes)||0, cleanup=Number(brief.cleanupMinutes)||0;
  const venue=getVenue(db,ws,app.venue_id),policy=venue?parse(venue.policy_json):{};
  setup=Math.max(setup,Number(policy.arrivalBufferMinutes)||0);
  cleanup=Math.max(cleanup,Number(policy.cleanupBufferMinutes)||0);
  for (const selected of chosen) {
    const resource=db.prepare('SELECT setup_minutes,cleanup_minutes FROM resources WHERE workspace_id=? AND id=?').get(ws,selected.id);
    if (resource) {setup=Math.max(setup,resource.setup_minutes);cleanup=Math.max(cleanup,resource.cleanup_minutes);}
  }
  return {startsAt:new Date(new Date(startsAt).getTime()-setup*60000).toISOString(),endsAt:new Date(new Date(endsAt).getTime()+cleanup*60000).toISOString(),eventStartsAt:startsAt,eventEndsAt:endsAt,selected:chosen};
}
function assertFeasible(db,ws,app,brief) {
  const venue=getVenue(db,ws,app.venue_id);
  if (!venue||venue.kind!=='demo') throw new Error('Only fictional demonstration hosts accept operational requests in this milestone.');
  const rules=parse(venue.policy_json);
  const allResources=getResources(db,ws,venue.id);
  if (!rules.eventTypes.includes(brief.eventType)) throw new Error(`This demo host has not listed “${brief.eventType}” as an accepted gathering type.`);
  const range=occupiedRange(db,ws,app,brief);
  const selectedResources=range.selected.map((item)=>({item,resource:allResources.find((resource)=>resource.id===item.id)})).filter((entry)=>entry.resource);
  const countWords={one:1,two:2,three:3,four:4};
  const aliases={mic:'microphone',microphone:'microphone',chair:'chair',chairs:'chair',seating:'chair',board:'whiteboard',whiteboard:'whiteboard',projector:'projector',screen:'screen'};
  const generic=new Set(['a','an','the','with','and','or','for','of','to','in','on','room','rooms','space','spaces','area','areas','venue','separate','different','capacity','guest','guests','people','person','unit','units']);
  const words=(value)=>String(value).toLowerCase().match(/[a-z0-9]+/g)||[];
  const requestedCount=(value)=>{const text=String(value).toLowerCase();return Number(text.match(/\b(\d+)\b/)?.[1]||Object.entries(countWords).find(([word])=>new RegExp(`\\b${word}\\b`).test(text))?.[1]||1);};
  const requirementTerms=(value)=>words(value).filter((word)=>!generic.has(word)&&!/^\d+$/.test(word)).map((word)=>aliases[word]||word);
  const resourceTerms=(resource)=>new Set([...words(resource.name),...words(resource.capacity_layout||'')].map((word)=>aliases[word]||word));
  const selectedRooms=selectedResources.filter(({resource})=>resource.kind==='room');
  for (const requested of brief.roomRequirements||[]) {
    const terms=requirementTerms(requested);
    const candidates=selectedRooms.filter(({resource})=>terms.every((term)=>resourceTerms(resource).has(term)));
    const count=requestedCount(requested);
    if(candidates.length<count)throw new Error(`The requested room condition “${requested}” is not covered by the selected rooms and layouts (${candidates.length} of ${count} requested).`);
  }
  const equipmentResources=selectedResources.filter(({resource})=>resource.kind==='equipment');
  for (const requested of brief.equipmentRequirements||[]) {
    const terms=requirementTerms(requested);
    const match=equipmentResources.find(({resource})=>terms.length>0&&terms.every((term)=>resourceTerms(resource).has(term)));
    const count=requestedCount(requested);
    if (!match||match.item.quantity<count) throw new Error(`The requested equipment “${requested}” is not covered by selected resources at the requested quantity. Unsupported details must be confirmed.`);
  }
  if (!range.selected.some((s)=>db.prepare("SELECT 1 as ok FROM resources WHERE workspace_id=? AND id=? AND kind='room' AND capacity_layout IS NOT NULL AND capacity>=?").get(ws,s.id,Number(brief.headcount)))) throw new Error('No selected room/layout has documented demonstration capacity for this guest count.');
  const essentials=[...(brief.essentialRequirements||[])].map((x)=>String(x).trim()).filter(Boolean);
  const policyText=(value)=>words(value).map((word)=>word.endsWith('s')?word.slice(0,-1):word).join(' ');
  for(const essential of essentials){
    const normalized=essential.toLowerCase();
    const dietary=/\b(vegan|vegetarian|halal|kosher|gluten|dairy|nut|allerg|dietary|jain)\w*\b/i.test(normalized);
    if(dietary&&/food|cater|meal|refreshment/i.test(normalized))throw new Error(`The essential condition “${essential}” needs a dietary or allergy guarantee that is not established by a general food-permission policy.`);
    const food=/\b(food|cater\w*|refreshment\w*|meal\w*)\b/i.test(normalized);
    const alcohol=/\balcohol\b/i.test(normalized);
    const negated=/\b(no|not|without|prohibit\w*|ban\w*)\b/i.test(normalized);
    if(food){
      const asksPermission=/\b(allow\w*|permit\w*)\b/i.test(normalized);
      if(asksPermission&&rules.foodAllowed===true)continue;
      if(negated&&rules.foodAllowed===false)continue;
      if(asksPermission&&rules.foodAllowed===false)throw new Error(`The demo host policy explicitly does not permit the essential food condition “${essential}”.`);
      throw new Error(`The essential condition “${essential}” is not established by food permission alone; request confirmation about the required food arrangement.`);
    }
    if(alcohol){
      const asksPermission=/\b(allow\w*|permit\w*)\b/i.test(normalized);
      if(asksPermission&&rules.alcoholAllowed===true)continue;
      if(negated&&rules.alcoholAllowed===false)continue;
      if(!negated&&rules.alcoholAllowed===false)throw new Error(`The demo host policy explicitly prohibits the essential alcohol condition “${essential}”.`);
      throw new Error(`The essential condition “${essential}” is not established by the host's alcohol policy.`);
    }
    const requestedTerms=requirementTerms(essential);
    const equipmentMatch=equipmentResources.some(({item,resource})=>requestedTerms.length>0&&requestedTerms.every((term)=>resourceTerms(resource).has(term))&&item.quantity>=requestedCount(essential));
    if(equipmentMatch)continue;
    const roomMatch=selectedRooms.some(({resource})=>requestedTerms.length>0&&requestedTerms.every((term)=>resourceTerms(resource).has(term))&&Number(resource.capacity)>=Number(brief.headcount));
    if(roomMatch)continue;
    const knownPolicy=[...rules.eventTypes,...rules.permittedActivities].some((condition)=>policyText(condition)===policyText(essential));
    if(knownPolicy)continue;
    throw new Error(`The essential condition “${essential}” is not established by the selected resources or an exact host policy; request information before approval.`);
  }
  for (const selected of range.selected) {
    const resource=db.prepare('SELECT * FROM resources WHERE workspace_id=? AND id=?').get(ws,selected.id);
    const available=db.prepare("SELECT 1 as ok FROM availability_windows WHERE workspace_id=? AND resource_id=? AND released=1 AND starts_at<=? AND ends_at>=? LIMIT 1").get(ws,resource.id,range.startsAt,range.endsAt);
    if (!available) throw new Error(`${resource.name} is outside the host’s released availability for the setup-to-cleanup interval.`);
    const blocked=db.prepare('SELECT 1 as yes FROM internal_blocks WHERE workspace_id=? AND resource_id=? AND starts_at<? AND ends_at>? LIMIT 1').get(ws,resource.id,range.endsAt,range.startsAt);
    if (blocked) throw new Error(`Conflict on ${resource.name}: the host has an internal block during this setup-to-cleanup interval.`);
    const busy=db.prepare("SELECT a.id, a.application_id, a.state, a.expires_at, a.starts_at, a.ends_at, a.quantity FROM allocations a WHERE a.workspace_id=? AND a.resource_id=? AND a.application_id<>? AND a.state IN ('hold','reservation') AND a.starts_at<? AND a.ends_at>? AND (a.state='reservation' OR a.expires_at>?)").all(ws,resource.id,app.id,range.endsAt,range.startsAt,nowIso());
    const units=busy.reduce((sum,row)=>sum+row.quantity,0)+selected.quantity;
    if (units>resource.quantity) throw new Error(`Conflict on ${resource.name}: that shared resource is already allocated during this setup-to-cleanup interval.`);
  }
  return range;
}
function allocate(db,ws,app,brief,range,state) {
  for (const selected of range.selected) db.prepare('INSERT INTO allocations(id,workspace_id,application_id,resource_id,starts_at,ends_at,state,expires_at,quantity) VALUES(?,?,?,?,?,?,?,?,?)').run(uid(state),ws,app.id,selected.id,range.startsAt,range.endsAt,state,state==='hold'?new Date(Date.now()+15*60000).toISOString():null,selected.quantity);
}
function checklist(db,ws,app,brief) {
  const venue=getVenue(db,ws,app.venue_id),policy=parse(venue.policy_json),startsAt=localInstant(brief.date,brief.startTime),endsAt=localInstant(brief.date,brief.endTime);
  const chosen=parse(app.payload_json).resources.map((r)=>db.prepare('SELECT name,kind FROM resources WHERE workspace_id=? AND id=?').get(ws,r.id)).filter(Boolean);
  let cleanupMinutes=Math.max(Number(brief.cleanupMinutes)||0,Number(policy.cleanupBufferMinutes)||0);
  for(const selected of parse(app.payload_json).resources){const resource=db.prepare('SELECT cleanup_minutes FROM resources WHERE workspace_id=? AND id=?').get(ws,selected.id);if(resource)cleanupMinutes=Math.max(cleanupMinutes,resource.cleanup_minutes);}
  const before=(instant,minutes)=>new Date(new Date(instant).getTime()-minutes*60000).toISOString();
  const after=(instant,minutes)=>new Date(new Date(instant).getTime()+minutes*60000).toISOString();
  const tasks=[
    {label:'Confirm room layout and prepare the selected room',owner:'host',due:before(startsAt,Number(policy.arrivalBufferMinutes)||0)},
    {label:'Share arrival, access, and host contact details',owner:'organizer',due:before(startsAt,Number(policy.arrivalBufferMinutes)||0)},
    {label:'Complete room setup before guest arrival',owner:'host',due:startsAt},
    {label:'Restore the room and complete cleanup',owner:'organizer',due:after(endsAt,cleanupMinutes)},
  ];
  if (policy.foodAllowed) tasks.push({label:'Confirm permitted food arrangements with the host',owner:'organizer',due:before(startsAt,Number(policy.arrivalBufferMinutes)||0)});
  if (chosen.some((r)=>r.kind==='equipment')) {tasks.push({label:'Test allocated AV and shared equipment before doors open',owner:'host',due:before(startsAt,15)},{label:'Return shared equipment after the event',owner:'organizer',due:after(endsAt,cleanupMinutes)});}
  for (const task of tasks) db.prepare('INSERT OR IGNORE INTO checklist_items(id,workspace_id,application_id,label,owner,due_at,created_at) VALUES(?,?,?,?,?,?,?)').run(uid('task'),ws,app.id,task.label,task.owner,task.due,nowIso());
}

export function mutate(db,ws,role,action,trustedResearchEvidence = null) {
  ensureRole(db,ws,role);
  if (action.type==='switch-role') {
    if (!['organizer','host'].includes(action.role)) throw new Error('Role simulation must be organizer or host.');
    db.prepare('UPDATE sessions SET role=? WHERE workspace_id=?').run(action.role,ws); return {role:action.role};
  }
  db.exec('BEGIN IMMEDIATE');
  try {
    let result;
    if(role==='host')releaseExpiredHolds(db,ws);
    if (action.type==='save-application'||action.type==='submit-application') {
      if (role!=='organizer') throw new Error('Switch to the organizer simulation to prepare an application.');
      const id=createDraft(db,ws,{...action.payload,submit:action.type==='submit-application'},trustedResearchEvidence); result={applicationId:id};
    } else if(role==='host'&&action.type==='withdraw-availability') {
      const row=db.prepare('SELECT * FROM availability_windows WHERE workspace_id=? AND id=?').get(ws,String(action.availabilityId||''));if(!row)throw new Error('Availability window not found.');
      const conflict=db.prepare("SELECT 1 as yes FROM allocations WHERE workspace_id=? AND resource_id=? AND starts_at<? AND ends_at>? AND (state='reservation' OR (state='hold' AND expires_at>?)) LIMIT 1").get(ws,row.resource_id,row.ends_at,row.starts_at,nowIso());if(conflict)throw new Error('Availability cannot be withdrawn while an active allocation overlaps it.');
      db.prepare('UPDATE availability_windows SET released=0 WHERE workspace_id=? AND id=?').run(ws,row.id);
    } else if(role==='host'&&action.type==='add-internal-block') {
      const resource=db.prepare('SELECT * FROM resources WHERE workspace_id=? AND id=? AND venue_id=?').get(ws,String(action.resourceId||''),String(action.venueId||''));if(!resource)throw new Error('Choose a resource belonging to this demo host.');
      const startsAt=localInstant(String(action.date),String(action.startTime)),endsAt=localInstant(String(action.date),String(action.endTime));if(endsAt<=startsAt)throw new Error('Block end must follow its start.');
      const overlap=db.prepare("SELECT 1 as yes FROM allocations WHERE workspace_id=? AND resource_id=? AND starts_at<? AND ends_at>? AND (state='reservation' OR (state='hold' AND expires_at>?)) LIMIT 1").get(ws,resource.id,endsAt,startsAt,nowIso());if(overlap)throw new Error(`Cannot block ${resource.name}; it has an active allocation.`);
      db.prepare('INSERT INTO internal_blocks(id,workspace_id,venue_id,resource_id,starts_at,ends_at,reason) VALUES(?,?,?,?,?,?,?)').run(uid('block'),ws,action.venueId,resource.id,startsAt,endsAt,String(action.reason||'Host internal block').slice(0,300));
    } else {
      const app=db.prepare('SELECT * FROM applications WHERE workspace_id=? AND id=?').get(ws,String(action.applicationId||''));
      if (!app) throw new Error('Application not found in this demo workspace.');
      if(action.type==='toggle-checklist') {
        if(app.status!=='approved')throw new Error('Checklist items can only be updated for an approved event.');
        const item=db.prepare('SELECT * FROM checklist_items WHERE workspace_id=? AND application_id=? AND id=?').get(ws,app.id,String(action.itemId||''));if(!item)throw new Error('Checklist item not found.');
        if(item.owner!==role)throw new Error(`This checklist task belongs to the ${item.owner}; switch simulation roles to update it.`);
        const completed=item.completed_at?null:nowIso();db.prepare('UPDATE checklist_items SET completed_at=? WHERE workspace_id=? AND application_id=? AND id=?').run(completed,ws,app.id,item.id);db.prepare('INSERT INTO checklist_history(id,workspace_id,checklist_item_id,actor,completed,created_at) VALUES(?,?,?,?,?,?)').run(uid('checkhist'),ws,item.id,role,completed?1:0,nowIso());result={completed:Boolean(completed)};
      } else if (role==='organizer') {
        if (action.type==='respond-information') {
          if (app.status!=='needs-information') throw new Error('This application is not waiting for organizer information.');
          const payload=parse(app.payload_json);payload.organizerReply=String(action.reply||'').slice(0,2000);db.prepare('UPDATE applications SET payload_json=? WHERE workspace_id=? AND id=?').run(json(payload),ws,app.id);transition(db,ws,app,'submitted','Organizer sent the requested information.','organizer');
        } else if (action.type==='accept-alternative') {
          if (app.status!=='alternative-proposed') throw new Error('There is no proposed alternative to accept.');
          const payload=parse(app.payload_json);if (!payload.flexibleSlot) throw new Error('No organizer-approved date flexibility was saved with this application.');
          const proposed=parse(app.proposed_json);const from=payload.flexibleSlot.dateStart,to=payload.flexibleSlot.dateEnd;
          if (proposed.date<from||proposed.date>to) throw new Error('The proposed date falls outside the organizer-approved flexibility.');
          const brief=parse(app.brief_json);brief.date=proposed.date;brief.startTime=proposed.startTime;brief.endTime=proposed.endTime;
          db.prepare('UPDATE applications SET brief_json=?,proposed_json=NULL WHERE workspace_id=? AND id=?').run(json(brief),ws,app.id);transition(db,ws,app,'submitted','Organizer explicitly accepted the proposed date and time. Host approval is still required.','organizer');
        } else if (action.type==='cancel-application') {
          if (!['submitted','needs-information','alternative-proposed','held','approved'].includes(app.status)) throw new Error('This application cannot be cancelled from its current status.');
          db.prepare("UPDATE allocations SET state='released' WHERE workspace_id=? AND application_id=?").run(ws,app.id);transition(db,ws,app,'cancelled','Organizer cancelled the request and released allocations.','organizer');
        } else throw new Error('Unsupported organizer action.');
      } else {
        if (app.venue_id!==action.venueId && action.venueId) throw new Error('This application belongs to another demonstration host.');
        if (action.type==='request-information') {
          if (!['submitted','held'].includes(app.status)) throw new Error('Information can only be requested from an incoming application.');
          transition(db,ws,app,'needs-information',String(action.note||'Please share the requested details.').slice(0,1000),'host');
        } else if (action.type==='reject') {
          if (!['submitted','needs-information','alternative-proposed','held'].includes(app.status)) throw new Error('This application cannot be rejected in its current status.');
          db.prepare("UPDATE allocations SET state='released' WHERE workspace_id=? AND application_id=?").run(ws,app.id);transition(db,ws,app,'rejected',String(action.note||'The host declined this request.').slice(0,1000),'host');
        } else if (action.type==='propose-alternative') {
          if (!['submitted','needs-information'].includes(app.status)) throw new Error('An alternative can only be proposed for an incoming request.');
          const payload=parse(app.payload_json);const flex=payload.flexibleSlot;if(!flex)throw new Error('The organizer did not approve a flexible date range.');
          const proposed={date:String(action.date),startTime:String(action.startTime),endTime:String(action.endTime)};
          if(proposed.date<flex.dateStart||proposed.date>flex.dateEnd||proposed.startTime<flex.startTime||proposed.endTime>flex.endTime)throw new Error('Proposed slot is outside the organizer-approved flexibility.');
          const alternativeBrief=parse(app.brief_json);Object.assign(alternativeBrief,proposed);validateBrief(alternativeBrief);assertFeasible(db,ws,app,alternativeBrief);db.prepare('UPDATE applications SET proposed_json=? WHERE workspace_id=? AND id=?').run(json(proposed),ws,app.id);transition(db,ws,app,'alternative-proposed','Host proposed an available slot inside the organizer-approved flexibility. It is not reserved until accepted and approved.','host');
        } else if (action.type==='hold'||action.type==='approve') {
          if(app.status==='approved'&&action.type==='approve'){result={alreadyApproved:true};}
          else {
            if(!['submitted','held'].includes(app.status))throw new Error('Only an incoming or held application can be approved.');
            db.prepare("UPDATE allocations SET state='released' WHERE workspace_id=? AND application_id=? AND state='hold' AND expires_at<=?").run(ws,app.id,nowIso());
            const brief=parse(app.brief_json),range=assertFeasible(db,ws,app,brief);
            if(action.type==='hold') {db.prepare("UPDATE allocations SET state='released' WHERE workspace_id=? AND application_id=? AND state='hold'").run(ws,app.id);allocate(db,ws,app,brief,range,'hold');transition(db,ws,app,'held','Temporary 15-minute resource hold.','host');}
            else {db.prepare("UPDATE allocations SET state='released' WHERE workspace_id=? AND application_id=? AND state='hold'").run(ws,app.id);allocate(db,ws,app,brief,range,'reservation');db.prepare('UPDATE applications SET accepted_brief_json=? WHERE workspace_id=? AND id=?').run(json(brief),ws,app.id);checklist(db,ws,app,brief);transition(db,ws,app,'approved','Feasible resources allocated atomically; preparation checklist generated.','host');}
          }
        } else throw new Error('Unsupported host action.');
      }
    }
    db.exec('COMMIT');return result||{ok:true};
  } catch(error) {db.exec('ROLLBACK');throw error;}
}

export function researchVenues(workspaceId) {
  return catalog.venues.map((venue)=>({id:`${workspaceId}:${venue.id}`,catalogId:venue.id,name:venue.name,city:venue.city,locality:venue.locality,summary:venue.summary,kind:'research',sources:venue.sourceIds.map((id)=>catalog.sources.find((source)=>source.id===id)).filter(Boolean).map(({id,title,url})=>({id,title,url}))}));
}
