import fs from "node:fs";
import path from "node:path";

import { getToolContext } from "../context.js";
import { listSkillStubs } from "./skills.js";
import { resolveWorkspaceDir } from "../../config/paths.js";

type DraftArgs = {
  skill_slug?: string;
  name?: string;
  summary?: string;
  description?: string;
  instructions?: string;
  triggers?: string[];
  tags?: string[];
  assets?: Record<string, string>;
  recommended_tools?: string[];
  author?: string;
  version?: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowed_tools?: string[] | string;
};

type ApplyArgs = { draft_id?: string; force_overwrite?: boolean; cleanup_draft?: boolean };

type SequencerArgs = { task?: string; sequence_type?: string; max_skills?: number; force_primary?: string };

function titleCaseSlug(slug: string): string {
  return slug
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

function safeSlug(slugRaw: string): string {
  const s = slugRaw.trim();
  if (!/^[a-z0-9_-]{2,64}$/.test(s)) {
    throw new Error("skill_draft: skill_slug must be 2-64 chars of [a-z0-9_-]");
  }
  return s;
}

function ensureRelPath(rel: string): void {
  if (!rel || rel.trim() !== rel) throw new Error("skill_draft: asset path must be a trimmed relative path");
  if (path.isAbsolute(rel)) throw new Error("skill_draft: asset path must be relative");
  const norm = rel.replace(/\\/g, "/");
  if (norm.includes("..")) throw new Error("skill_draft: asset path must not contain '..'");
  if (norm.startsWith("/")) throw new Error("skill_draft: asset path must not start with '/'");
}

function buildSkillMarkdown(params: {
  slug: string;
  name: string;
  summary: string;
  description: string;
  triggers?: string[];
  tags?: string[];
  recommended_tools?: string[];
  assets?: string[];
  author?: string;
  version: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowed_tools?: string[];
  instructions: string;
}): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`name: ${params.name}`);
  lines.push(`slug: ${params.slug}`);
  lines.push(`summary: ${params.summary}`);
  if (params.description) lines.push(`description: ${params.description}`);
  lines.push(`version: ${params.version}`);
  if (params.author) lines.push(`author: ${params.author}`);
  if (params.license) lines.push(`license: ${params.license}`);
  if (params.compatibility) lines.push(`compatibility: ${params.compatibility}`);
  if (params.metadata && Object.keys(params.metadata).length) {
    lines.push("metadata:");
    for (const [k, v] of Object.entries(params.metadata)) {
      lines.push(`  ${k}: ${v}`);
    }
  }
  if (params.allowed_tools?.length) {
    lines.push(`allowed-tools: ${params.allowed_tools.join(" ")}`);
  }
  if (params.tags?.length) {
    lines.push("tags:");
    for (const t of params.tags) lines.push(`  - ${t}`);
  }
  if (params.triggers?.length) {
    lines.push("triggers:");
    for (const t of params.triggers) lines.push(`  - ${t}`);
  }
  if (params.assets?.length) {
    lines.push("assets:");
    for (const a of params.assets) lines.push(`  - ${a}`);
  }
  if (params.recommended_tools?.length) {
    lines.push("recommended_tools:");
    for (const t of params.recommended_tools) lines.push(`  - ${t}`);
  }
  lines.push("---");
  lines.push("");
  lines.push(params.instructions.trimEnd());
  lines.push("");
  return lines.join("\n");
}

function draftsDir(workspaceDir: string): string {
  return path.join(workspaceDir, "skills", "_drafts");
}

function draftPath(workspaceDir: string, draftId: string): string {
  return path.join(draftsDir(workspaceDir), `${draftId}.json`);
}

