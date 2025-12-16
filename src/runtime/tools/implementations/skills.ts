import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { getToolContext } from "../context.js";
import { readMountsConfig } from "../../config/mounts.js";

type LoaderArgs = { skill_slug?: string; include_assets?: boolean };
type DocArgs = { skill_slug?: string; format?: "markdown" | "html" | "json" | string; output_file?: string; include_examples?: boolean };
type ImportArgs = { source_path?: string; overwrite?: boolean };

type SkillMeta = {
  name?: string;
  slug?: string;
  summary?: string;
  description?: string;
  version?: string;
  author?: string;
  priority?: string;
  tags?: string[];
  triggers?: string[];
  assets?: string[];
  recommended_tools?: string[];
};

export type SkillStub = {
  slug: string;
  name?: string;
  summary?: string;
  description?: string;
  path: string;
  source_root: string;
  source: string;
  kind: SkillRecord["rootKind"];
};

type SkillRecord = {
  root: string;
  rootLabel: string;
  rootKind: "skills" | "markdown_commands";
  dir: string;
  skillPath: string;
  meta: SkillMeta;
  body: string;
};

function bundledSkillsRoot(): string {
  // `.../src/runtime/tools/implementations/skills.ts` -> up 4 = `ff-terminal-ts/`
  const here = path.dirname(fileURLToPath(import.meta.url));
  const ffTerminalTsDir = path.resolve(here, "../../../..");
  return path.join(ffTerminalTsDir, "skills");
}

function normalizeRoot(p: string): string {
  return path.resolve(p);
}

function labelRoot(params: { root: string; workspaceDir?: string; bundledRoot: string }): string {
  const root = normalizeRoot(params.root);
  const bundled = normalizeRoot(params.bundledRoot);
  const workspace = params.workspaceDir ? normalizeRoot(params.workspaceDir) : null;
  if (workspace && root === normalizeRoot(path.join(workspace, "skills"))) return "workspace";
  if (root === bundled) return "bundled";
  return "external";
}

function isEnabledEnv(v: unknown): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "y", "on"].includes(s);
}

function parseSkillsPathsEnv(raw: string): string[] {
  const parts = raw
    .split(path.delimiter)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    const abs = normalizeRoot(p);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      out.push(abs);
      continue;
    }
    const nested = path.join(abs, "skills");
    if (fs.existsSync(nested) && fs.statSync(nested).isDirectory()) out.push(nested);
  }
  return out;
}

