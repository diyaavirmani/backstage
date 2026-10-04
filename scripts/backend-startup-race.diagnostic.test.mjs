import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Worker} from 'node:worker_threads';

test('diagnostic: simultaneous first opens all serialize migrations on a fresh database',async t=>{
  const directory=mkdtempSync(join(tmpdir(),'backstage-startup-diagnostic-'));
  t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const path=join(directory,'fresh.sqlite');
  const results=await Promise.all(Array.from({length:12},()=>new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./operations-startup-worker.mjs',import.meta.url),{workerData:{path}});
    worker.once('message',resolve);worker.once('error',reject);
    worker.once('exit',code=>{if(code!==0)reject(new Error(`startup worker exited with ${code}`));});
  })));
  const failures=results.filter(result=>!result.ok);
  assert.deepEqual(failures,[],`fresh-database startup failures: ${failures.map(item=>item.error).join('; ')}`);
});