export async function skillDraftTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as DraftArgs;
  const slug = safeSlug(String(args?.skill_slug || ""));
  const summary = String(args?.summary || "").trim();
  const instructions = String(args?.instructions || "").trim();
  if (!summary) throw new Error("skill_draft: missing args.summary");
  if (!instructions) throw new Error("skill_draft: missing args.instructions");

  const name = String(args?.name || "").trim() || titleCaseSlug(slug);
  const description = String(args?.description || "").trim() || summary;
  const version = String(args?.version || "").trim() || "0.1.0";
  const author = typeof args?.author === "string" ? args.author.trim() : undefined;
  const license = typeof args?.license === "string" ? args.license.trim() : undefined;
  const compatibility = typeof args?.compatibility === "string" ? args.compatibility.trim() : undefined;
  const metadata =
    args?.metadata && typeof args.metadata === "object" && !Array.isArray(args.metadata)
      ? Object.fromEntries(Object.entries(args.metadata).map(([k, v]) => [String(k), String(v)]))
      : undefined;
  const triggers = Array.isArray(args?.triggers) ? args.triggers.map(String).map((s) => s.trim()).filter(Boolean) : undefined;
  const tags = Array.isArray(args?.tags) ? args.tags.map(String).map((s) => s.trim()).filter(Boolean) : undefined;
  const recommended_tools = Array.isArray(args?.recommended_tools)
    ? args.recommended_tools.map(String).map((s) => s.trim()).filter(Boolean)
    : undefined;
  const allowed_tools = Array.isArray(args?.allowed_tools)
    ? args.allowed_tools.map(String).map((s) => s.trim()).filter(Boolean)
    : typeof args?.allowed_tools === "string"
      ? args.allowed_tools
          .split(/\s+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

  const assets: Record<string, string> = {};
  const assetPaths: string[] = [];
  if (args?.assets && typeof args.assets === "object") {
    for (const [relRaw, contentRaw] of Object.entries(args.assets)) {
      const rel = String(relRaw).trim();
      ensureRelPath(rel);
      const content = typeof contentRaw === "string" ? contentRaw : JSON.stringify(contentRaw, null, 2);
      assets[rel] = content;
      assetPaths.push(rel);
    }
  }

  const skillMarkdown = buildSkillMarkdown({
    slug,
    name,
    summary,
    description,
    triggers,
    tags,
    recommended_tools,
    assets: assetPaths.length ? assetPaths : undefined,
    author,
    version,
    license,
    compatibility,
    metadata,
    allowed_tools,
    instructions
  });

  const ctx = getToolContext();
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
  fs.mkdirSync(draftsDir(workspaceDir), { recursive: true });

  const draft = {
    draft_id: slug,
    created_at: new Date().toISOString(),
    slug,
    name,
    summary,
    description,
    version,
    author,
    license,
    compatibility,
    metadata,
    allowed_tools,
    triggers,
    tags,
    recommended_tools,
    assets,
    skill_markdown: skillMarkdown
  };

  fs.writeFileSync(draftPath(workspaceDir, slug), JSON.stringify(draft, null, 2) + "\n", "utf8");

  return JSON.stringify(
    {
      ok: true,
      draft_id: slug,
      saved_to: draftPath(workspaceDir, slug),
      preview: skillMarkdown.slice(0, 2000) + (skillMarkdown.length > 2000 ? "\n...(truncated)" : "")
    },
    null,
    2
  );
}

