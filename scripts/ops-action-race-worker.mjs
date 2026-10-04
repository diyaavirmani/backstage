import {parentPort,workerData} from 'node:worker_threads';
import {mutate,openOperationsStore} from './operations-store.mjs';

const db=openOperationsStore(workerData.path);
parentPort.postMessage({ready:true});
parentPort.once('message',()=>{
  try{const result=mutate(db,workerData.workspaceId,workerData.role||'host',workerData.action);parentPort.postMessage({ok:true,result});}
  catch(error){parentPort.postMessage({ok:false,error:error instanceof Error?error.message:String(error)});}
  finally{db.close();}
});
