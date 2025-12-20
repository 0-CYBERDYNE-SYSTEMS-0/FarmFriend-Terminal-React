import fs from "node:fs";
import path from "node:path";
import type { AgentConfig } from "../../agents/types.js";
import { getToolContext } from "../context.js";
import { saveAgentConfig } from "../../agents/loader.js";
import { resolveWorkspaceDir } from "../../config/paths.js";

type DraftArgs = {
  agent_id?: string;
  name?: string;
  description?: string;
  systemPromptAddition?: string;
  mode?: "auto" | "confirm" | "read_only" | "planning";
  allowedTools?: string[];
  deniedTools?: string[];
  maxTurns?: number;
  tags?: string[];
};

type ApplyArgs = {
  draft_id?: string;
  force_overwrite?: boolean;
  cleanup_draft?: boolean;
};

function safeAgentId(idRaw: string): string {
  const s = idRaw.trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,64}$/.test(s)) {
    throw new Error("agent_draft: agent_id must be 2-64 chars of [a-z0-9_-]");
  }
  return s;
}

function draftsDir(workspaceDir: string): string {
  return path.join(workspaceDir, "agents", "_drafts");
}

function draftPath(workspaceDir: string, draftId: string): string {
  return path.join(draftsDir(workspaceDir), `${draftId}.json`);
}

export async function agentDraftTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as DraftArgs;
  const agentId = safeAgentId(String(args?.agent_id || ""));
  const name = String(args?.name || "").trim();
  const description = String(args?.description || "").trim();
  const systemPromptAddition = String(args?.systemPromptAddition || "").trim();
  const mode = args?.mode || "auto";

  if (!name) throw new Error("agent_draft: missing args.name");
  if (!description) throw new Error("agent_draft: missing args.description");
  if (!systemPromptAddition) throw new Error("agent_draft: missing args.systemPromptAddition");

  const allowedTools = Array.isArray(args?.allowedTools)
    ? args.allowedTools.map(String).map((s) => s.trim()).filter(Boolean)
    : undefined;

  const deniedTools = Array.isArray(args?.deniedTools)
    ? args.deniedTools.map(String).map((s) => s.trim()).filter(Boolean)
    : undefined;

  const maxTurns = typeof args?.maxTurns === "number" && args.maxTurns > 0 ? Math.floor(args.maxTurns) : undefined;

  const tags = Array.isArray(args?.tags) ? args.tags.map(String).map((s) => s.trim()).filter(Boolean) : undefined;

  const ctx = getToolContext();
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
  fs.mkdirSync(draftsDir(workspaceDir), { recursive: true });

  const now = new Date().toISOString();

  const draft: Partial<AgentConfig> & { draft_id?: string; created_at?: string } = {
    id: agentId,
    name,
    description,
    systemPromptAddition,
    mode,
    model: "inherit",
    createdAt: now,
    updatedAt: now,
    draft_id: agentId,
    created_at: now
  };

  if (allowedTools) draft.allowedTools = allowedTools;
  if (deniedTools) draft.deniedTools = deniedTools;
  if (maxTurns) draft.maxTurns = maxTurns;
  if (tags) draft.tags = tags;

  fs.writeFileSync(draftPath(workspaceDir, agentId), JSON.stringify(draft, null, 2) + "\n", "utf8");

  const preview = JSON.stringify(
    {
      id: draft.id,
      name: draft.name,
      description: draft.description,
      mode: draft.mode,
      allowedTools: draft.allowedTools || "(none - all tools allowed)",
      deniedTools: draft.deniedTools || "(none)",
      tags: draft.tags || []
    },
    null,
    2
  );

  return JSON.stringify(
    {
      ok: true,
      draft_id: agentId,
      saved_to: draftPath(workspaceDir, agentId),
      preview
    },
    null,
    2
  );
}

export async function agentApplyTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as ApplyArgs;
  const draftId = String(args?.draft_id || "").trim();
  if (!draftId) throw new Error("agent_apply: missing args.draft_id");

  const force = !!args?.force_overwrite;
  const cleanup = !!args?.cleanup_draft;

  const ctx = getToolContext();
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
  const p = draftPath(workspaceDir, draftId);

  if (!fs.existsSync(p)) throw new Error(`agent_apply: draft not found: ${p}`);

  const draft = JSON.parse(fs.readFileSync(p, "utf8")) as any;
  const agentId = safeAgentId(String(draft?.id || draft?.agent_id || draftId));

  const agentConfig: AgentConfig = {
    id: agentId,
    name: String(draft?.name || "").trim(),
    description: String(draft?.description || "").trim(),
    systemPromptAddition: String(draft?.systemPromptAddition || "").trim(),
    mode: draft?.mode || "auto",
    model: draft?.model || "inherit",
    maxTurns: draft?.maxTurns,
    createdAt: draft?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (draft?.allowedTools && Array.isArray(draft.allowedTools)) {
    agentConfig.allowedTools = draft.allowedTools;
  }

  if (draft?.deniedTools && Array.isArray(draft.deniedTools)) {
    agentConfig.deniedTools = draft.deniedTools;
  }

  if (draft?.tags && Array.isArray(draft.tags)) {
    agentConfig.tags = draft.tags;
  }

  const result = saveAgentConfig(workspaceDir, agentConfig);

  if (!result.success) {
    throw new Error(`agent_apply: Failed to save agent config: ${result.error}`);
  }

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
      agent_id: agentId,
      agent_config_path: result.path,
      created_files: [result.path],
      cleaned_up_draft: cleanup
    },
    null,
    2
  );
}
