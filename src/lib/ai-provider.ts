import "server-only";
import { createOpenAI } from "@ai-sdk/openai";

/** Provider construction is request-scoped so builds do not need credentials. */
export function getBackstageModel() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith("replace-with")) {
    throw new Error("OPENAI_API_KEY is missing. Add it to the server-side environment before requesting venue recommendations.");
  }

  const provider = createOpenAI({ apiKey });
  return provider(process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini");
}
