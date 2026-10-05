import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createVenueDiscoveryHandler} from '../src/lib/venue-discovery-handler.ts';

// Proves leads come from Knowledge Base reads: published Sanity records only describe venues; a venue reaches the
// organizer only if an entry read in this request contains a correctly cited section for it. No list is hardcoded.
const unknowns=(source)=>['capacity','availability','price','booking-authority'].map((subject)=>({_key:subject,subject,claim:subject,value:`Unknown ${subject}.`,evidenceType:'unknown',sources:[source]}));
const muSource={_id:'source-mu',title:'Masters Union Companies',url:'https://mastersunion.org/for-companies'};
const ofisSource={_id:'source-ofis',title:'Ofis events',url:'https://ofissquare.com/events-spaces/'};
const masters={_id:'venue-masters-union-gurugram',name:'Masters’ Union Campus',city:'Delhi NCR',locality:'DLF Cyber Park, Udyog Vihar Phase III, Gurugram',relationshipStatus:'research-lead',sources:[muSource],claims:[{_key:'hosting',subject:'hosting-conditions',claim:'Hosts offsites, conferences and meetings',value:'Publicly described.',evidenceType:'public-documentation',sources:[muSource]},...unknowns(muSource)],spaces:[]};
const ofis={_id:'venue-ofis-gurugram-sohna-road',name:'Ofis Square — Sohna Road',city:'Delhi NCR',locality:'Sohna Road, Gurugram',relationshipStatus:'research-lead',sources:[ofisSource],claims:unknowns(ofisSource),spaces:[]};
const section=(heading,locality,source,marker=1)=>`## ${heading}\nLocated at ${locality}. Capacity is unknown. Availability is unknown. Price is unknown. Backstage booking authority is unknown. [${marker}]`;
const mastersEntry=`# Delhi NCR venues\n\n${section('Masters’ Union Campus — DLF Cyber Park, Udyog Vihar Phase III, Gurugram',masters.locality,muSource)}\n\n## Sources\n1. Masters Union Companies — ${muSource.url}`;
const brief={id:'kb-grounding',title:'Community workshop',city:'Delhi NCR',eventType:'Workshop',date:'2028-11-14',startTime:'10:00',endTime:'12:00',audience:'Developers',headcount:20,budgetAmount:0,currency:'INR',roomRequirements:[],equipmentRequirements:[],essentialRequirements:[],flexibleRequirements:[],setupMinutes:0,cleanupMinutes:0,savedAt:'2028-01-01T00:00:00.000Z'};

function scenario({outline,entries,proposals,read=true}){
  const reads=[];
  const handler=createVenueDiscoveryHandler({
    getModel:()=>({model:'mock'}),
    createSanityClient:()=>({fetch:async()=>[masters,ofis]}),
    createMCPClient:async()=>({
      listTools:async()=>({tools:[{name:'initial_context'},{name:'knowledge_base_read'}]}),
      callTool:async({name,arguments:args})=>{
        if(name==='initial_context')return{content:[{type:'text',text:`Knowledge base id: kbTest\n${outline.length} entries.\n${outline.join('\n')}`}]};
        reads.push(...args.paths);return{content:[{type:'text',text:entries[args.paths[0]]||''}]};
      },
      close:async()=>{},
    }),
    generateText:async(args)=>{
      if(read)await args.tools.readVenueKnowledge.execute({entryId:'entry-1'});
      return{output:{recommendations:proposals},steps:read?[{toolCalls:[{toolName:'readVenueKnowledge'}]}]:[]};
    },
  });
  return{handler,reads};
}

async function discover(handler){
  const dir=mkdtempSync(join(tmpdir(),'backstage-kb-grounding-'));
  const keys=['BACKSTAGE_DB_PATH','APP_ORIGIN','NEXT_PUBLIC_SANITY_PROJECT_ID','NEXT_PUBLIC_SANITY_DATASET','SANITY_PROJECT_READ_TOKEN','SANITY_CONTEXT_MCP_URL','SANITY_ORGANIZATION_TOKEN','DEMO_DISCOVERY_DAILY_PER_SESSION','DEMO_DISCOVERY_DAILY_GLOBAL'];
  const previous=Object.fromEntries(keys.map((key)=>[key,process.env[key]]));
  Object.assign(process.env,{BACKSTAGE_DB_PATH:join(dir,'isolated.sqlite'),APP_ORIGIN:'http://127.0.0.1:3107',NEXT_PUBLIC_SANITY_PROJECT_ID:'test',NEXT_PUBLIC_SANITY_DATASET:'test',SANITY_PROJECT_READ_TOKEN:'test',SANITY_CONTEXT_MCP_URL:'https://context.invalid/test',SANITY_ORGANIZATION_TOKEN:'test',DEMO_DISCOVERY_DAILY_PER_SESSION:'100',DEMO_DISCOVERY_DAILY_GLOBAL:'100'});
  try{
    const response=await handler(new Request('http://127.0.0.1:3107/api/venue-discovery',{method:'POST',headers:{Origin:'http://127.0.0.1:3107','Content-Type':'application/json'},body:JSON.stringify({brief,conversation:[{role:'user',content:'Find leads.'}]})}));
    return{status:response.status,body:await response.json()};
  }finally{for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}rmSync(dir,{recursive:true,force:true});}
}

