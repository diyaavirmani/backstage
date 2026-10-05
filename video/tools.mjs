// Resolves the ffmpeg binary: FFMPEG env var, else ffmpeg-static from VIDEO_TOOLS (default /tmp/vtools), else PATH.
import {existsSync} from 'node:fs';
import {join} from 'node:path';

const tools = process.env.VIDEO_TOOLS || '/tmp/vtools';
const bundled = join(tools, 'node_modules/ffmpeg-static/ffmpeg');
export const ffmpeg = process.env.FFMPEG || (existsSync(bundled) ? bundled : 'ffmpeg');
const probeArch = join(tools, 'node_modules/ffprobe-static/bin/darwin', process.arch, 'ffprobe');
export const ffprobe = process.env.FFPROBE || (existsSync(probeArch) ? probeArch : 'ffprobe');
