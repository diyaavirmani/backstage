// Extracts 30 fps JPEG frames for each shot in timeline.json, retimed to the shot's output duration.
import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, rmSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {ffmpeg} from './tools.mjs';

const root = new URL('.', import.meta.url).pathname;
const timeline = JSON.parse(readFileSync(join(root, 'timeline.json'), 'utf8'));
const only = process.argv[2];
for (const shot of timeline.shots) {
  if (only && shot.id !== only) continue;
  const dir = join(root, 'build/frames', shot.id);
  rmSync(dir, {recursive: true, force: true});
  mkdirSync(dir, {recursive: true});
  const outDur = shot.out[1] - shot.out[0];
  const start = Math.max(0, shot.src[0] + timeline.offset);
  const input = join(root, 'build/raw', `${shot.clip}.webm`);
  const frames = shot.freeze ? 1 : Math.round(outDur * timeline.fps);
  const speed = shot.freeze ? 1 : (shot.src[1] - shot.src[0]) / outDur;
  const filter = shot.freeze ? 'scale=1920:1080' : `setpts=(PTS-STARTPTS)/${speed.toFixed(5)},fps=${timeline.fps},scale=1920:1080`;
  execFileSync(ffmpeg, ['-v', 'error', '-ss', start.toFixed(3), '-i', input, '-vf', filter, '-frames:v', String(frames), '-q:v', '2', join(dir, '%04d.jpg')]);
  const got = readdirSync(dir).length;
  console.log(`${shot.id}: ${got}/${frames} frames from ${start.toFixed(2)}s at ${speed.toFixed(2)}x`);
}
