import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createVenueDiscoveryHandler} from '../src/lib/venue-discovery-handler.ts';

const markerToken='private-test-token-must-never-appear';
const source={_id:'source-mu',title:'Masters Union Companies',url:'https://mastersunion.org/for-companies'};
const venue={_id:'venue-masters-union-gurugram',name:'Masters’ Union Campus',city:'Delhi NCR',locality:'DLF Cyber Park, Udyog Vihar Phase III, Gurugram',relationshipStatus:'research-lead',sources:[source],claims:[
  {_key:'capacity',subject:'capacity',claim:'Room capacity',value:'Unknown capacity by room and layout.',evidenceType:'unknown',sources:[source]},
  {_key:'availability',subject:'availability',claim:'Current availability',value:'Unknown availability.',evidenceType:'unknown',sources:[source]},
  {_key:'price',subject:'price',claim:'Price',value:'Unknown price.',evidenceType:'unknown',sources:[source]},
  {_key:'booking',subject:'booking-authority',claim:'Backstage booking authority',value:'Unknown; public evidence does not authorize Backstage booking.',evidenceType:'unknown',sources:[source]},
],spaces:[]};
const brief={id:'provider-qa',title:'Fictional workshop',city:'Delhi NCR',eventType:'Workshop',date:'2028-11-14',startTime:'10:00',endTime:'12:00',audience:'Fictional local attendees',headcount:20,budgetAmount:0,currency:'INR',roomRequirements:[],equipmentRequirements:[],essentialRequirements:[],flexibleRequirements:[],setupMinutes:0,cleanupMinutes:0,savedAt:'2028-01-01T00:00:00.000Z'};
const body=JSON.stringify({brief,conversation:[{role:'user',content:'Find researched leads.'}]});
const entryText=`# Masters’ Union Campus — DLF Cyber Park, Udyog Vihar Phase III, Gurugram\n\nCapacity is unknown by room and layout. Current availability is unknown. Price is unknown. Backstage booking authority is unknown. [1]\n\n## Sources\n1. Masters Union Companies — ${source.url}`;

function makeScenario(options={}){
  let closed=0,reads=0,createdMcp=0;
  const handler=createVenueDiscoveryHandler({
    getModel:()=>({model:'mock'}),
    createSanityClient:()=>({fetch:async()=>[venue]}),
    createMCPClient:async()=>{createdMcp++;return{
      listTools:async()=>{if(options.listToolsError)throw options.listToolsError;return{tools:options.missingTools?[{name:'groq_query'}]:[{name:'initial_context'},{name:'knowledge_base_read'}]};},
      callTool:async({name})=>{if(name==='initial_context'&&options.readError)throw options.readError;if(name==='initial_context')return{content:[{type:'text',text:options.outlineError?'Knowledge base id: kbTest\n0 entries.':'Knowledge base id: kbTest\n1 entry.\nvenues/delhi_ncr/masters_union [core]'}]};if(options.knowledgeReadError)throw options.knowledgeReadError;reads++;return{content:[{type:'text',text:entryText}]};},
      close:async()=>{closed++;},
    };},
    generateText:async(args)=>{
      if(options.generateError)throw options.generateError;
      if(options.modelMode==='never')return await new Promise(()=>{});
      if(options.modelMode==='malformed')return{output:undefined,steps:[]};
      if(options.cancelSignal)await new Promise((_,reject)=>options.cancelSignal.addEventListener('abort',()=>reject(new Error('The request was cancelled.')),{once:true}));
      await args.tools.readVenueKnowledge.execute({entryId:'entry-1'});
      return{output:{recommendations:[{venueId:venue._id,locality:venue.locality,entryPaths:['venues/delhi_ncr/masters_union']}]},steps:[{toolCalls:[{toolName:'readVenueKnowledge'}]}]};
    },
    ...(options.shortTimeout?{generationTimeoutMs:30,requestTimeoutMs:2_000}:{}),
  });
  return{handler,getState:()=>({closed,reads,createdMcp})};
}

