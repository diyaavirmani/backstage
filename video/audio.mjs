// Synthesizes the original soundtrack and SFX, places the narration, ducks the music under speech, and writes
// build/audio/{music,sfx,voiceover,mix}.wav (48 kHz stereo, exactly timeline.duration seconds).
import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {ffmpeg} from './tools.mjs';
import {readWav, writeWav} from './wav.mjs';

const root = new URL('.', import.meta.url).pathname;
const timeline = JSON.parse(readFileSync(join(root, 'timeline.json'), 'utf8'));
const out = join(root, 'build/audio');
mkdirSync(out, {recursive: true});
const SR = 48000, N = Math.round(timeline.duration * SR), TAU = Math.PI * 2;
const buffer = () => [new Float32Array(N), new Float32Array(N)];
const music = buffer(), sfx = buffer(), voice = buffer();
const add = (buf, i, l, r = l) => { if (i >= 0 && i < N) { buf[0][i] += l; buf[1][i] += r; } };
const pan = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];
let seed = 7;
const noise = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2147483648 - 1; };

// RBJ biquad
function biquad(type, f, q = 0.707) {
  const w = TAU * f / SR, cos = Math.cos(w), alpha = Math.sin(w) / (2 * q);
  let b0, b1, b2, a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
  if (type === 'lp') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = b0; }
  else if (type === 'hp') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = b0; }
  else { b0 = alpha; b1 = 0; b2 = -alpha; }
  const c = [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const run = (x) => { const y = c[0] * x + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  run.set = (nf, nq = q) => { const w2 = TAU * Math.min(nf, SR * 0.45) / SR, cs = Math.cos(w2), al = Math.sin(w2) / (2 * nq), A0 = 1 + al;
    if (type === 'lp') { c[0] = (1 - cs) / 2 / A0; c[1] = (1 - cs) / A0; c[2] = c[0]; }
    else if (type === 'hp') { c[0] = (1 + cs) / 2 / A0; c[1] = -(1 + cs) / A0; c[2] = c[0]; }
    else { c[0] = al / A0; c[1] = 0; c[2] = -al / A0; }
    c[3] = -2 * cs / A0; c[4] = (1 - al) / A0; };
  return run;
}

// ---------------- Music (120 BPM, A minor: Am F C G, one chord per bar) ----------------
const BEAT = 0.5, BAR = 2;
const chords = [[110, [220, 261.63, 329.63]], [87.31, [174.61, 220, 261.63]], [130.81, [261.63, 329.63, 392]], [98, [196, 246.94, 293.66]]];
const chordAt = (t) => chords[Math.floor(t / BAR) % 4];
const DROP = 14.45, BUILD = 12.6, BREAK = 13.75, END = 41.5;
const groove = (t) => t >= 6 && t < BREAK || t >= DROP && t < END;

function kick(t0, gain = 1) {
  let ph = 0;
  for (let i = 0; i < SR * 0.45; i++) { const t = i / SR, f = 45 + 110 * Math.exp(-t * 30); ph += TAU * f / SR;
    const v = (Math.sin(ph) * Math.exp(-t * 7) + (i < 96 ? noise() * 0.3 * (1 - i / 96) : 0)) * gain * 0.9; add(music, Math.round(t0 * SR) + i, v); }
}
function hat(t0, gain = 1, p = 0.2) {
  const hp = biquad('hp', 7000), [l, r] = pan(p);
  for (let i = 0; i < SR * 0.05; i++) { const v = hp(noise()) * Math.exp(-i / SR * 90) * gain * 0.22; add(music, Math.round(t0 * SR) + i, v * l, v * r); }
}
function clap(t0, gain = 1) {
  const bp = biquad('bp', 1500, 1.2);
  for (let i = 0; i < SR * 0.22; i++) { const t = i / SR, burst = t < 0.03 ? (Math.floor(t / 0.01) % 2 ? 0.5 : 1) : 1;
    const v = bp(noise()) * Math.exp(-Math.max(0, t - 0.02) * 22) * burst * gain * 0.9; add(music, Math.round(t0 * SR) + i, v * 0.9, v); }
}
function snare(t0, gain = 1) {
  const bp = biquad('bp', 2200, 0.8);
  for (let i = 0; i < SR * 0.12; i++) { const t = i / SR; const v = (bp(noise()) * 0.8 + Math.sin(TAU * 190 * t) * 0.3) * Math.exp(-t * 30) * gain * 0.6; add(music, Math.round(t0 * SR) + i, v); }
}
// Drums
for (let b = 0; b < timeline.duration / BEAT; b++) {
  const t = b * BEAT;
  if (groove(t)) { kick(t, t >= DROP ? 1 : 0.8); hat(t + BEAT / 2, t >= DROP ? 1 : 0.7, 0.25); if (t >= DROP) { hat(t + BEAT / 4, 0.35, -0.3); hat(t + 3 * BEAT / 4, 0.35, -0.3); } }
  if (t >= DROP && t < END && b % 2 === 1) clap(t, 0.8);
  if (t >= 3 && t < 6) hat(t + BEAT / 2, 0.45, 0.25);
}
// Build: accelerating snare roll into the break
for (let t = BUILD, step = 0.25; t < BREAK; t += step) { snare(t, 0.35 + 0.65 * (t - BUILD) / (BREAK - BUILD)); if (t > BUILD + 0.5) step = 0.125; }
// Pad (detuned saws, filter opening through the intro and again at the drop)
{
  const voices = [-0.004, 0, 0.004], lpL = biquad('lp', 600, 0.9), lpR = biquad('lp', 600, 0.9);
  const phases = new Float64Array(12);
  for (let i = 0; i < N; i++) {
    const t = i / SR, [, notes] = chordAt(t);
    const cutoff = t < 6 ? 500 + 900 * t / 6 : t < BREAK ? 1500 : t < DROP ? 700 : t < END ? 2200 : Math.max(300, 2200 * Math.exp(-(t - END) * 1.2));
    if (i % 64 === 0) { lpL.set(cutoff, 0.9); lpR.set(cutoff * 1.05, 0.9); }
    let l = 0, r = 0, k = 0;
    for (const f of notes) for (const d of voices) { phases[k] = (phases[k] + f * (1 + d) / SR) % 1; const s = 2 * phases[k] - 1; if (d <= 0) l += s; if (d >= 0) r += s; k++; }
    const beatPos = (t % BEAT) / BEAT, pump = groove(t) ? 0.55 + 0.45 * Math.min(1, beatPos * 2.2) : 1;
    const env = (t < END ? Math.min(1, t / 1.5) : Math.exp(-(t - END) * 0.9)) * pump * (t >= DROP && t < END ? 1.15 : 1);
    add(music, i, lpL(l) * 0.05 * env, lpR(r) * 0.05 * env);
  }
}
// Bass (offbeat 8ths in the groove, sustained roots in the drop)
{
  const lp = biquad('lp', 400, 1); let ph = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR; if (!groove(t)) { lp(0); continue; }
    const [root] = chordAt(t), pos = t % BEAT, on = pos >= BEAT / 2;
    ph = (ph + root / SR) % 1;
    const env = on ? Math.exp(-(pos - BEAT / 2) * 6) : (t >= DROP ? 0.25 : 0);
    const v = lp((Math.sin(TAU * ph) * 0.8 + (2 * ph - 1) * 0.35)) * env * 0.42;
    add(music, i, v);
  }
}
// Pluck arpeggio (16ths) from 1.5 s, up an octave, alternating pan
{
  const pattern = [0, 1, 2, 1, 0, 2, 1, 2];
  for (let n = 0, t = 1.5; t < END; n++, t = 1.5 + n * BEAT / 2) {
    if (t >= BREAK && t < DROP) continue;
    const [, notes] = chordAt(t), f = notes[pattern[n % 8]] * 2, [l, r] = pan(n % 2 ? 0.45 : -0.45);
    const gain = t < 6 ? 0.5 : t < DROP ? 0.65 : 0.8, lp = biquad('lp', 2600, 0.7);
    for (let i = 0; i < SR * 0.22; i++) { const x = i / SR, s = Math.sin(TAU * f * x) * 0.6 + Math.sign(Math.sin(TAU * f * x)) * 0.25;
      const v = lp(s) * Math.exp(-x * 16) * gain * 0.09; add(music, Math.round(t * SR) + i, v * l, v * r); }
  }
}
// Searching break: soft ticking pulse on the 16ths while the Knowledge Base is read
for (let t = BREAK; t < DROP; t += 0.125) { const f = 1760; for (let i = 0; i < SR * 0.03; i++) add(music, Math.round(t * SR) + i, Math.sin(TAU * f * i / SR) * Math.exp(-i / SR * 120) * 0.05); }
// Final chord sting after the hit
for (const f of [110, 220, 261.63, 329.63, 440]) for (let i = 0; i < (timeline.duration - END) * SR; i++) { const x = i / SR; add(music, Math.round(END * SR) + i, (Math.sin(TAU * f * x) + 0.3 * Math.sin(TAU * f * 2 * x)) * Math.exp(-x * 0.9) * 0.035); }

