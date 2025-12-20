import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { getToolContext } from "../context.js";
import { readMountsConfig } from "../../config/mounts.js";
import { resolveWorkspaceDir } from "../../config/paths.js";

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
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowed_tools?: string[];
  priority?: string;
  tags?: string[];
  triggers?: string[];
  assets?: string[];
  recommended_tools?: string[];
  validation_warnings?: string[];
};

export type SkillStub = {
  slug: string;
  name?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  triggers?: string[];
  priority?: string;
  allowed_tools?: string[];
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
  return { meta: parseFrontmatterYaml(fm), body };
}

function looksLikeSkillSlug(s: string): boolean {
  return /^[a-z0-9-]{1,64}$/.test(s);
}

function looksLikeSpecName(s: string): boolean {
  if (!/^[a-z0-9-]{1,64}$/.test(s)) return false;
  if (s.startsWith("-") || s.endsWith("-")) return false;
  if (s.includes("--")) return false;
  return true;
}

function parseFrontmatterYaml(fm: string): Record<string, any> {
  const lines = fm.replace(/\r\n/g, "\n").split("\n");
  const out: Record<string, any> = {};

  const peekNextNonEmpty = (start: number): { line: string; indent: number } | null => {
    for (let i = start; i < lines.length; i += 1) {
      const raw = lines[i];
      if (!raw.trim()) continue;
      const indent = raw.match(/^\s*/)?.[0]?.length ?? 0;
      return { line: raw, indent };
    }
    return null;
  };

  const parseScalar = (raw: string): string => {
    const v = raw.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
    return v;
  };

  const parseMultiline = (start: number, baseIndent: number, style: "|" | ">"): { value: string; next: number } => {
    const parts: string[] = [];
    let i = start;
    let minIndent: number | null = null;
    for (; i < lines.length; i += 1) {
      const raw = lines[i];
      if (!raw.trim()) {
        parts.push("");
        continue;
      }
      const indent = raw.match(/^\s*/)?.[0]?.length ?? 0;
      if (indent <= baseIndent) break;
      if (minIndent === null || indent < minIndent) minIndent = indent;
      parts.push(raw);
    }
    const trimIndent = minIndent ?? baseIndent + 1;
    const normalized = parts.map((line) => (line ? line.slice(trimIndent).trimEnd() : ""));
    const value = style === ">" ? normalized.join(" ").trim() : normalized.join("\n").replace(/\s+$/g, "");
    return { value, next: i };
  };

  const parseList = (start: number, baseIndent: number): { value: string[]; next: number } => {
    const items: string[] = [];
    let i = start;
    for (; i < lines.length; i += 1) {
      const raw = lines[i];
      if (!raw.trim()) continue;
      const indent = raw.match(/^\s*/)?.[0]?.length ?? 0;
      if (indent <= baseIndent) break;
      const trimmed = raw.trimStart();
      if (!trimmed.startsWith("- ")) break;
      items.push(parseScalar(trimmed.slice(2)));
    }
    return { value: items, next: i };
  };

  const parseMap = (start: number, baseIndent: number): { value: Record<string, string>; next: number } => {
    const obj: Record<string, string> = {};
    let i = start;
    for (; i < lines.length; i += 1) {
      const raw = lines[i];
      if (!raw.trim()) continue;
      const indent = raw.match(/^\s*/)?.[0]?.length ?? 0;
      if (indent <= baseIndent) break;
      const line = raw.trimEnd();
      const m = line.match(/^([A-Za-z0-9_/-]+):\s*(.*)$/);
      if (!m) continue;
      const [, k, vRaw] = m;
      obj[k] = parseScalar(vRaw);
    }
    return { value: obj, next: i };
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const indent = raw.match(/^\s*/)?.[0]?.length ?? 0;
    if (indent > 0) continue;
    const line = raw.trimEnd();
    const m = line.match(/^([A-Za-z0-9_/-]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, vRaw] = m;
    const v = vRaw.trim();
    if (v === "|" || v === ">") {
      const multi = parseMultiline(i + 1, indent, v as "|" | ">");
      out[key] = multi.value;
      i = multi.next - 1;
      continue;
    }
    if (v === "") {
      const next = peekNextNonEmpty(i + 1);
      if (!next || next.indent <= indent) {
        out[key] = "";
        continue;
      }
      if (next.line.trimStart().startsWith("- ")) {
        const list = parseList(i + 1, indent);
        out[key] = list.value;
        i = list.next - 1;
        continue;
      }
      const map = parseMap(i + 1, indent);
      out[key] = map.value;
      i = map.next - 1;
      continue;
    }
    out[key] = parseScalar(v);
  }

  return out;
}

function normalizeAllowedTools(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    const out = raw.map((v) => String(v).trim()).filter(Boolean);
    return out.length ? out : undefined;
  }
  if (typeof raw === "string") {
    const out = raw
      .split(/\s+/)
      .map((v) => v.trim())
      .filter(Boolean);
    return out.length ? out : undefined;
  }
  return undefined;
}

