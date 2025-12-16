import fs from "node:fs";
import path from "node:path";

import { getToolContext } from "../context.js";
import { defaultWorkspaceDir } from "../../config/paths.js";
import { findRepoRoot } from "../../config/repoRoot.js";
import { extractGeminiInline, extractGeminiText, geminiGenerateContent, mimeToExt, readFileAsBase64 } from "./geminiClient.js";
import { openRouterChat } from "./openrouterClient.js";

function workspaceGeneratedImagesDir(workspaceDir: string): string {
  return path.join(workspaceDir, "generated-images");
}

function safeFilenameBase(input: string): string {
  const s = input
    .trim()
    .slice(0, 40)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");
  return s || "image";
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function writeBase64ToFile(params: { workspaceDir: string; filenameBase: string; mimeType: string; base64: string }): string {
  const dir = workspaceGeneratedImagesDir(params.workspaceDir);
  fs.mkdirSync(dir, { recursive: true });
  const ext = mimeToExt(params.mimeType);
  const p = path.join(dir, `${params.filenameBase}${ext}`);
  fs.writeFileSync(p, Buffer.from(params.base64, "base64"));
  return p;
}

function geminiImageModel(): string {
  return String(process.env.FF_GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview").trim();
}

function geminiVideoModel(): string {
  return String(process.env.FF_GEMINI_VIDEO_MODEL || "gemini-2.5-flash").trim();
}

async function openRouterFallbackImageToFile(params: {
  apiKey: string;
  model: string;
  prompt: string;
  workspaceDir: string;
  filenameBase: string;
  signal: AbortSignal;
}): Promise<{ imagePath?: string; raw?: any }> {
  const { json } = await openRouterChat({
    apiKey: params.apiKey,
    model: params.model,
    messages: [
      {
        role: "system",
        content:
          "You are an image generation endpoint. Return ONLY a data URL (data:image/png;base64,...) in the message content. No extra text."
      },
      { role: "user", content: params.prompt }
    ],
    temperature: 0.2,
    maxTokens: 2000,
    signal: params.signal
  });

  const msg = json?.choices?.[0]?.message;
  const content = msg?.content;
  const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((b: any) => b?.text || "").join("") : "";
  const m = text.match(/data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)\s*/);
  if (!m) return { raw: json };
  const mimeType = m[1]!;
  const base64 = m[2]!;
  const imagePath = writeBase64ToFile({ workspaceDir: params.workspaceDir, filenameBase: params.filenameBase, mimeType, base64 });
  return { imagePath, raw: json };
}

export async function generateImageGeminiTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as { prompt?: string; additional_details?: string; filename?: string };
  const prompt = String(args?.prompt || "").trim();
  const details = String(args?.additional_details || "").trim();
  if (!prompt) throw new Error("generate_image_gemini: missing args.prompt");

  const ctx = getToolContext();
  const repoRoot = ctx?.repoRoot ? ctx.repoRoot : findRepoRoot();
  const workspaceDir = ctx?.workspaceDir ? ctx.workspaceDir : defaultWorkspaceDir(repoRoot);

  const filenameBase = (String(args?.filename || "").trim() || `gemini_${safeFilenameBase(prompt)}_${timestamp()}`).replace(/\.[a-z0-9]+$/i, "");
  const fullPrompt = details ? `${prompt}\n\nAdditional details:\n${details}` : prompt;

  const apiKey = String(process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    const orKey = String(process.env.OPENROUTER_API_KEY || "").trim();
    if (!orKey) throw new Error("generate_image_gemini: missing GOOGLE_GEMINI_API_KEY (and no OPENROUTER_API_KEY fallback available)");
    const fallbackModel = String(process.env.FF_OPENROUTER_GEMINI_IMAGE_MODEL || "google/gemini-2.5-flash-image").trim();
    const fallback = await openRouterFallbackImageToFile({
      apiKey: orKey,
      model: fallbackModel,
      prompt: fullPrompt,
      workspaceDir,
      filenameBase,
      signal
    });
    if (!fallback.imagePath) {
      throw new Error(
        `generate_image_gemini: Gemini key missing and OpenRouter fallback model did not return an image. Set GOOGLE_GEMINI_API_KEY or adjust FF_OPENROUTER_GEMINI_IMAGE_MODEL.`
      );
    }
    return JSON.stringify({ ok: true, provider: "openrouter_fallback", model: fallbackModel, image_path: fallback.imagePath }, null, 2);
  }

  const resp = await geminiGenerateContent({
    model: geminiImageModel(),
    parts: [{ text: fullPrompt }],
    apiKey,
    signal
  });

  const images = extractGeminiInline(resp);
  if (!images.length) {
    const text = extractGeminiText(resp);
    throw new Error(
      `generate_image_gemini: Gemini returned no inline image data.\ntext=${text ? text.slice(0, 200) : "(none)"}`
    );
  }

  const image = images[0]!;
  const imagePath = writeBase64ToFile({ workspaceDir, filenameBase, mimeType: image.mimeType, base64: image.data });
  return JSON.stringify({ ok: true, provider: "gemini", model: geminiImageModel(), image_path: imagePath }, null, 2);
}