function getSkillRoots(params: { workspaceDir?: string; repoRoot?: string }): Array<{ root: string; rootLabel: string; rootKind: SkillRecord["rootKind"] }> {
  const bundledRoot = bundledSkillsRoot();
  const roots: Array<{ root: string; rootKind: SkillRecord["rootKind"] }> = [];

  if (params.workspaceDir) roots.push({ root: path.join(params.workspaceDir, "skills"), rootKind: "skills" });
  roots.push({ root: bundledRoot, rootKind: "skills" });

  // External mounts are opt-in (read-only) via ~/.ff-terminal/config.json.
  // This keeps FF-Terminal contained by default while allowing interop.
  const mounts = readMountsConfig();

  // Claude Code commonly stores Skills under:
  // - Personal: `~/.claude/skills/`
  // - Project: `.claude/skills/`
  if (mounts.mounts.claude) {
    roots.push({ root: path.join(os.homedir(), ".claude", "skills"), rootKind: "skills" });
    if (params.repoRoot) roots.push({ root: path.join(params.repoRoot, ".claude", "skills"), rootKind: "skills" });
  }

  // Factory/Droid-style skills: `~/.factory/skills/`
  if (mounts.mounts.factory) {
    roots.push({ root: path.join(os.homedir(), ".factory", "skills"), rootKind: "skills" });
  }

  // Optional extra explicit mounts from config (advanced).
  if (Array.isArray(mounts.extra_skill_dirs) && mounts.extra_skill_dirs.length) {
    for (const p of mounts.extra_skill_dirs) {
      const abs = normalizeRoot(String(p));
      if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
        roots.push({ root: abs, rootKind: "skills" });
      } else {
        const nested = path.join(abs, "skills");
        if (fs.existsSync(nested) && fs.statSync(nested).isDirectory()) roots.push({ root: nested, rootKind: "skills" });
      }
    }
  }

  const env = String(process.env.FF_SKILLS_PATHS || "").trim();
  if (env) roots.push(...parseSkillsPathsEnv(env).map((r) => ({ root: r, rootKind: "skills" as const })));

  // Optional compatibility: allow reading Claude Code custom slash commands as skills.
  // Claude stores custom commands as markdown files:
  // - Project: `.claude/commands/`
  // - Personal: `~/.claude/commands/`
  // We do not mutate these; we only read them when explicitly enabled.
  if (isEnabledEnv(process.env.FF_SKILLS_INCLUDE_CLAUDE_COMMANDS)) {
    roots.push({ root: path.join(os.homedir(), ".claude", "commands"), rootKind: "markdown_commands" });
    if (params.repoRoot) roots.push({ root: path.join(params.repoRoot, ".claude", "commands"), rootKind: "markdown_commands" });
  }

  const uniq: Array<{ root: string; rootKind: SkillRecord["rootKind"] }> = [];
  for (const r of roots) {
    const root = normalizeRoot(r.root);
    if (uniq.some((u) => normalizeRoot(u.root) === root && u.rootKind === r.rootKind)) continue;
    uniq.push({ root, rootKind: r.rootKind });
  }

  return uniq.map((r) => ({
    root: r.root,
    rootLabel: labelRoot({ root: r.root, workspaceDir: params.workspaceDir, bundledRoot }),
    rootKind: r.rootKind
  }));
}

function splitFrontmatter(markdown: string): { meta: Record<string, any>; body: string } {
  const s = markdown.trimStart();
  if (!s.startsWith("---\n") && !s.startsWith("---\r\n")) return { meta: {}, body: markdown };
  const normalized = s.replace(/\r\n/g, "\n");
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) return { meta: {}, body: markdown };
  const fm = normalized.slice(4, end).trim();
  const body = normalized.slice(end + "\n---\n".length);

  // Minimal YAML-ish parser for the SKILL.md frontmatter (supports scalars + simple lists).
  const meta: Record<string, any> = {};
  let currentListKey: string | null = null;
  let currentScalarKey: string | null = null;
  for (const rawLine of fm.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    // Support basic multiline scalar values by appending indented continuation lines.
    // Example:
    // description: |
    //   line 1
    //   line 2
    if (currentScalarKey && /^\s{2,}\S/.test(rawLine) && !line.trimStart().startsWith("- ")) {
      const prev = typeof meta[currentScalarKey] === "string" ? meta[currentScalarKey] : "";
      meta[currentScalarKey] = (prev ? prev + "\n" : "") + rawLine.trim();
      continue;
    }

    if (line.startsWith("- ") && currentListKey) {
      meta[currentListKey] = Array.isArray(meta[currentListKey]) ? meta[currentListKey] : [];
      meta[currentListKey].push(line.slice(2).trim());
      continue;
    }
    const m = line.match(/^([A-Za-z0-9_/-]+):\s*(.*)$/);
    if (!m) continue;
    const [, k, vRaw] = m;
    const v = vRaw.trim();
    if (v === "") {
      // list starts on next lines
      meta[k] = [];
      currentListKey = k;
      currentScalarKey = null;
      continue;
    }
    currentScalarKey = k;
    currentListKey = null;
    // Strip surrounding quotes
    const unquoted = (v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")) ? v.slice(1, -1) : v;
    meta[k] = unquoted;
  }

  return { meta, body };
}

function looksLikeSkillSlug(s: string): boolean {
  return /^[a-z0-9-]{2,64}$/.test(s);
}

