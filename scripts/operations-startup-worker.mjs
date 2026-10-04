import {parentPort,workerData} from 'node:worker_threads';
import {openOperationsStore} from './operations-store.mjs';

try{
  const db=openOperationsStore(workerData.path);
  db.close();
  parentPort.postMessage({ok:true});
}catch(error){
  parentPort.postMessage({ok:false,error:error instanceof Error?error.message:'unknown initialization error'});
}