export async function skillApplyTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as ApplyArgs;
  const draftId = String(args?.draft_id || "").trim();
  if (!draftId) throw new Error("skill_apply: missing args.draft_id");
  const force = !!args?.force_overwrite;
  const cleanup = !!args?.cleanup_draft;

  const ctx = getToolContext();
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
  const p = draftPath(workspaceDir, draftId);
  if (!fs.existsSync(p)) throw new Error(`skill_apply: draft not found: ${p}`);

  const draft = JSON.parse(fs.readFileSync(p, "utf8")) as any;
  const slug = safeSlug(String(draft?.slug || draftId));
  const skillMarkdown = String(draft?.skill_markdown || "").trim();
  if (!skillMarkdown) throw new Error("skill_apply: draft is missing skill_markdown");

  const destDir = path.join(workspaceDir, "skills", slug);
  if (fs.existsSync(destDir)) {
    if (!force) throw new Error(`skill_apply: destination exists: ${destDir} (set force_overwrite=true to replace)`);
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  const created: string[] = [];
  const skillPath = path.join(destDir, "SKILL.md");
  fs.writeFileSync(skillPath, skillMarkdown + "\n", "utf8");
  created.push(skillPath);

  const assets: Record<string, string> = draft?.assets && typeof draft.assets === "object" ? draft.assets : {};
  for (const [rel, content] of Object.entries(assets)) {
    ensureRelPath(rel);
    const abs = path.join(destDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, String(content), "utf8");
    created.push(abs);
  }

  if (cleanup) {
    try {
      fs.rmSync(p, { force: true });
    } catch {
      // ignore
    }
  }

  return JSON.stringify({ ok: true, slug, skill_dir: destDir, created_files: created, cleaned_up_draft: cleanup }, null, 2);
}

export async function skillSequencerTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as SequencerArgs;
  const task = String(args?.task || "").trim();
  if (!task) throw new Error("skill_sequencer: missing args.task");
  const max = typeof args?.max_skills === "number" && args.max_skills > 0 ? Math.min(12, Math.floor(args.max_skills)) : 6;
  const forcePrimary = typeof args?.force_primary === "string" ? args.force_primary.trim() : "";
  const sequenceType = String(args?.sequence_type || "auto").trim().toLowerCase();

  const ctx = getToolContext();
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
  const stubs = listSkillStubs({ workspaceDir, repoRoot: ctx?.repoRoot });

  const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "you", "your", "are", "can", "will", "how", "what"]);
  const tokens = task
    .toLowerCase()
    .split(/[^a-z0-9_-]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP.has(t));
  const tokenSet = new Set(tokens);

  const score = (s: {
    slug: string;
    name?: string;
    summary?: string;
    description?: string;
    tags?: string[];
    triggers?: string[];
    priority?: string;
  }) => {
    const slugName = `${s.slug} ${s.name || ""}`.toLowerCase();
    const summaryDesc = `${s.summary || ""} ${s.description || ""}`.toLowerCase();
    const tags = (s.tags || []).join(" ").toLowerCase();
    const triggers = (s.triggers || []).join(" ").toLowerCase();
    let n = 0;
    for (const t of tokenSet) {
      if (triggers.includes(t)) n += 3;
      if (tags.includes(t)) n += 2;
      if (slugName.includes(t)) n += 2;
      if (summaryDesc.includes(t)) n += 1;
    }
    const pr = (s.priority || "").toLowerCase();
    if (pr === "high") n += 2;
    if (pr === "medium") n += 1;
    const prNum = Number(pr);
    if (!Number.isNaN(prNum)) n += Math.max(0, Math.min(5, prNum));
    return n;
  };

  const ranked = stubs
    .map((s) => ({ s, n: score(s) }))
    .sort((a, b) => b.n - a.n)
    .filter((x) => x.n > 0);

  const chosen: Array<{ slug: string; score: number; source: string; kind: string }> = [];

  if (forcePrimary) {
    const forced = stubs.find((s) => s.slug === forcePrimary);
    if (forced) chosen.push({ slug: forced.slug, score: 999, source: forced.source, kind: forced.kind });
  }

  for (const r of ranked) {
    if (chosen.find((c) => c.slug === r.s.slug)) continue;
    chosen.push({ slug: r.s.slug, score: r.n, source: r.s.source, kind: r.s.kind });
    if (chosen.length >= max) break;
  }

  const exec = ["sequential", "parallel", "hybrid", "auto"].includes(sequenceType) ? sequenceType : "auto";

  return JSON.stringify(
    {
      ok: true,
      task,
      sequence_type: exec,
      recommended: chosen,
      note:
        "This tool recommends a sequence; it does not execute skills automatically. Load a skill via skill_loader and follow its instructions."
    },
    null,
    2
  );
}