async function invoke(handler,signal){
  const dir=mkdtempSync(join(tmpdir(),'backstage-provider-failure-'));
  const keys=['BACKSTAGE_DB_PATH','APP_ORIGIN','NEXT_PUBLIC_SANITY_PROJECT_ID','NEXT_PUBLIC_SANITY_DATASET','SANITY_PROJECT_READ_TOKEN','SANITY_CONTEXT_MCP_URL','SANITY_ORGANIZATION_TOKEN','DEMO_DISCOVERY_DAILY_PER_SESSION','DEMO_DISCOVERY_DAILY_GLOBAL'];
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  Object.assign(process.env,{BACKSTAGE_DB_PATH:join(dir,'isolated.sqlite'),APP_ORIGIN:'http://127.0.0.1:3107',NEXT_PUBLIC_SANITY_PROJECT_ID:'test-project',NEXT_PUBLIC_SANITY_DATASET:'test-dataset',SANITY_PROJECT_READ_TOKEN:markerToken,SANITY_CONTEXT_MCP_URL:'https://context.invalid/test',SANITY_ORGANIZATION_TOKEN:markerToken,DEMO_DISCOVERY_DAILY_PER_SESSION:'100',DEMO_DISCOVERY_DAILY_GLOBAL:'100'});
  try{
    const response=await handler(new Request('http://127.0.0.1:3107/api/venue-discovery',{method:'POST',headers:{Origin:'http://127.0.0.1:3107',Cookie:'backstage-demo-session=isolated-provider-qa','Content-Type':'application/json'},body,signal}));
    const db=new DatabaseSync(join(dir,'isolated.sqlite'));
    const storage={applications:db.prepare('SELECT count(*) n FROM applications').get().n,allocations:db.prepare('SELECT count(*) n FROM allocations').get().n,globalQuotaRequests:db.prepare("SELECT COALESCE(SUM(request_count),0) n FROM discovery_quota_counters WHERE scope='global'").get().n,sessionQuotaRequests:db.prepare("SELECT COALESCE(SUM(request_count),0) n FROM discovery_quota_counters WHERE scope='session'").get().n};db.close();
    return{response,storage};
  }
  finally{for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}rmSync(dir,{recursive:true,force:true});}
}

test('OpenAI authentication and rate limits fail closed with sanitized responses',async()=>{
  for(const scenario of [{generateError:Object.assign(new Error(`401 ${markerToken}`),{statusCode:401}),status:502},{generateError:Object.assign(new Error(`429 ${markerToken}`),{statusCode:429}),status:503}]){
    const mock=makeScenario(scenario);const {response,storage}=await invoke(mock.handler);const result=await response.json();assert.equal(response.status,scenario.status);assert.equal(result.recommendations,undefined);assert.ok(!JSON.stringify(result).includes(markerToken));assert.equal(mock.getState().createdMcp,1);assert.equal(mock.getState().closed,1);assert.deepEqual(storage,{applications:0,allocations:0,globalQuotaRequests:1,sessionQuotaRequests:1});if(scenario.status===503)assert.equal(response.headers.get('retry-after'),'30');
  }
});

test('generation timeout and request cancellation are bounded and clean up Context',async()=>{
  const expectedStorage={applications:0,allocations:0,globalQuotaRequests:1,sessionQuotaRequests:1};
  const timeout=makeScenario({modelMode:'never',shortTimeout:true});const before=Date.now();const timed=await invoke(timeout.handler);assert.equal(timed.response.status,504);assert.ok(Date.now()-before<2_000);assert.equal(timeout.getState().closed,1);assert.deepEqual(timed.storage,expectedStorage);
  const controller=new AbortController();const cancelled=makeScenario({cancelSignal:controller.signal});const pending=invoke(cancelled.handler,controller.signal);setTimeout(()=>controller.abort(),15);const result=await pending;assert.equal(result.response.status,499);assert.equal(cancelled.getState().closed,1);assert.deepEqual(result.storage,expectedStorage);
});

test('Context authorization, transport, missing tools, empty outline, and malformed model output fail closed',async()=>{
  const scenarios=[{case:{listToolsError:Object.assign(new Error(markerToken),{statusCode:401})},status:502},{case:{readError:new Error(`transport ${markerToken}`)},status:502},{case:{knowledgeReadError:new Error(`entry read transport ${markerToken}`)},status:502},{case:{missingTools:true},status:503},{case:{outlineError:true},status:502},{case:{modelMode:'malformed'},status:502}];
  for(const{case:scenario,status}of scenarios){const mock=makeScenario(scenario);const{response,storage}=await invoke(mock.handler);const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));assert.equal(result.recommendations,undefined);assert.ok(!JSON.stringify(result).includes(markerToken));assert.equal(mock.getState().closed,1);assert.deepEqual(storage,{applications:0,allocations:0,globalQuotaRequests:1,sessionQuotaRequests:1});}
});

test('mocked success still requires a Knowledge Base read and validated source evidence',async()=>{
  const mock=makeScenario({});const{response,storage}=await invoke(mock.handler);const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(mock.getState().reads,1);assert.equal(result.recommendations.length,1);assert.deepEqual(result.recommendations[0].sourceReferences,[{id:source._id,title:source.title,url:source.url}]);assert.deepEqual(result.retrievalEvidence[0].entryPaths,['venues/delhi_ncr/masters_union']);assert.deepEqual(storage,{applications:0,allocations:0,globalQuotaRequests:1,sessionQuotaRequests:1});
});