export async function analyzeImageGeminiTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as { image_path?: string; analysis_type?: string; question?: string; focus_areas?: string };
  const imagePath = String(args?.image_path || "").trim();
  if (!imagePath) throw new Error("analyze_image_gemini: missing args.image_path");
  const analysisType = String(args?.analysis_type || "general").trim();
  const question = String(args?.question || "").trim();
  const focus = String(args?.focus_areas || "").trim();

  const ctx = getToolContext();
  const repoRoot = ctx?.repoRoot ? ctx.repoRoot : findRepoRoot();
  const workspaceDir = ctx?.workspaceDir ? ctx.workspaceDir : defaultWorkspaceDir(repoRoot);

  const prompt =
    analysisType === "qa" && question
      ? `Answer this question about the image: ${question}`
      : `Analyze this image (${analysisType}).` + (focus ? ` Focus on: ${focus}` : "");

  const apiKey = String(process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    const orKey = String(process.env.OPENROUTER_API_KEY || "").trim();
    if (!orKey) throw new Error("analyze_image_gemini: missing GOOGLE_GEMINI_API_KEY (and no OPENROUTER_API_KEY fallback available)");
    const model = String(process.env.FF_OPENROUTER_GEMINI_VISION_MODEL || "google/gemini-2.0-flash-001").trim();
    const file = readFileAsBase64(imagePath);
    const { json } = await openRouterChat({
      apiKey: orKey,
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${file.mimeType};base64,${file.data}` } }
          ]
        }
      ],
      temperature: 0.2,
      maxTokens: 1200,
      signal
    });
    const answer = json?.choices?.[0]?.message?.content;
    return JSON.stringify({ ok: true, provider: "openrouter_fallback", model, analysis: answer }, null, 2);
  }

  const file = readFileAsBase64(imagePath);
  const resp = await geminiGenerateContent({
    model: geminiImageModel(),
    parts: [{ text: prompt }, { inlineData: { mimeType: file.mimeType, data: file.data } }],
    apiKey,
    signal
  });
  const text = extractGeminiText(resp);
  if (!text) throw new Error("analyze_image_gemini: Gemini returned no text");
  return JSON.stringify({ ok: true, provider: "gemini", model: geminiImageModel(), analysis: text, image_path: path.resolve(imagePath) }, null, 2);
}

export async function editImageGeminiTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as { input_image_path?: string; edit_instructions?: string; context?: string; filename?: string };
  const inputImagePath = String(args?.input_image_path || "").trim();
  const editInstructions = String(args?.edit_instructions || "").trim();
  const context = String(args?.context || "").trim();
  if (!inputImagePath) throw new Error("edit_image_gemini: missing args.input_image_path");
  if (!editInstructions) throw new Error("edit_image_gemini: missing args.edit_instructions");

  const ctx = getToolContext();
  const repoRoot = ctx?.repoRoot ? ctx.repoRoot : findRepoRoot();
  const workspaceDir = ctx?.workspaceDir ? ctx.workspaceDir : defaultWorkspaceDir(repoRoot);

  const filenameBase =
    (String(args?.filename || "").trim() || `edited_${safeFilenameBase(path.basename(inputImagePath))}_${timestamp()}`).replace(/\.[a-z0-9]+$/i, "");

  const prompt = context
    ? `Edit this image. Context: ${context}\n\nInstructions: ${editInstructions}`
    : `Edit this image.\n\nInstructions: ${editInstructions}`;

  const apiKey = String(process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("edit_image_gemini: missing GOOGLE_GEMINI_API_KEY (OpenRouter fallback not supported for edits yet)");

  const file = readFileAsBase64(inputImagePath);
  const resp = await geminiGenerateContent({
    model: geminiImageModel(),
    parts: [{ text: prompt }, { inlineData: { mimeType: file.mimeType, data: file.data } }],
    apiKey,
    signal
  });

  const images = extractGeminiInline(resp);
  if (!images.length) {
    const text = extractGeminiText(resp);
    throw new Error(`edit_image_gemini: Gemini returned no inline image data.\ntext=${text ? text.slice(0, 200) : "(none)"}`);
  }
  const image = images[0]!;
  const editedPath = writeBase64ToFile({ workspaceDir, filenameBase, mimeType: image.mimeType, base64: image.data });
  return JSON.stringify(
    { ok: true, provider: "gemini", model: geminiImageModel(), edited_image_path: editedPath, original_image_path: path.resolve(inputImagePath) },
    null,
    2
  );
}

export async function analyzeVideoGeminiTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as { video_source?: string; prompt?: string; wait_for_processing?: boolean };
  const videoSource = String(args?.video_source || "").trim();
  if (!videoSource) throw new Error("analyze_video_gemini: missing args.video_source");
  const prompt = String(args?.prompt || "Analyze and describe what you see in this video in detail.").trim();

  if (/^https?:\/\//i.test(videoSource)) {
    return JSON.stringify(
      {
        ok: false,
        error: "YouTube/remote URLs are not supported in this TS build yet. Provide a local video file path.",
        video_source: videoSource
      },
      null,
      2
    );
  }

  const abs = path.resolve(videoSource);
  if (!fs.existsSync(abs)) throw new Error(`analyze_video_gemini: file not found: ${abs}`);
  const st = fs.statSync(abs);
  const maxMb = Number(process.env.FF_GEMINI_VIDEO_MAX_MB || 20);
  if (st.size > maxMb * 1024 * 1024) {
    throw new Error(`analyze_video_gemini: file too large for inline upload in TS build (${(st.size / 1024 / 1024).toFixed(1)}MB > ${maxMb}MB)`);
  }

  const apiKey = String(process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("analyze_video_gemini: missing GOOGLE_GEMINI_API_KEY (OpenRouter fallback not supported for video yet)");

  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const mimeType = ext === ".mp4" ? "video/mp4" : "application/octet-stream";

  const resp = await geminiGenerateContent({
    model: geminiVideoModel(),
    parts: [{ text: prompt }, { inlineData: { mimeType, data: buf.toString("base64") } }],
    apiKey,
    signal
  });

  const text = extractGeminiText(resp);
  if (!text) throw new Error("analyze_video_gemini: Gemini returned no text");
  return JSON.stringify(
    { ok: true, provider: "gemini", model: geminiVideoModel(), analysis: text, video_source: abs, file_size_mb: Number((st.size / 1024 / 1024).toFixed(2)) },
    null,
    2
  );
}

