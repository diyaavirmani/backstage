import "../scripts/load-env.mjs";
import fs from "node:fs";
// Transcribes the final voiceover track so the spoken words can be checked against the script without listening.
const form = new FormData();
form.append("model", "gpt-4o-transcribe");
form.append("file", new Blob([fs.readFileSync(new URL("./out/backstage-intro-voiceover.wav", import.meta.url))], {type: "audio/wav"}), "voiceover.wav");
const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {method: "POST", headers: {Authorization: `Bearer ${process.env.OPENAI_API_KEY}`}, body: form});
if (!response.ok) throw new Error(`transcription failed: HTTP ${response.status}`);
console.log((await response.json()).text);
