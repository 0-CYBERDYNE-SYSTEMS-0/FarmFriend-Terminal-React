import fs from "node:fs";
import path from "node:path";
import { getToolContext } from "../context.js";

type DraftArgs = {
  command_slug?: string;
  description?: string;
  template?: string;
  tags?: string[];
};

type ApplyArgs = {
  draft_id?: string;
  force_overwrite?: boolean;
  cleanup_draft?: boolean;
};

function safeSlug(slugRaw: string): string {
  const s = slugRaw.trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,64}$/.test(s)) {
    throw new Error("command_draft: command_slug must be 2-64 chars of [a-z0-9_-]");
  }
  return s;
}

function buildCommandMarkdown(params: {
  slug: string;
  description: string;
  template: string;
  tags?: string[];
}): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`description: "${params.description}"`);
  if (params.tags?.length) {
    lines.push("tags:");
    for (const t of params.tags) lines.push(`  - ${t}`);
  }
  lines.push("---");
  lines.push("");
  lines.push(params.template.trimEnd());
  lines.push("");
  return lines.join("\n");
}

function draftsDir(workspaceDir: string): string {
  return path.join(workspaceDir, "commands", "_drafts");
}

function draftPath(workspaceDir: string, draftId: string): string {
  return path.join(draftsDir(workspaceDir), `${draftId}.json`);
}

export async function commandDraftTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as DraftArgs;
  const slug = safeSlug(String(args?.command_slug || ""));
  const description = String(args?.description || "").trim();
  const template = String(args?.template || "").trim();

  if (!description) throw new Error("command_draft: missing args.description");
  if (!template) throw new Error("command_draft: missing args.template");

  const tags = Array.isArray(args?.tags) ? args.tags.map(String).map((s) => s.trim()).filter(Boolean) : undefined;

  const commandMarkdown = buildCommandMarkdown({
    slug,
    description,
    template,
    tags
  });

  const ctx = getToolContext();
  const workspaceDir = ctx?.workspaceDir ? ctx.workspaceDir : process.cwd();
  fs.mkdirSync(draftsDir(workspaceDir), { recursive: true });

  const draft = {
    draft_id: slug,
    created_at: new Date().toISOString(),
    slug,
    description,
    tags,
    command_markdown: commandMarkdown
  };

  fs.writeFileSync(draftPath(workspaceDir, slug), JSON.stringify(draft, null, 2) + "\n", "utf8");

  return JSON.stringify(
    {
      ok: true,
      draft_id: slug,
      saved_to: draftPath(workspaceDir, slug),
      preview: commandMarkdown.slice(0, 1000) + (commandMarkdown.length > 1000 ? "\n...(truncated)" : "")
    },
    null,
    2
  );
}

export async function commandApplyTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as ApplyArgs;
  const draftId = String(args?.draft_id || "").trim();
  if (!draftId) throw new Error("command_apply: missing args.draft_id");

  const force = !!args?.force_overwrite;
  const cleanup = !!args?.cleanup_draft;

  const ctx = getToolContext();
  const workspaceDir = ctx?.workspaceDir ? ctx.workspaceDir : process.cwd();
  const p = draftPath(workspaceDir, draftId);

  if (!fs.existsSync(p)) throw new Error(`command_apply: draft not found: ${p}`);

  const draft = JSON.parse(fs.readFileSync(p, "utf8")) as any;
  const slug = safeSlug(String(draft?.slug || draftId));
  const commandMarkdown = String(draft?.command_markdown || "").trim();

  if (!commandMarkdown) throw new Error("command_apply: draft is missing command_markdown");

  const commandsDir = path.join(workspaceDir, "commands");
  fs.mkdirSync(commandsDir, { recursive: true });

  const commandPath = path.join(commandsDir, `${slug}.md`);
  if (fs.existsSync(commandPath)) {
    if (!force) throw new Error(`command_apply: destination exists: ${commandPath} (set force_overwrite=true to replace)`);
  }

  fs.writeFileSync(commandPath, commandMarkdown + "\n", "utf8");

  if (cleanup) {
    try {
      fs.rmSync(p, { force: true });
    } catch {
      // ignore cleanup errors
    }
  }

  return JSON.stringify(
    {
      ok: true,
      slug,
      command_path: commandPath,
      created_files: [commandPath],
      cleaned_up_draft: cleanup
    },
    null,
    2
  );
}