function normalizeMetadata(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[String(k)] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function validateSkillMeta(meta: SkillMeta, dirName?: string): string[] {
  const warnings: string[] = [];
  const name = typeof meta.name === "string" ? meta.name.trim() : "";
  const desc = typeof meta.description === "string" ? meta.description.trim() : "";

  if (!name) warnings.push("Missing required frontmatter field: name");
  if (name && !looksLikeSpecName(name)) {
    warnings.push("Frontmatter name does not meet spec (1-64 chars, lowercase alnum + hyphen, no leading/trailing or consecutive hyphens)");
  }
  if (name && dirName && name !== dirName) warnings.push("Frontmatter name does not match parent directory name");

  if (!desc) warnings.push("Missing required frontmatter field: description");
  if (desc && desc.length > 1024) warnings.push("Description exceeds 1024 characters");

  if (meta.compatibility && meta.compatibility.length > 500) warnings.push("Compatibility exceeds 500 characters");

  if (meta.metadata && Object.values(meta.metadata).some((v) => typeof v !== "string")) {
    warnings.push("Metadata should be a map of string keys to string values");
  }
  if (meta.allowed_tools && meta.allowed_tools.length === 0) warnings.push("allowed-tools is present but empty");
  return warnings;
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
  const allowedTools = normalizeAllowedTools(meta["allowed-tools"] ?? meta["allowed_tools"]);
  const metadata = normalizeMetadata(meta.metadata);
  const compatibility = typeof meta.compatibility === "string" ? meta.compatibility : undefined;
  const license = typeof meta.license === "string" ? meta.license : undefined;
  const out: SkillMeta = {
    name: typeof meta.name === "string" ? meta.name : undefined,
    slug: resolvedSlug,
    summary: typeof meta.summary === "string" ? meta.summary : undefined,
    description: typeof meta.description === "string" ? meta.description : undefined,
    version: typeof meta.version === "string" ? meta.version : undefined,
    author: typeof meta.author === "string" ? meta.author : undefined,
    license,
    compatibility,
    metadata,
    allowed_tools: allowedTools,
    priority: typeof meta.priority === "string" ? meta.priority : undefined,
    tags: Array.isArray(meta.tags) ? meta.tags : undefined,
    triggers: Array.isArray(meta.triggers) ? meta.triggers : undefined,
    assets: Array.isArray(meta.assets) ? meta.assets : undefined,
    recommended_tools: Array.isArray(meta.recommended_tools) ? meta.recommended_tools : undefined
  };
  const warnings = validateSkillMeta(out, dirName);
  if (warnings.length) out.validation_warnings = warnings;
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
  const allowedTools = normalizeAllowedTools(meta["allowed-tools"] ?? meta["allowed_tools"]);
  const metadata = normalizeMetadata(meta.metadata);
  const compatibility = typeof meta.compatibility === "string" ? meta.compatibility : undefined;
  const license = typeof meta.license === "string" ? meta.license : undefined;
  const out: SkillMeta = {
    name,
    slug,
    summary,
    description: typeof meta.description === "string" ? meta.description : undefined,
    version: typeof meta.version === "string" ? meta.version : undefined,
    author: typeof meta.author === "string" ? meta.author : undefined,
    license,
    compatibility,
    metadata,
    allowed_tools: allowedTools,
    priority: typeof meta.priority === "string" ? meta.priority : undefined,
    tags: Array.isArray(meta.tags) ? meta.tags : undefined,
    triggers: Array.isArray(meta.triggers) ? meta.triggers : undefined,
    assets: Array.isArray(meta.assets) ? meta.assets : undefined,
    recommended_tools: Array.isArray(meta.recommended_tools) ? meta.recommended_tools : undefined
  };
  const warnings = validateSkillMeta(out, path.basename(path.dirname(params.filePath)));
  if (warnings.length) out.validation_warnings = warnings;
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
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
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
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
  const roots = getSkillRoots({ workspaceDir, repoRoot: ctx?.repoRoot });

  const slug = typeof args.skill_slug === "string" ? args.skill_slug.trim() : "";
  const format = String(args.format || "markdown").trim().toLowerCase();
  const list = listAllSkills(roots).map((s) => ({
    slug: String(s.meta.slug || ""),
    name: s.meta.name,
    summary: s.meta.summary,
    description: s.meta.description,
    tags: s.meta.tags,
    triggers: s.meta.triggers,
    priority: s.meta.priority,
    allowed_tools: s.meta.allowed_tools,
    compatibility: s.meta.compatibility,
    license: s.meta.license,
    validation_warnings: s.meta.validation_warnings,
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
    tags: s.meta.tags,
    triggers: s.meta.triggers,
    priority: s.meta.priority,
    allowed_tools: s.meta.allowed_tools,
    path: s.skillPath,
    source_root: s.root,
    source: s.rootLabel,
    kind: s.rootKind
  }));
}

export async function skillImportTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as ImportArgs & { source?: string; force_overwrite?: boolean; skill_name?: string };
  const sourcePath =
    typeof args?.source_path === "string"
      ? args.source_path.trim()
      : typeof args?.source === "string"
        ? args.source.trim()
        : "";
  const overwrite = typeof args?.overwrite === "boolean" ? args.overwrite : !!args?.force_overwrite;
  const requestedName = typeof args?.skill_name === "string" ? args.skill_name.trim() : "";
  if (!sourcePath) throw new Error("skill_import: missing args.source_path or args.source");

  const ctx = getToolContext();
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
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
  const slug =
    requestedName ||
    (typeof meta.slug === "string" && meta.slug.trim() ? meta.slug.trim() : path.basename(src));
  if (!slug) throw new Error("skill_import: missing skill slug (skill_name or frontmatter slug)");

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
