import "../scripts/load-env.mjs";
import fs from "node:fs";
// Generates one narration file per line with OpenAI text-to-speech (server key from ignored .env.local).
const config = JSON.parse(fs.readFileSync(new URL("./narration.json", import.meta.url), "utf8"));
const only = process.argv[2];
for (const line of config.lines.filter((item) => !only || item.id === only)) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json"},
    body: JSON.stringify({model: config.model, voice: config.voice, input: line.text, instructions: config.instructions, response_format: "wav"}),
  });
  if (!response.ok) throw new Error(`TTS ${line.id} failed: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
  fs.writeFileSync(new URL(`./build/vo/${line.id}.wav`, import.meta.url), Buffer.from(await response.arrayBuffer()));
  console.log(`generated ${line.id}`);
}
