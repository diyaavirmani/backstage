import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, readdir, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packaged = resolve(root, '.next/standalone');
const required = [
  '.next/standalone/server.js', '.next/static', 'public',
  'db/migrations/001_operations.sql', 'db/migrations/004-discovery-quotas.sql',
  'scripts/operations-store.mjs', 'scripts/deployment-controls.mjs',
  'src/data/research-catalog.json',
];

async function assertPackagedFiles() {
  for (const item of required) await stat(join(root, item));
  for (const item of ['server.js', 'node_modules/next']) await stat(join(packaged, item));
  const assets = await readdir(join(root, '.next/static'));
  assert.ok(assets.length, 'Next static assets were generated');
}

async function freePort() {
  const {createServer} = await import('node:net');
  const server = createServer();
  await new Promise((resolvePromise, reject) => server.listen(0, '127.0.0.1', resolvePromise).once('error', reject));
  const {port} = server.address();
  await new Promise((resolvePromise, reject) => server.close((error) => error ? reject(error) : resolvePromise()));
  return port;
}

async function copyPackagedRuntime(destination) {
  const {cp, mkdir} = await import('node:fs/promises');
  await mkdir(destination, {recursive: true});
  await cp(packaged, destination, {recursive: true});
  await cp(join(root, '.next/static'), join(destination, '.next/static'), {recursive: true});
  for (const item of ['public', 'db', 'scripts']) await cp(join(root, item), join(destination, item), {recursive: true});
  await mkdir(join(destination, 'src/data'), {recursive: true});
  await cp(join(root, 'src/data/research-catalog.json'), join(destination, 'src/data/research-catalog.json'));
}

async function startServer(runtimeRoot, port, volume) {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: runtimeRoot,
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      HOSTNAME: '0.0.0.0',
      PORT: String(port),
      APP_ORIGIN: `http://127.0.0.1:${port}`,
      BACKSTAGE_APP_ROOT: runtimeRoot,
      BACKSTAGE_DB_PATH: join(volume, 'backstage.sqlite'),
      RAILWAY_ENVIRONMENT_ID: 'standalone-verification',
      RAILWAY_VOLUME_MOUNT_PATH: volume,
    },
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error('Packaged server exited before readiness.');
    try {
      const response = await fetch(`${base}/api/health`, {signal: AbortSignal.timeout(1000)});
      if (response.ok && (await response.json()).status === 'ready') { ready = true; break; }
    } catch {}
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }
  if (!ready) { child.kill('SIGTERM'); throw new Error('Packaged server did not become healthy.'); }
  return {child, base};
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolvePromise) => child.once('exit', resolvePromise)),
    new Promise((resolvePromise) => setTimeout(() => { child.kill('SIGKILL'); resolvePromise(); }, 5000)),
  ]);
}