function parseSkillAtDir(params: { root: string; rootLabel: string; dir: string }): SkillRecord | null {
  const skillPath = path.join(params.dir, "SKILL.md");
  if (!fs.existsSync(skillPath) || !fs.statSync(skillPath).isFile()) return null;
  const raw = fs.readFileSync(skillPath, "utf8");
  const { meta, body } = splitFrontmatter(raw);
  const fmSlug = typeof meta.slug === "string" ? meta.slug : undefined;
  const fmName = typeof meta.name === "string" ? meta.name : undefined;
  const dirName = path.basename(params.dir);
  const resolvedSlug = fmSlug || (fmName && looksLikeSkillSlug(fmName) ? fmName : undefined) || dirName;
  const out: SkillMeta = {
    name: typeof meta.name === "string" ? meta.name : undefined,
    slug: resolvedSlug,
    summary: typeof meta.summary === "string" ? meta.summary : undefined,
    description: typeof meta.description === "string" ? meta.description : undefined,
    version: typeof meta.version === "string" ? meta.version : undefined,
    author: typeof meta.author === "string" ? meta.author : undefined,
    priority: typeof meta.priority === "string" ? meta.priority : undefined,
    tags: Array.isArray(meta.tags) ? meta.tags : undefined,
    triggers: Array.isArray(meta.triggers) ? meta.triggers : undefined,
    assets: Array.isArray(meta.assets) ? meta.assets : undefined,
    recommended_tools: Array.isArray(meta.recommended_tools) ? meta.recommended_tools : undefined
  };
  return { root: params.root, rootLabel: params.rootLabel, rootKind: "skills", dir: params.dir, skillPath, meta: out, body };
}

function parseMarkdownCommandFile(params: { root: string; rootLabel: string; filePath: string }): SkillRecord | null {
  if (!fs.existsSync(params.filePath) || !fs.statSync(params.filePath).isFile()) return null;
  if (!params.filePath.toLowerCase().endsWith(".md")) return null;
  const raw = fs.readFileSync(params.filePath, "utf8");
  const { meta, body } = splitFrontmatter(raw);
  const base = path.basename(params.filePath, path.extname(params.filePath));
  const metaName = typeof meta.name === "string" ? meta.name.trim() : "";
  const slug =
    (typeof meta.slug === "string" && meta.slug.trim() ? meta.slug.trim() : "") ||
    (metaName && looksLikeSkillSlug(metaName) ? metaName : "") ||
    base;
  const name = typeof meta.name === "string" ? meta.name : undefined;
  const summary =
    typeof meta.summary === "string"
      ? meta.summary
      : typeof meta.description === "string"
        ? meta.description
        : undefined;
  const out: SkillMeta = {
    name,
    slug,
    summary,
    description: typeof meta.description === "string" ? meta.description : undefined,
    version: typeof meta.version === "string" ? meta.version : undefined,
    author: typeof meta.author === "string" ? meta.author : undefined,
    priority: typeof meta.priority === "string" ? meta.priority : undefined,
    tags: Array.isArray(meta.tags) ? meta.tags : undefined,
    triggers: Array.isArray(meta.triggers) ? meta.triggers : undefined,
    assets: Array.isArray(meta.assets) ? meta.assets : undefined,
    recommended_tools: Array.isArray(meta.recommended_tools) ? meta.recommended_tools : undefined
  };
  return {
    root: params.root,
    rootLabel: params.rootLabel,
    rootKind: "markdown_commands",
    dir: path.dirname(params.filePath),
    skillPath: params.filePath,
    meta: out,
    body
  };
}

