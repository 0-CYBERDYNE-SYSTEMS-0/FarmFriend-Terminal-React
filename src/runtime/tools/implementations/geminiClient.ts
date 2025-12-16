import fs from "node:fs";
import path from "node:path";

export type GeminiPart =
  | { text: string }
  | {
      inlineData: {
        mimeType: string;
        data: string; // base64
      };
    };

function geminiKey(): string {
  return String(process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
}

function normalizeModel(model: string): string {
  return model.replace(/^models\//, "").trim();
}

export async function geminiGenerateContent(params: {
  model: string;
  parts: GeminiPart[];
  apiKey?: string;
  signal?: AbortSignal;
}): Promise<any> {
  const key = (params.apiKey || geminiKey()).trim();
  if (!key) throw new Error("Gemini API key missing (set GOOGLE_GEMINI_API_KEY)");

  const model = normalizeModel(params.model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    contents: [{ role: "user", parts: params.parts }]
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: params.signal
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${text || res.statusText}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Gemini returned non-JSON: ${text.slice(0, 200)}`);
  }
}

export function extractGeminiText(resp: any): string {
  const parts: any[] = resp?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("");
}

export function extractGeminiInline(resp: any): Array<{ mimeType: string; data: string }> {
  const parts: any[] = resp?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return [];
  const out: Array<{ mimeType: string; data: string }> = [];
  for (const p of parts) {
    const inline = p?.inlineData || p?.inline_data;
    if (!inline) continue;
    const mimeType = String(inline.mimeType || inline.mime_type || "").trim();
    const data = String(inline.data || "").trim();
    if (mimeType && data) out.push({ mimeType, data });
  }
  return out;
}

export function readFileAsBase64(filePath: string): { mimeType: string; data: string } {
  const abs = path.resolve(filePath);
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const mimeType =
    ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".webp"
          ? "image/webp"
          : ext === ".gif"
            ? "image/gif"
            : "application/octet-stream";
  return { mimeType, data: buf.toString("base64") };
}

export function mimeToExt(mimeType: string): string {
  const m = mimeType.toLowerCase();
  if (m.includes("png")) return ".png";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  if (m.includes("webp")) return ".webp";
  if (m.includes("gif")) return ".gif";
  if (m.includes("mp4")) return ".mp4";
  return ".bin";
}

