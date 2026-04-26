import OpenAI from "openai";

const apiKey = process.env.AI_API_KEY;
const baseURL = process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1";
const model = process.env.AI_MODEL ?? "llama-3.3-70b-versatile";

if (!apiKey) {
  throw new Error("AI_API_KEY environment variable is required");
}

export const ai = new OpenAI({ apiKey, baseURL });
export const AI_MODEL = model;

export async function chatComplete(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.3,
): Promise<string> {
  const completion = await ai.chat.completions.create({
    model: AI_MODEL,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

export async function chatCompleteJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.3,
): Promise<T> {
  const text = await chatComplete(
    systemPrompt + "\n\nYou MUST respond with valid JSON only. No markdown, no explanation.",
    userPrompt,
    temperature,
  );

  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned) as T;
}