function iterSkillsInRoot(params: { root: string; rootLabel: string; rootKind: SkillRecord["rootKind"] }): SkillRecord[] {
  if (!fs.existsSync(params.root) || !fs.statSync(params.root).isDirectory()) return [];
  const out: SkillRecord[] = [];

  if (params.rootKind === "skills") {
    const entries = fs.readdirSync(params.root, { withFileTypes: true }).filter((e) => e.isDirectory());
    for (const e of entries) {
      const dir = path.join(params.root, e.name);
      const rec = parseSkillAtDir({ root: params.root, rootLabel: params.rootLabel, dir });
      if (rec) out.push(rec);
    }
    return out;
  }

  // markdown_commands: each `*.md` file is treated as a skill-like document.
  const entries = fs.readdirSync(params.root, { withFileTypes: true }).filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".md"));
  for (const e of entries) {
    const p = path.join(params.root, e.name);
    const rec = parseMarkdownCommandFile({ root: params.root, rootLabel: params.rootLabel, filePath: p });
    if (rec) out.push(rec);
  }
  return out;
}

function listAllSkills(roots: Array<{ root: string; rootLabel: string; rootKind: SkillRecord["rootKind"] }>): SkillRecord[] {
  const all: SkillRecord[] = [];
  for (const r of roots) all.push(...iterSkillsInRoot(r));
  all.sort((a, b) => String(a.meta.slug || "").localeCompare(String(b.meta.slug || "")));
  return all;
}

function findSkillBySlug(roots: Array<{ root: string; rootLabel: string; rootKind: SkillRecord["rootKind"] }>, slug: string): SkillRecord | null {
  for (const r of roots) {
    for (const rec of iterSkillsInRoot(r)) {
      const fmSlug = rec.meta.slug || path.basename(rec.dir);
      if (fmSlug === slug || path.basename(rec.dir) === slug) return rec;
    }
  }
  return null;
}

export async function skillLoaderTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as LoaderArgs;
  const slug = typeof args?.skill_slug === "string" ? args.skill_slug.trim() : "";
  if (!slug) throw new Error("skill_loader: missing args.skill_slug");

  const ctx = getToolContext();
  const workspaceDir = ctx?.workspaceDir;
  const roots = getSkillRoots({ workspaceDir, repoRoot: ctx?.repoRoot });

  const found = findSkillBySlug(roots, slug);
  if (!found) throw new Error(`skill_loader: skill not found: ${slug}`);

  const assets: Record<string, string> = {};
  if (found.rootKind === "skills" && args.include_assets && found.meta.assets?.length) {
    const MAX_TOTAL = 150_000;
    let total = 0;
    for (const rel of found.meta.assets) {
      const p = path.join(found.dir, rel);
      if (!fs.existsSync(p) || !fs.statSync(p).isFile()) continue;
      const content = fs.readFileSync(p, "utf8");
      total += content.length;
      if (total > MAX_TOTAL) break;
      assets[rel] = content;
    }
  }

  return JSON.stringify(
    {
      skill: {
        ...found.meta,
        path: found.skillPath,
        source_root: found.root,
        source: found.rootLabel,
        kind: found.rootKind
      },
      content: fs.readFileSync(found.skillPath, "utf8"),
      assets: Object.keys(assets).length ? assets : undefined
    },
    null,
    2
  );
}