// ---------------- SFX ----------------
const fx = {
  tick(t0) { const hp = biquad('hp', 2500); for (let i = 0; i < SR * 0.025; i++) { const x = i / SR; add(sfx, Math.round(t0 * SR) + i, (hp(noise()) * 0.5 + Math.sin(TAU * 3200 * x) * 0.5) * Math.exp(-x * 260) * 0.32); } },
  pop(t0) { let ph = 0; for (let i = 0; i < SR * 0.09; i++) { const x = i / SR, f = 380 + 700 * Math.exp(-x * 45); ph += TAU * f / SR; add(sfx, Math.round(t0 * SR) + i, Math.sin(ph) * Math.min(1, x * 400) * Math.exp(-x * 40) * 0.3); } },
  whoosh(t0) { const bpL = biquad('bp', 500, 1.4), bpR = biquad('bp', 500, 1.4), d = 0.45;
    for (let i = 0; i < SR * d; i++) { const x = i / SR, p = x / d, f = 300 + 3200 * Math.sin(Math.PI * p) ** 2; if (i % 32 === 0) { bpL.set(f, 1.4); bpR.set(f * 1.1, 1.4); }
      const env = Math.sin(Math.PI * p) ** 2 * 0.4, [l, r] = pan(-0.7 + 1.4 * p); add(sfx, Math.round(t0 * SR) + i, bpL(noise()) * env * l, bpR(noise()) * env * r); } },
  chime(t0) { for (const [f, g] of [[1567.98, 1], [2093, 0.7], [3135.96, 0.25]]) for (let i = 0; i < SR * 1.1; i++) { const x = i / SR, delay = f === 2093 ? 0.07 : 0; if (x < delay) continue;
      add(sfx, Math.round(t0 * SR) + i, Math.sin(TAU * f * (x - delay)) * Math.exp(-(x - delay) * 4.5) * Math.min(1, (x - delay) * 300) * g * 0.09); } },
  lift(t0) { let ph = 0; const d = 0.7; for (let i = 0; i < SR * d; i++) { const x = i / SR, p = x / d, f = 440 * Math.pow(2, p * 1.5); ph += TAU * f / SR;
      const env = Math.sin(Math.PI * p) * 0.12, sh = Math.sin(TAU * f * 2.01 * x) * 0.4; add(sfx, Math.round(t0 * SR) + i, (Math.sin(ph) + sh) * env * 0.9, (Math.sin(ph * 1.003) + sh) * env); } },
  riser(t0) { const d = DROP - t0, bp = biquad('bp', 400, 2); let ph = 0;
    for (let i = 0; i < SR * d; i++) { const x = i / SR, p = x / d, f = 400 + 5000 * p * p; if (i % 32 === 0) bp.set(f, 2); ph += TAU * (200 + 600 * p) / SR;
      add(sfx, Math.round(t0 * SR) + i, (bp(noise()) * 0.6 + Math.sin(ph) * 0.15) * p * p * 0.35); } },
  hit(t0) { let ph = 0; const lp = biquad('lp', 5000);
    for (let i = 0; i < SR * 2.5; i++) { const x = i / SR, f = 42 + 90 * Math.exp(-x * 14); ph += TAU * f / SR;
      add(sfx, Math.round(t0 * SR) + i, Math.sin(ph) * Math.exp(-x * 2.2) * 0.5 + lp(noise()) * Math.exp(-x * 5) * 0.12); } },
};
for (const [kind, at] of timeline.sfx) fx[kind](at);

