import fs from "node:fs";
import path from "node:path";
import { getToolContext } from "../context.js";

type Args = {
  action?: "status" | "enable" | "disable" | "stats" | "sessions" | "force_complete" | "cleanup" | "feedback_stats" | string;
  agent_id?: string;
  session_id?: string;
};

type Store = {
  enabled: boolean;
  updated_at: string;
  sessions: Array<{ id: string; created_at: string; notes?: string }>;
};

function readStore(p: string): Store {
  if (!fs.existsSync(p)) return { enabled: true, updated_at: new Date().toISOString(), sessions: [] };
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as Store;
  } catch {
    return { enabled: true, updated_at: new Date().toISOString(), sessions: [] };
  }
}

function writeStore(p: string, store: Store): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(store, null, 2) + "\n", "utf8");
}

export async function completionValidationTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const action = String(args?.action || "").trim().toLowerCase();
  if (!action) throw new Error("completion_validation: missing args.action");

  const ctx = getToolContext();
  const workspaceDir = ctx?.workspaceDir ? ctx.workspaceDir : process.cwd();
  const storePath = path.join(workspaceDir, "completion_validation.json");
  const store = readStore(storePath);
  const now = new Date().toISOString();

  if (action === "status") {
    return JSON.stringify({ enabled: store.enabled, updated_at: store.updated_at, session_count: store.sessions.length }, null, 2);
  }

  if (action === "enable") {
    store.enabled = true;
    store.updated_at = now;
    writeStore(storePath, store);
    return JSON.stringify({ ok: true, enabled: store.enabled }, null, 2);
  }

  if (action === "disable") {
    store.enabled = false;
    store.updated_at = now;
    writeStore(storePath, store);
    return JSON.stringify({ ok: true, enabled: store.enabled }, null, 2);
  }

  if (action === "stats") {
    return JSON.stringify(
      { enabled: store.enabled, updated_at: store.updated_at, session_count: store.sessions.length, note: "TS port: enforcement not implemented yet" },
      null,
      2
    );
  }

  if (action === "sessions") {
    return JSON.stringify({ sessions: store.sessions }, null, 2);
  }

  if (action === "cleanup") {
    store.sessions = [];
    store.updated_at = now;
    writeStore(storePath, store);
    return JSON.stringify({ ok: true, cleaned: true }, null, 2);
  }

  // Other actions are placeholders for parity; return a clear message so the agent can adapt.
  return JSON.stringify(
    {
      ok: false,
      action,
      note: "TS port: this completion_validation action is not implemented yet",
      supported_actions: ["status", "enable", "disable", "stats", "sessions", "cleanup"]
    },
    null,
    2
  );
}

