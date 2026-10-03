import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Worker} from 'node:worker_threads';
import {consumeDiscoveryQuota,openOperationsStore} from './operations-store.mjs';

function setup(){const dir=mkdtempSync(join(tmpdir(),'backstage-quota-'));const path=join(dir,'quota.sqlite');const db=openOperationsStore(path);return{dir,path,db,close(){db.close();rmSync(dir,{recursive:true,force:true});}};}
const limits={perSession:2,global:4};

test('per-session quota persists while fresh cookies remain subject to the global cap',t=>{
  const s=setup();t.after(()=>s.close());const now=new Date('2026-10-03T12:00:00Z');
  assert.equal(consumeDiscoveryQuota(s.db,'cookie-a',limits,now).allowed,true);
  assert.equal(consumeDiscoveryQuota(s.db,'cookie-a',limits,now).allowed,true);
  assert.equal(consumeDiscoveryQuota(s.db,'cookie-a',limits,now).reason,'session');
  assert.equal(consumeDiscoveryQuota(s.db,'cookie-b',limits,now).allowed,true);
  assert.equal(consumeDiscoveryQuota(s.db,'cookie-c',limits,now).allowed,true);
  assert.equal(consumeDiscoveryQuota(s.db,'cookie-d',limits,now).reason,'global');
  assert.equal(consumeDiscoveryQuota(s.db,'cookie-d',{perSession:2,global:4},new Date('2026-10-04T00:00:00Z')).allowed,true);
});

test('simultaneous requests through separate SQLite connections cannot exceed the global quota',async t=>{
  const s=setup();t.after(()=>s.close());
  const now='2026-10-03T12:00:00.000Z';
  const results=await Promise.all(Array.from({length:16},(_,i)=>new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./quota-race-worker.mjs',import.meta.url),{workerData:{path:s.path,token:`fresh-${i}`,limits:{perSession:100,global:5},now}});
    worker.once('message',resolve);worker.once('error',reject);worker.once('exit',code=>{if(code!==0)reject(new Error(`quota worker exited ${code}`));});
  })));
  assert.equal(results.filter(result=>result.allowed).length,5);
  assert.equal(results.filter(result=>result.reason==='global').length,11);
});