// ---------------- Voice ----------------
for (const line of timeline.vo) {
  const src = join(root, `build/vo/t${line.id.slice(1)}.wav`), processed = join(out, `vo-${line.id}.wav`);
  const filters = ['highpass=f=80', 'acompressor=threshold=-20dB:ratio=2.5:attack=5:release=90:makeup=2', ...(line.tempo ? [`atempo=${line.tempo}`] : [])];
  execFileSync(ffmpeg, ['-y', '-v', 'error', '-i', src, '-af', filters.join(','), '-ar', String(SR), '-ac', '1', processed]);
  const wav = readWav(processed).channels[0], start = Math.round(line.start * SR);
  // Level-match lines: every line lands at -23 dBFS RMS so the ducked bed sits the same distance below each one.
  const level = Math.pow(10, -23 / 20) / Math.sqrt(wav.reduce((sum, v) => sum + v * v, 0) / wav.length);
  for (let i = 0; i < wav.length; i++) add(voice, start + i, wav[i] * level);
}

// ---------------- Ducking and mix ----------------
let env = 0, gain = 1;
const peakOf = (buf) => buf.reduce((m, ch) => Math.max(m, ch.reduce((a, v) => Math.max(a, Math.abs(v)), 0)), 0);
const musicLevel = 0.4 / peakOf(music);
const mix = buffer();
for (let i = 0; i < N; i++) {
  const v = Math.abs(voice[0][i]);
  env = v > env ? env + (v - env) * 0.02 : env * (1 - 1 / (SR * 0.25));
  const target = env > 0.015 ? 0.3 : 1;
  gain += (target - gain) * (target < gain ? 1 / (SR * 0.06) : 1 / (SR * 0.3));
  const fade = i > N - SR * 0.25 ? (N - i) / (SR * 0.25) : 1, bed = i < 6 * SR ? 2 : i >= END * SR ? 1.8 : 1;
  for (let c = 0; c < 2; c++) { music[c][i] *= musicLevel * gain * fade * bed; mix[c][i] = music[c][i] + sfx[c][i] * fade + voice[c][i]; }
}
const peak = peakOf(mix), norm = peak > 0.89 ? 0.89 / peak : 1;
for (const ch of mix) for (let i = 0; i < N; i++) ch[i] *= norm;
writeWav(join(out, 'music.wav'), SR, music);
writeWav(join(out, 'sfx.wav'), SR, sfx);
writeWav(join(out, 'voiceover.wav'), SR, voice);
writeWav(join(out, 'mix.wav'), SR, mix);
console.log(`mix peak ${(20 * Math.log10(peak * norm)).toFixed(1)} dBFS, ${N} samples (${N / SR}s)`);
// Master: +3.5 dB into a limiter lands at about -16 LUFS integrated with peaks under -1 dBFS.
execFileSync(ffmpeg, ['-y', '-v', 'error', '-i', join(out, 'mix.wav'), '-af', 'volume=3.5dB,alimiter=limit=0.84:level=false:attack=3:release=60', '-ar', String(SR), join(out, 'master.wav')]);
console.log('wrote build/audio/master.wav');
