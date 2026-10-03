import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:net';

const image = process.env.BACKSTAGE_DOCKER_IMAGE;
if (!image) throw new Error('Set BACKSTAGE_DOCKER_IMAGE to the image built for verification.');
const suffix = randomUUID().slice(0, 12);
const container = `backstage-smoke-${suffix}`;
const volume = `backstage-smoke-data-${suffix}`;
let containerCreated = false;
let volumeCreated = false;

function docker(args, {allowFailure = false} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, {stdio: ['ignore', 'pipe', 'ignore']});
    let stdout = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.once('error', () => reject(new Error('Docker CLI could not be started.')));
    child.once('close', (code) => {
      if (code === 0 || allowFailure) resolve(stdout.trim());
      else reject(new Error(`Docker command failed (${args[0]} ${args[1] ?? ''}, exit ${code}).`));
    });
  });
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitReady(base) {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(`${base}/api/health`, {signal: AbortSignal.timeout(1000)});
      if (response.ok && (await response.json()).status === 'ready') return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Docker image did not become healthy within 30 seconds.');
}

async function request(base, path, cookie, body) {
  const response = await fetch(`${base}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body ? {'content-type': 'application/json', origin: base} : {}),
      ...(cookie ? {cookie} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  let data;
  try { data = await response.json(); } catch { data = {}; }
  return {response, data, setCookie: response.headers.get('set-cookie')};
}

async function main() {
  await docker(['volume', 'create', volume]);
  volumeCreated = true;
  await docker(['run', '--rm', '--user', '0', '--mount', `source=${volume},target=/data`, '--entrypoint', 'sh', image, '-c', 'chown node:node /data']);
  const port = await availablePort();
  await docker([
    'run', '--detach', '--name', container,
    '--publish', `127.0.0.1:${port}:3000`, '--mount', `source=${volume},target=/data`,
    '--env', 'NODE_ENV=production', '--env', 'PORT=3000', '--env', 'HOSTNAME=0.0.0.0',
    '--env', `APP_ORIGIN=http://127.0.0.1:${port}`,
    '--env', 'BACKSTAGE_DB_PATH=/data/backstage.sqlite', image,
  ]);
  containerCreated = true;
  const base = `http://127.0.0.1:${port}`;
  await waitReady(base);
  await docker(['exec', container, 'test', '!', '-e', '/data/backstage.sqlite']);

  const home = await fetch(`${base}/`, {signal: AbortSignal.timeout(10000)});
  assert.equal(home.status, 200, 'home route is served by the image');
  const html = await home.text();
  const cssPath = html.match(/href="([^"]+\.css(?:\?[^"]*)?)"/)?.[1]?.replaceAll('&amp;', '&');
  assert.ok(cssPath, 'home page references a static stylesheet');
  const css = await fetch(new URL(cssPath, base), {signal: AbortSignal.timeout(10000)});
  assert.equal(css.status, 200, 'Next static CSS is present in the image');
  assert.ok((await css.text()).length > 0, 'static stylesheet has content');

  let loaded = await request(base, '/api/operations');
  assert.equal(loaded.response.status, 200, 'operational API initializes against the mounted volume');
  const cookie = loaded.setCookie?.split(';', 1)[0];
  assert.ok(cookie?.startsWith('backstage-demo-session='), 'isolated workspace cookie is issued');
  const venue = loaded.data.venues.find((item) => item.kind === 'demo' && item.city === 'Delhi NCR');
  const room = venue?.resources.find((item) => item.kind === 'room' && item.name === 'Workshop Studio');
  assert.ok(venue && room, 'fictional host and room are present');
  const day = new Date();
  day.setUTCDate(day.getUTCDate() + 2);
  while (day.getUTCDay() === 0) day.setUTCDate(day.getUTCDate() + 1);
  const eventDate = day.toISOString().slice(0, 10);
  const brief = {
    title: 'Container persistence workshop', city: 'Delhi NCR', eventType: 'Workshop',
    date: eventDate, startTime: '11:00', endTime: '12:00', audience: 'Local builders',
    headcount: 8, budgetAmount: 0, setupMinutes: 15, cleanupMinutes: 15,
    roomRequirements: ['Workshop Studio'], equipmentRequirements: [],
    essentialRequirements: [], flexibleRequirements: [],
  };
  const saved = await request(base, '/api/operations', cookie, {
    type: 'submit-application', payload: {
      venueId: venue.id, brief, resources: [{id: room.id, quantity: 1}],
      organizer: {name: 'Demo Organizer', email: 'demo@example.test'},
      idempotencyKey: `docker-${suffix}`, reviewed: true,
    },
  });
  assert.equal(saved.response.status, 200, 'fictional event can be submitted');
  const applicationId = saved.data.applicationId;
  assert.ok(applicationId);
  const switched = await request(base, '/api/operations', cookie, {type: 'switch-role', role: 'host'});
  assert.equal(switched.response.status, 200, 'demo host role can be selected');
  const approved = await request(base, '/api/operations', cookie, {type: 'approve', applicationId, venueId: venue.id});
  assert.equal(approved.response.status, 200, 'host approval allocates the requested room');
  loaded = await request(base, `/api/operations?month=${eventDate.slice(0, 7)}`, cookie);
  let application = loaded.data.applications.find((item) => item.id === applicationId);
  assert.equal(application?.status, 'approved');
  assert.ok(loaded.data.calendar.allocations.some((item) => item.application_id === applicationId && item.state === 'reservation'));
  const task = application.checklist.find((item) => item.owner === 'host');
  assert.ok(task, 'approval generates host checklist items');
  const taskResult = await request(base, '/api/operations', cookie, {type: 'toggle-checklist', applicationId, itemId: task.id});
  assert.equal(taskResult.response.status, 200, 'host checklist task can be completed');

  await docker(['stop', container]);
  await docker(['start', container]);
  await waitReady(base);
  loaded = await request(base, `/api/operations?month=${eventDate.slice(0, 7)}`, cookie);
  application = loaded.data.applications.find((item) => item.id === applicationId);
  assert.equal(application?.status, 'approved', 'application persists across container restart');
  assert.ok(application.checklist.some((item) => item.id === task.id && item.completed_at), 'checklist completion persists across container restart');
  assert.ok(loaded.data.calendar.allocations.some((item) => item.application_id === applicationId && item.state === 'reservation'), 'reservation persists across container restart');
  console.log('Docker image smoke check passed: health, static CSS, operational submission, approval, checklist update, and SQLite persistence across container restart on an isolated named volume.');
}

main().catch((error) => {
  console.error(`Docker image smoke check failed: ${error instanceof Error ? error.message : 'unknown failure'}`);
  process.exitCode = 1;
}).finally(async () => {
  if (containerCreated) await docker(['rm', '--force', container], {allowFailure: true}).catch(() => {});
  if (volumeCreated) await docker(['volume', 'rm', volume], {allowFailure: true}).catch(() => {});
});
