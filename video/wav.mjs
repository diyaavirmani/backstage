// Minimal WAV helpers: read PCM16/float32 to Float32 mono/stereo channels, write PCM16.
import {readFileSync, writeFileSync} from 'node:fs';

export function readWav(path) {
  const b = readFileSync(path);
  let pos = 12, fmt = null, data = null;
  while (pos + 8 <= b.length) {
    const id = b.toString('ascii', pos, pos + 4);
    let size = b.readUInt32LE(pos + 4);
    if (id === 'data' && (size === 0xffffffff || pos + 8 + size > b.length)) size = b.length - pos - 8;
    if (id === 'fmt ') fmt = {format: b.readUInt16LE(pos + 8), channels: b.readUInt16LE(pos + 10), rate: b.readUInt32LE(pos + 12), bits: b.readUInt16LE(pos + 22)};
    if (id === 'data') { data = b.subarray(pos + 8, pos + 8 + size); break; }
    pos += 8 + size + (size % 2);
  }
  const bytes = fmt.bits / 8, frames = Math.floor(data.length / (bytes * fmt.channels));
  const channels = Array.from({length: fmt.channels}, () => new Float32Array(frames));
  for (let i = 0; i < frames; i++) for (let c = 0; c < fmt.channels; c++) {
    const o = (i * fmt.channels + c) * bytes;
    channels[c][i] = fmt.format === 3 ? data.readFloatLE(o) : data.readInt16LE(o) / 32768;
  }
  return {rate: fmt.rate, channels};
}

export function writeWav(path, rate, channels) {
  const frames = channels[0].length, n = channels.length;
  const b = Buffer.alloc(44 + frames * n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + frames * n * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(n, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * n * 2, 28); b.writeUInt16LE(n * 2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(frames * n * 2, 40);
  for (let i = 0; i < frames; i++) for (let c = 0; c < n; c++) {
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, channels[c][i])) * 32767), 44 + (i * n + c) * 2);
  }
  writeFileSync(path, b);
}
