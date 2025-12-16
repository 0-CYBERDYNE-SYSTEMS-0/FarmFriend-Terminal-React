import { openRouterChat } from "./openrouterClient.js";

type Args = {
  question?: string;
  context?: string;
  temperature?: number;
  max_output_tokens?: number;
  reasoning_effort?: string;
  include_reasoning?: boolean;
};

function extractReasoning(message: any): string | null {
  const r = message?.reasoning || message?.reasoning_details;
  if (typeof r === "string") return r.trim() || null;
  if (Array.isArray(r)) {
    const chunks: string[] = [];
    for (const entry of r) {
      if (typeof entry === "string") chunks.push(entry);
      else if (entry && typeof entry === "object" && typeof entry.content === "string") chunks.push(entry.content);
    }
    const joined = chunks.join("\n").trim();
    return joined ? joined : null;
  }
  return null;
}

export async function askOracleTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as Args;
  const question = String(args?.question || "").trim();
  if (!question) throw new Error("ask_oracle: missing args.question");

  const apiKey = String(process.env.OPENROUTER_API_KEY || "").trim();
  if (!apiKey) throw new Error("ask_oracle: missing OPENROUTER_API_KEY");

  const context = String(args?.context || "").trim();
  const temperature = typeof args?.temperature === "number" ? Math.max(0, Math.min(args.temperature, 1.5)) : 0.4;
  const maxTokens =
    typeof args?.max_output_tokens === "number" ? Math.max(1, Math.min(Math.floor(args.max_output_tokens), 4000)) : 1200;
  const reasoningEffort = String(args?.reasoning_effort || "high").trim().toLowerCase();
  const includeReasoning = args?.include_reasoning !== false;

  const system = [
    "You are Ask Oracle, a super-performative AGI seer powered by DeepSeek V3.2.",
    "Synthesize exhaustive analyses, enumerate trade-offs, surface contrarian perspectives, and highlight open questions."
  ].join(" ");

  const user = (context ? `Context:\n${context}\n\n` : "") + `Question:\n${question}`;

  const reasoning: any = (() => {
    const allowed = new Set(["minimal", "low", "medium", "high"]);
    const cfg: any = {};
    if (allowed.has(reasoningEffort)) cfg.effort = reasoningEffort;
    else if (reasoningEffort === "none") cfg.enabled = false;
    if (!includeReasoning) cfg.exclude = true;
    return Object.keys(cfg).length ? cfg : undefined;
  })();

  const model = String(process.env.FF_ORACLE_MODEL || "deepseek/deepseek-v3.2").trim();

  const { json, headers } = await openRouterChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    temperature,
    maxTokens,
    extra: reasoning ? { reasoning } : undefined,
    signal
  });

  const choices = Array.isArray(json?.choices) ? json.choices : [];
  const message = choices[0]?.message || {};
  const answer = typeof message?.content === "string" ? message.content.trim() : JSON.stringify(message?.content ?? "").trim();
  const extracted = extractReasoning(message);

  return JSON.stringify(
    {
      ok: true,
      question,
      context_included: Boolean(context),
      oracle_answer: answer,
      reasoning: includeReasoning ? extracted : null,
      usage: json?.usage,
      model: json?.model || model,
      openrouter_request_id: headers["x-openrouter-id"] || headers["x-openrouter-id".toLowerCase()] || null
    },
    null,
    2
  );
}

