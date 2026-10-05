// Trims leading/trailing silence from each generated narration line (build/vo/l*.wav -> build/vo/t*.wav, 48 kHz mono).
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {ffmpeg} from './tools.mjs';

const root = new URL('.', import.meta.url).pathname;
const trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse';
for (const {id} of JSON.parse(readFileSync(join(root, 'narration.json'), 'utf8')).lines) {
  execFileSync(ffmpeg, ['-y', '-v', 'error', '-i', join(root, `build/vo/${id}.wav`), '-af', trim, '-ar', '48000', '-ac', '1', join(root, `build/vo/t${id.slice(1)}.wav`)]);
  console.log(`trimmed ${id}`);
}
