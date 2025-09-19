const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Pick a sensible default, you can change later in one place.
const DEFAULT_MODEL = "meta-llama/llama-3.3-8b-instruct:free";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function getAssistantReply(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Oration Career Chat (Dev)",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      max_tokens: 300,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("OpenRouter error:", res.status, text); // add this
    throw new Error(`OpenRouter API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content ?? "";
  return reply.trim();
}
