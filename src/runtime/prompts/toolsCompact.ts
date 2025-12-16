import { OpenAIToolSchema } from "../tools/toolSchemas.js";

export function buildToolsCompact(toolSchemas: OpenAIToolSchema[]): string {
  // Keep this readable in a system prompt: name + one-line description.
  const lines: string[] = [];
  for (const t of toolSchemas) {
    const fn = t.function;
    const desc = (fn.description || "").replace(/\s+/g, " ").trim();
    lines.push(`- \`${fn.name}\` — ${desc || "No description"}`);
  }
  return lines.join("\n");
}

