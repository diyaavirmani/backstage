import {parentPort,workerData} from 'node:worker_threads';
import {consumeDiscoveryQuota,openOperationsStore} from './operations-store.mjs';

const db=openOperationsStore(workerData.path);
try { parentPort.postMessage(consumeDiscoveryQuota(db,workerData.token,workerData.limits,new Date(workerData.now))); }
finally { db.close(); }
