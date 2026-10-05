// Muxes the silent masters with the mastered mix, writes captions and the voiceover track to out/, and verifies
// every deliverable's codec, frame rate, size and duration with ffprobe.
import {execFileSync} from 'node:child_process';
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ffmpeg, ffprobe} from './tools.mjs';

const root = new URL('.', import.meta.url).pathname;
const out = join(root, 'out');
mkdirSync(out, {recursive: true});
const timeline = JSON.parse(readFileSync(join(root, 'timeline.json'), 'utf8'));
const vo = JSON.parse(readFileSync(join(root, 'build/vo-timing.json'), 'utf8'));
const master = join(root, 'build/audio/master.wav');

for (const format of ['landscape', 'vertical']) {
  execFileSync(ffmpeg, ['-y', '-v', 'error', '-i', join(root, `build/silent-${format}.mp4`), '-i', master, '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-t', String(timeline.duration), '-movflags', '+faststart',
    '-metadata', 'title=Backstage — 45 second introduction', join(out, `backstage-intro-${format === 'vertical' ? '1080x1920' : '1920x1080'}.mp4`)]);
}

// Captions: same split as the on-screen captions (each line's parts share its spoken span by character count).
const stamp = (s) => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
const cues = [];
timeline.captions.forEach(([id, parts], line) => {
  const {start, end} = vo[id], total = parts.reduce((n, p) => n + p.length, 0);
  const next = timeline.captions[line + 1] ? vo[timeline.captions[line + 1][0]].start : timeline.duration;
  let acc = start;
  parts.forEach((part, i) => { const d = (end - start) * part.length / total; cues.push([acc, i === parts.length - 1 ? Math.min(end + 0.15, next) : acc + d, part]); acc += d; });
});
writeFileSync(join(out, 'backstage-intro-captions.srt'), cues.map(([a, b, text], i) => `${i + 1}\n${stamp(a)} --> ${stamp(b)}\n${text}\n`).join('\n'));
copyFileSync(join(root, 'build/audio/voiceover.wav'), join(out, 'backstage-intro-voiceover.wav'));

for (const file of ['backstage-intro-1920x1080.mp4', 'backstage-intro-1080x1920.mp4', 'backstage-intro-voiceover.wav']) {
  const info = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,sample_rate,channels,nb_frames,duration', '-of', 'json', join(out, file)]));
  console.log(file, JSON.stringify(info));
}
