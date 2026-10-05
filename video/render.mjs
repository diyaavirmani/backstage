// Renders compositor.html frame by frame (Playwright) and pipes JPEGs to ffmpeg as a silent 30 fps master.
// Usage: node render.mjs landscape|vertical [fromSecond toSecond]  (a range writes stills instead, for review)
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ffmpeg} from './tools.mjs';
import {readWav} from './wav.mjs';

const root = new URL('.', import.meta.url).pathname;
const format = process.argv[2] || 'landscape';
const range = process.argv[3] !== undefined ? [Number(process.argv[3]), Number(process.argv[4] ?? process.argv[3])] : null;
const [W, H] = format === 'vertical' ? [1080, 1920] : [1920, 1080];
const timeline = JSON.parse(readFileSync(join(root, 'timeline.json'), 'utf8'));
for (const shot of timeline.shots) shot.frames = readdirSync(join(root, 'build/frames', shot.id)).length;
const vo = {};
for (const line of timeline.vo) {
  const wav = readWav(join(root, `build/vo/t${line.id.slice(1)}.wav`));
  vo[line.id] = {start: line.start, end: line.start + wav.channels[0].length / wav.rate / (line.tempo || 1)};
}
writeFileSync(join(root, 'build/vo-timing.json'), JSON.stringify(vo, null, 2));

const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: W, height: H}, deviceScaleFactor: 1});
await page.goto(`file://${join(root, 'compositor.html')}?format=${format}`);
await page.evaluate(() => document.fonts.ready);
await page.evaluate(([t, v]) => window.setup(t, v), [timeline, vo]);

const total = Math.round(timeline.duration * timeline.fps);
if (range) {
  const dir = join(root, 'build/stills', format);
  mkdirSync(dir, {recursive: true});
  for (let t = range[0]; t <= range[1] + 1e-9; t += 0.5) {
    await page.evaluate((s) => window.renderFrame(s), t);
    await page.screenshot({path: join(dir, `${t.toFixed(1).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 80});
  }
} else {
  const out = join(root, `build/silent-${format}.mp4`);
  const enc = spawn(ffmpeg, ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(timeline.fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(timeline.fps), out], {stdio: ['pipe', 'inherit', 'inherit']});
  const started = Date.now();
  for (let i = 0; i < total; i++) {
    await page.evaluate((s) => window.renderFrame(s), i / timeline.fps);
    const jpg = await page.screenshot({type: 'jpeg', quality: 95});
    if (!enc.stdin.write(jpg)) await new Promise((r) => enc.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`${format} ${i}/${total} ${((Date.now() - started) / 1000).toFixed(0)}s`);
  }
  enc.stdin.end();
  await new Promise((r, j) => enc.on('close', (code) => code ? j(new Error(`ffmpeg ${code}`)) : r()));
  console.log(`wrote ${out}`);
}
await browser.close();
