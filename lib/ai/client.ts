import OpenAI from "openai";

export type AiClientResult =
  | { ok: true; client: OpenAI; model: string }
  | { ok: false; error: string };

export function getOpenAI(): AiClientResult {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "Add OPENAI_API_KEY to enable AI insights.",
    };
  }

  return {
    ok: true,
    client: new OpenAI({ apiKey }),
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
  };
}
