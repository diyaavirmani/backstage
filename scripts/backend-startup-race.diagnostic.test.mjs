import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Worker} from 'node:worker_threads';
import {DatabaseSync} from 'node:sqlite';

test('12 concurrent openers initialize ten independent fresh databases exactly once',async t=>{
  const directory=mkdtempSync(join(tmpdir(),'backstage-startup-diagnostic-'));
  t.after(()=>rmSync(directory,{recursive:true,force:true}));
  for (let databaseIndex=0; databaseIndex<10; databaseIndex++) {
    const path=join(directory,`fresh-${databaseIndex}.sqlite`);
    const results=await Promise.all(Array.from({length:12},()=>new Promise((resolve,reject)=>{
      const worker=new Worker(new URL('./operations-startup-worker.mjs',import.meta.url),{workerData:{path}});
      worker.once('message',resolve);worker.once('error',reject);
      worker.once('exit',code=>{if(code!==0)reject(new Error(`startup worker exited with ${code}`));});
    })));
    const failures=results.filter(result=>!result.ok);
    assert.deepEqual(failures,[],`database ${databaseIndex} startup failures: ${failures.map(item=>item.error).join('; ')}`);
    const db=new DatabaseSync(path);
    assert.deepEqual(db.prepare('SELECT version,count(*) count FROM schema_migrations GROUP BY version ORDER BY version').all().map(({version,count})=>({version,count})),[
      {version:1,count:1},{version:2,count:1},{version:3,count:1},{version:4,count:1},
    ]);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
    db.close();
  }
});
