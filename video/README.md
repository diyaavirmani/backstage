# Backstage — 45-second introduction video

An editable, scripted video project. Every shot is real Backstage footage recorded by Playwright against a local production build, using an isolated SQLite workspace and live Sanity, Knowledge Base and model services. The intro (0–6 s) is an illustration and is labelled as one.

## Deliverables (`video/out/`, not committed)

| File | Spec |
| --- | --- |
| `backstage-intro-1920x1080.mp4` | H.264 High, yuv420p, 30 fps, 1350 frames, AAC 48 kHz stereo 256 kb/s, 45.000 s, about −16 LUFS |
| `backstage-intro-1080x1920.mp4` | Vertical reframe with the same timing and mix: square-ish footage window, headline band, captions and labels repositioned |
| `backstage-intro-voiceover.wav` | Narration only, placed on the 45 s timeline (48 kHz, 16-bit) |
| `backstage-intro-captions.srt` | Captions from the final narration, matching the burned-in captions |

## Edit

`timeline.json` is the edit decision list:
- `vo` sets when each narration line starts.
- `captions` splits each line into on-screen parts.
- `sections` define the chapter chips and headlines.
- `shots` map an output range to a source range of a recording. Source times are action marks from `build/raw/events.json`; `offset` converts marks to video time. `cam` holds the zoom keys `[progress, scale, centerX, centerY]`, and `vdx` shifts the camera in the vertical edit only.
- `sfx` lists each sound effect with its time.

`compositor.html` draws one frame for a given time in either format. Change the timeline or the compositor and re-run the steps below.

## Rebuild

Requirements:
- Node and the repository's dependencies.
- ffmpeg/ffprobe: set `FFMPEG` and `FFPROBE`, or install `ffmpeg-static` and `ffprobe-static` under `VIDEO_TOOLS` (default `/tmp/vtools`).

```sh
# 1. Footage. Start a production build with an isolated database, then record it.
#    The organizer flow runs a live discovery, so it spends one search.
npm run build && cp -R .next/static .next/standalone/.next/ && cp -R public .next/standalone/
(cd .next/standalone && PORT=3130 HOSTNAME=127.0.0.1 APP_ORIGIN=http://127.0.0.1:3130 \
  BACKSTAGE_DB_PATH=$(mktemp -d)/video.sqlite node --env-file=../../.env.local server.js) &
node video/capture.mjs              # writes build/raw/{organizer,host}.webm, events.json and discovery.json
# 2. Narration. Run from the repository root, because it reads .env.local.
node video/tts.mjs && node video/trim-vo.mjs
# 3. Edit and mix
node video/extract.mjs              # 30 fps frames per shot
node video/audio.mjs                # music, SFX, ducking, voiceover stem and master
node video/render.mjs landscape && node video/render.mjs vertical
node video/finalize.mjs             # mux, captions, voiceover export and ffprobe verification
# Review stills without encoding: node video/render.mjs vertical 0 44.5  -> build/stills/
```

Recorded source times change on every capture, so update each shot's `src` range from the new `events.json` marks.

## Sound

- **Soundtrack:** original, synthesized by `audio.mjs` (120 BPM, A minor). It is a filtered intro, a groove from 6 s, a snare build into a "reading the Knowledge Base" break, a drop when results appear at 14.45 s, and a final chord with a hit on the wordmark at 41.5 s.
- **Ducking:** the music drops about 10 dB while narration is active (60 ms attack, 300 ms release).
- **SFX:** synthesized at the timeline's times: ticks on clicks, pops on selections, whooshes on transitions, chimes on saved or completed states, a lift when results appear, a riser and a final hit.

## Limitations

- The narration is AI-generated with OpenAI `gpt-4o-mini-tts` (voice `coral`). It is not a human voice actor.
- The mix was checked by measurement, not by ear:
  - integrated loudness, peaks, and narration-to-music level per line;
  - a transcription of the voiceover track (`node video/verify-vo.mjs`) matched the script word for word, including "Delhi NCR" and "Bengaluru".
  - Pronunciation quality and musical taste still need a human listen.
- The footage comes from a local production build of the `feat/judge-ready` code (PR #5) with live services and a throwaway database, not from the Railway deployment. The URL on the end frame is the deployed app.
- The host scenes use the demo's fictional hosts and role simulation, as the on-screen label says. The organizer's details are fictional (`organizer@example.test`).
