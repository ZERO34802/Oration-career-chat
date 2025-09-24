// src/server/llm.ts

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "meta-llama/llama-3.3-8b-instruct:free";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// 1) Single place to edit the counselor style
export const CAREER_SYSTEM_PROMPT =
  "You are a practical, encouraging career counselor. Ask clarifying questions when needed and provide concrete, step-by-step guidance (skills, resources, next steps). Keep answers concise and actionable.";

// 2) Build final prompt with system + recent context
export function buildCounselorPrompt(history: ChatMessage[], maxTurns = 25): ChatMessage[] {
  // Keep only the most recent turns (excluding system if present)
  const nonSystem = history.filter((m) => m.role !== "system");
  const recent = nonSystem.slice(-maxTurns);
  return [{ role: "system", content: CAREER_SYSTEM_PROMPT }, ...recent];
}

// 3) Call OpenRouter and return assistant text
export async function getAssistantReply(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3001",
      "X-Title": "Oration Career Chat",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      max_tokens: 500,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("OpenRouter error:", res.status, text);
    throw new Error(`OpenRouter API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const reply: string = data?.choices?.[0]?.message?.content ?? "";
  return reply.trim();
}
