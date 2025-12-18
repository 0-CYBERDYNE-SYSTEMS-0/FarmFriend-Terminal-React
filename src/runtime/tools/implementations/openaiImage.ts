import fs from "node:fs";
import path from "node:path";
import { getToolContext } from "../context.js";
import { findRepoRoot } from "../../config/repoRoot.js";
import { defaultWorkspaceDir } from "../../config/paths.js";

type Args = { prompt?: string; style?: string; size?: string; quality?: string; moderation?: string; filename?: string };

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function safeFilenameBase(input: string): string {
  const s = input
    .trim()
    .slice(0, 40)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");
  return s || "image";
}

function enhancePrompt(prompt: string, style: string): string {
  const s = style.trim().toLowerCase();
  if (s === "coloring_book") {
    return (
      `${prompt}. Black and white line art, coloring book style, ` +
      `clean outlines, no shading, no color, perfect for coloring, ` +
      `detailed patterns, adult coloring book quality`
    );
  }
  if (s === "realistic") return `${prompt}. Photorealistic, high detail, professional photography quality`;
  if (s === "artistic") return `${prompt}. Artistic interpretation, creative style, expressive brushwork`;
  if (s === "cartoon") return `${prompt}. Cartoon style, animated, colorful, playful character design`;
  if (s === "abstract") return `${prompt}. Abstract art style, geometric shapes, modern composition`;
  if (s === "professional") return `${prompt}. Professional quality, clean design, business appropriate`;
  return prompt;
}

export async function generateImageOpenAITool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as Args;
  const prompt = String(args?.prompt || "").trim();
  if (!prompt) throw new Error("generate_image_openai: missing args.prompt");
  const style = String(args?.style || "realistic").trim();
  const size = String(args?.size || "1024x1024").trim();
  const quality = String(args?.quality || "medium").trim();
  const moderation = String(args?.moderation || "auto").trim();

  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("generate_image_openai: missing OPENAI_API_KEY (OpenRouter image fallback not implemented in TS build yet)");
  }

  const validSizes = new Set(["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"]);
  const useSize = validSizes.has(size) ? size : "1024x1024";

  const enhanced = enhancePrompt(prompt, style);

  const ctx = getToolContext();
  const repoRoot = path.resolve(ctx?.repoRoot ?? findRepoRoot());
  const workspaceDir = path.resolve(ctx?.workspaceDir ?? defaultWorkspaceDir());
  const outDir = path.join(workspaceDir, "generated-images");
  fs.mkdirSync(outDir, { recursive: true });

  const filenameBase = (String(args?.filename || "").trim() || `openai_${safeFilenameBase(prompt)}_${timestamp()}`).replace(/\.[a-z0-9]+$/i, "");
  const outPath = path.join(outDir, `${filenameBase}.png`);

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: enhanced,
      size: useSize,
      quality,
      moderation,
      n: 1
    }),
    signal
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`generate_image_openai: OpenAI error ${res.status}: ${text || res.statusText}`);

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`generate_image_openai: OpenAI returned non-JSON: ${text.slice(0, 200)}`);
  }

  const data0 = json?.data?.[0];
  if (!data0) throw new Error("generate_image_openai: missing response data");

  if (typeof data0.b64_json === "string" && data0.b64_json.trim()) {
    fs.writeFileSync(outPath, Buffer.from(data0.b64_json, "base64"));
  } else if (typeof data0.url === "string" && data0.url.trim()) {
    const imgRes = await fetch(data0.url, { method: "GET", signal });
    if (!imgRes.ok) throw new Error(`generate_image_openai: failed to download image url (${imgRes.status})`);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(outPath, buf);
  } else {
    throw new Error("generate_image_openai: response missing b64_json and url");
  }

  return JSON.stringify(
    {
      ok: true,
      provider: "openai",
      model: "gpt-image-1",
      image_path: outPath,
      original_prompt: prompt,
      prompt: enhanced,
      style,
      size: useSize,
      quality,
      moderation
    },
    null,
    2
  );
}