async function request(base, path, cookie, body) {
  const response = await fetch(`${base}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body ? {'content-type': 'application/json', origin: base} : {}),
      ...(cookie ? {cookie} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  const data = await response.json();
  return {response, data, setCookie: response.headers.get('set-cookie')};
}

async function saveApproveAndRestart(runtimeRoot, tempRoot) {
  const volume = join(tempRoot, 'volume');
  const {mkdir} = await import('node:fs/promises');
  await mkdir(volume);
  const port = await freePort();
  let {child, base} = await startServer(runtimeRoot, port, volume);
  let cookie = '';
  let eventDate = '';
  try {
    const health = await request(base, '/api/health');
    assert.equal(health.data.status, 'ready');
    await assert.rejects(stat(join(volume, 'backstage.sqlite')), {code: 'ENOENT'}, 'health checks do not initialize SQLite');

    let loaded = await request(base, '/api/operations');
    assert.equal(loaded.response.status, 200);
    cookie = loaded.setCookie?.split(';', 1)[0];
    assert.ok(cookie?.startsWith('backstage-demo-session='), 'workspace cookie is issued');
    const venue = loaded.data.venues.find((item) => item.kind === 'demo' && item.city === 'Delhi NCR');
    const room = venue?.resources.find((item) => item.kind === 'room' && item.name === 'Workshop Studio');
    assert.ok(venue && room, 'fictional Delhi host and workshop room are included in the package');
    const eventDay = new Date();
    eventDay.setUTCDate(eventDay.getUTCDate() + 2);
    while (eventDay.getUTCDay() === 0) eventDay.setUTCDate(eventDay.getUTCDate() + 1);
    eventDate = eventDay.toISOString().slice(0, 10);
    const brief = {
      title: 'Packaged persistence workshop', city: 'Delhi NCR', eventType: 'Workshop',
      date: eventDate, startTime: '11:00', endTime: '12:00', audience: 'Local builders',
      headcount: 8, budgetAmount: 0, setupMinutes: 15, cleanupMinutes: 15,
      roomRequirements: ['Workshop Studio'], equipmentRequirements: [],
      essentialRequirements: [], flexibleRequirements: [],
    };
    const saved = await request(base, '/api/operations', cookie, {
      type: 'submit-application', payload: {
        venueId: venue.id, brief, resources: [{id: room.id, quantity: 1}],
        organizer: {name: 'Demo Organizer', email: 'demo@example.test'},
        idempotencyKey: 'standalone-persistence-verification', reviewed: true,
      },
    });
    assert.equal(saved.response.status, 200, 'fictional request can be submitted');
    const applicationId = saved.data.applicationId;
    assert.ok(applicationId);

    const switched = await request(base, '/api/operations', cookie, {type: 'switch-role', role: 'host'});
    assert.equal(switched.response.status, 200);
    const approved = await request(base, '/api/operations', cookie, {type: 'approve', applicationId, venueId: venue.id});
    assert.equal(approved.response.status, 200, 'host approves feasible application');
    loaded = await request(base, `/api/operations?month=${eventDate.slice(0, 7)}`, cookie);
    const app = loaded.data.applications.find((item) => item.id === applicationId);
    assert.equal(app.status, 'approved');
    assert.ok(loaded.data.calendar.allocations.some((allocation) => allocation.application_id === applicationId && allocation.state === 'reservation'));
    const hostTask = app.checklist.find((item) => item.owner === 'host');
    assert.ok(hostTask, 'approval generated host checklist items');
    const completed = await request(base, '/api/operations', cookie, {type: 'toggle-checklist', applicationId, itemId: hostTask.id});
    assert.equal(completed.response.status, 200, 'host checklist update persists');
  } finally {
    await stopServer(child);
  }

  ({child, base} = await startServer(runtimeRoot, port, volume));
  try {
    const loaded = await request(base, `/api/operations?month=${eventDate.slice(0, 7)}`, cookie);
    assert.equal(loaded.response.status, 200, 'same opaque workspace resumes after restart');
    const app = loaded.data.applications.find((item) => item.brief.title === 'Packaged persistence workshop');
    assert.ok(app, 'application row survived restart');
    assert.equal(app.status, 'approved');
    assert.ok(app.checklist.some((item) => item.owner === 'host' && item.completed_at), 'checklist completion survived restart');
    assert.ok(loaded.data.calendar.allocations.some((allocation) => allocation.application_id === app.id && allocation.state === 'reservation'), 'resource allocation survived restart');
  } finally {
    await stopServer(child);
  }
}

async function main() {
  await assertPackagedFiles();
  const tempRoot = await mkdtemp(join(tmpdir(), 'backstage-standalone-'));
  try {
    const runtimeRoot = join(tempRoot, 'runtime');
    await copyPackagedRuntime(runtimeRoot);
    await saveApproveAndRestart(runtimeRoot, tempRoot);
    console.log('Standalone package check passed: runtime assets were present, health did not create SQLite, and a fictional application, reservation, and checklist completion survived process restart on an isolated volume.');
  } finally {
    await rm(tempRoot, {recursive: true, force: true});
  }
}

main().catch((error) => {
  console.error(`Standalone package check failed: ${error instanceof Error ? error.message : 'unknown failure'}`);
  process.exitCode = 1;
});