export async function skillDocumentationTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as DocArgs;
  const ctx = getToolContext();
  const workspaceDir = ctx?.workspaceDir ? ctx.workspaceDir : process.cwd();
  const roots = getSkillRoots({ workspaceDir: ctx?.workspaceDir, repoRoot: ctx?.repoRoot });

  const slug = typeof args.skill_slug === "string" ? args.skill_slug.trim() : "";
  const format = String(args.format || "markdown").trim().toLowerCase();
  const list = listAllSkills(roots).map((s) => ({
    slug: String(s.meta.slug || ""),
    name: s.meta.name,
    summary: s.meta.summary,
    path: s.skillPath,
    source_root: s.root,
    source: s.rootLabel,
    kind: s.rootKind
  }));
  const filtered = slug ? list.filter((s) => s.slug === slug) : list;

  if (!filtered.length) throw new Error(slug ? `skill_documentation: skill not found: ${slug}` : "skill_documentation: no skills found");

  let out: string;
  if (format === "json") {
    out = JSON.stringify({ skills: filtered }, null, 2);
  } else if (format === "html") {
    const items = filtered
      .map(
        (s) =>
          `<li><code>${s.slug}</code>${s.name ? ` — ${s.name}` : ""}${s.summary ? `: ${s.summary}` : ""} <small>(${s.source})</small></li>`
      )
      .join("");
    out = `<!doctype html><html><body><h1>Skills</h1><ul>${items}</ul></body></html>`;
  } else {
    out =
      `# Skills\n\n` +
      filtered
        .map((s) => `- \`${s.slug}\`${s.name ? ` — ${s.name}` : ""}${s.summary ? `: ${s.summary}` : ""} _(source: ${s.source})_`)
        .join("\n") +
      "\n";
  }

  const outputFile = typeof args.output_file === "string" ? args.output_file.trim() : "";
  if (outputFile) {
    const abs = path.resolve(outputFile);
    const ws = path.resolve(workspaceDir);
    if (!abs.startsWith(ws + path.sep) && abs !== ws) {
      throw new Error(`skill_documentation: output_file must be under workspaceDir (${ws})`);
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, out, "utf8");
    return JSON.stringify({ ok: true, saved_to: abs }, null, 2);
  }

  return out;
}

export function listSkillStubs(params: { workspaceDir?: string; repoRoot?: string }): SkillStub[] {
  const roots = getSkillRoots({ workspaceDir: params.workspaceDir, repoRoot: params.repoRoot });
  return listAllSkills(roots).map((s) => ({
    slug: String(s.meta.slug || ""),
    name: s.meta.name,
    summary: s.meta.summary,
    description: s.meta.description,
    path: s.skillPath,
    source_root: s.root,
    source: s.rootLabel,
    kind: s.rootKind
  }));
}

export async function skillImportTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as ImportArgs;
  const sourcePath = typeof args?.source_path === "string" ? args.source_path.trim() : "";
  const overwrite = !!args?.overwrite;
  if (!sourcePath) throw new Error("skill_import: missing args.source_path");

  const ctx = getToolContext();
  const workspaceDir = ctx?.workspaceDir ? ctx.workspaceDir : process.cwd();
  const destRoot = path.join(workspaceDir, "skills");

  let src = path.resolve(sourcePath);
  if (!fs.existsSync(src)) throw new Error(`skill_import: source_path not found: ${src}`);
  if (fs.statSync(src).isFile()) {
    if (path.basename(src).toLowerCase() !== "skill.md") throw new Error("skill_import: if source_path is a file, it must be SKILL.md");
    src = path.dirname(src);
  }
  const srcSkill = path.join(src, "SKILL.md");
  if (!fs.existsSync(srcSkill) || !fs.statSync(srcSkill).isFile()) throw new Error(`skill_import: missing SKILL.md in ${src}`);

  const raw = fs.readFileSync(srcSkill, "utf8");
  const { meta } = splitFrontmatter(raw);
  const slug = typeof meta.slug === "string" && meta.slug.trim() ? meta.slug.trim() : path.basename(src);

  const destDir = path.join(destRoot, slug);
  if (fs.existsSync(destDir)) {
    if (!overwrite) throw new Error(`skill_import: destination exists: ${destDir} (set overwrite=true to replace)`);
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  // Copy only regular files/dirs; skip node_modules-like noise if present.
  const copyDir = (from: string, to: string) => {
    fs.mkdirSync(to, { recursive: true });
    for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name === ".git") continue;
      const fp = path.join(from, ent.name);
      const tp = path.join(to, ent.name);
      if (ent.isDirectory()) copyDir(fp, tp);
      else if (ent.isFile()) fs.copyFileSync(fp, tp);
    }
  };

  copyDir(src, destDir);

  return JSON.stringify({ ok: true, imported_from: src, saved_to: destDir, slug }, null, 2);
}