test('a venue that exists in Sanity but not in the read Knowledge Base entry is never returned',async()=>{
  const run=scenario({outline:['venues/delhi_ncr [core]'],entries:{'venues/delhi_ncr':mastersEntry},proposals:[
    {venueId:masters._id,locality:masters.locality,entryPaths:['venues/delhi_ncr']},
    {venueId:ofis._id,locality:ofis.locality,entryPaths:['venues/delhi_ncr']},
    {venueId:'venue-invented-by-model',locality:'Gurugram',entryPaths:['venues/delhi_ncr']},
  ]});
  const {status,body}=await discover(run.handler);
  assert.equal(status,200,JSON.stringify(body));
  assert.deepEqual(run.reads,['venues/delhi_ncr'],'the agent read the Knowledge Base through MCP');
  assert.deepEqual(body.recommendations.map((lead)=>lead.venueId),[masters._id],'Ofis is published in Sanity but absent from the entry, so it is dropped');
  assert.equal(body.verification.rejectedCandidateCount,2);
  assert.deepEqual(body.verification.rejectedCandidates,[
    {venueId:ofis._id,reason:'no verified Knowledge Base section for this venue in the entries read'},
    {venueId:null,reason:'not a published research venue'},
  ],'each rejection is explained without echoing model-invented identifiers');
  assert.deepEqual(body.verification.entriesRead.map((entry)=>entry.path),['venues/delhi_ncr']);
  assert.deepEqual(body.retrievalEvidence,[{venueId:masters._id,entryPaths:['venues/delhi_ncr'],sourceReferenceIds:[muSource._id]}]);
});

test('if the entry cites the wrong venue\'s source, nothing is returned and there is no fallback list',async()=>{
  const swapped=`# Delhi NCR venues\n\n${section('Masters’ Union Campus — DLF Cyber Park, Udyog Vihar Phase III, Gurugram',masters.locality,muSource)}\n\n## Sources\n1. Ofis Square — Sohna Road — ${ofisSource.url}`;
  const run=scenario({outline:['venues/delhi_ncr [core]'],entries:{'venues/delhi_ncr':swapped},proposals:[{venueId:masters._id,locality:masters.locality,entryPaths:['venues/delhi_ncr']}]});
  const {status,body}=await discover(run.handler);
  assert.equal(status,200);
  assert.deepEqual(body.recommendations,[]);
  assert.equal(body.verification.citationChecks[0].valid,false);
});

test('without a Knowledge Base read, or without an entry for the city, no leads are published',async()=>{
  const unread=await discover(scenario({outline:['venues/delhi_ncr [core]'],entries:{'venues/delhi_ncr':mastersEntry},read:false,proposals:[{venueId:masters._id,locality:masters.locality,entryPaths:['venues/delhi_ncr']}]}).handler);
  assert.equal(unread.status,502);
  assert.equal(unread.body.recommendations,undefined);
  const otherCity=await discover(scenario({outline:['venues/bengaluru [core]'],entries:{},proposals:[]}).handler);
  assert.equal(otherCity.status,502,'a Bengaluru-only outline yields no Delhi NCR entries to read');
  assert.equal(otherCity.body.recommendations,undefined);
});

test('a shortened locality resolves to the published record, but another branch\'s locality is rejected with a reason',async()=>{
  const shortened=await discover(scenario({outline:['venues/delhi_ncr [core]'],entries:{'venues/delhi_ncr':mastersEntry},proposals:[{venueId:masters._id,locality:'Gurugram',entryPaths:['venues/delhi_ncr']}]}).handler);
  assert.equal(shortened.status,200,JSON.stringify(shortened.body));
  assert.deepEqual(shortened.body.recommendations.map((lead)=>[lead.venueId,lead.locality]),[[masters._id,masters.locality]]);
  const wrongBranch=await discover(scenario({outline:['venues/delhi_ncr [core]'],entries:{'venues/delhi_ncr':mastersEntry},proposals:[{venueId:masters._id,locality:'Sector 62, Noida',entryPaths:['venues/delhi_ncr']}]}).handler);
  assert.deepEqual(wrongBranch.body.recommendations,[]);
  assert.deepEqual(wrongBranch.body.verification.rejectedCandidates,[{venueId:masters._id,reason:'locality does not match the published record'}]);
});

test('a lead is backed by the verified sections the server read, even if the model cites tool entry IDs instead of paths',async()=>{
  const run=scenario({outline:['venues/delhi_ncr [core]'],entries:{'venues/delhi_ncr':mastersEntry},proposals:[{venueId:masters._id,locality:masters.locality,entryPaths:['entry-1']}]});
  const {status,body}=await discover(run.handler);
  assert.equal(status,200,JSON.stringify(body));
  assert.deepEqual(body.recommendations.map((lead)=>lead.venueId),[masters._id]);
  assert.deepEqual(body.retrievalEvidence[0].entryPaths,['venues/delhi_ncr'],'evidence paths come from what was actually read and verified');
});
