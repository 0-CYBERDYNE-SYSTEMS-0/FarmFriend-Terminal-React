import fs from "node:fs";
import path from "node:path";

import { getToolContext } from "../context.js";
import { resolveWorkspaceDir } from "../../config/paths.js";

type Args = {
  dry_run?: boolean;
  age_days?: number;
  max_file_size_mb?: number;
  delete_temp?: boolean;
  delete_logs?: boolean;
  workspace_path?: string;
};

function resolveWorkspace(params: { workspaceDir: string; workspacePath?: string }): string {
  const raw = String(params.workspacePath || "").trim();
  if (!raw) return path.resolve(params.workspaceDir);
  const abs = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(params.workspaceDir, raw);
  const ws = path.resolve(params.workspaceDir);
  if (!(abs === ws || abs.startsWith(ws + path.sep))) {
    throw new Error(`smart_cleanup: blocked (workspace_path must be under the ff-terminal workspace)\n- workspace: ${ws}\n- got: ${abs}`);
  }
  return abs;
}

function walkFiles(root: string): string[] {
  const out: string[] = [];
  const stack: string[] = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        // Never touch git metadata if workspace is inside a repo.
        if (e.name === ".git") continue;
        stack.push(p);
      } else if (e.isFile()) {
        out.push(p);
      }
    }
  }
  return out;
}

export async function smartCleanupTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const dryRun = args?.dry_run !== false;
  const ageDays = typeof args?.age_days === "number" ? Math.max(0, Math.floor(args.age_days)) : 0;
  const maxMb = typeof args?.max_file_size_mb === "number" ? Math.max(0, Math.floor(args.max_file_size_mb)) : 0;
  const deleteTemp = !!args?.delete_temp;
  const deleteLogs = !!args?.delete_logs;

  const ctx = getToolContext();
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
  const root = resolveWorkspace({ workspaceDir, workspacePath: args?.workspace_path });

  const now = Date.now();
  const minMtime = ageDays > 0 ? now - ageDays * 24 * 60 * 60 * 1000 : null;
  const maxBytes = maxMb > 0 ? maxMb * 1024 * 1024 : null;

  const deletions: Array<{ path: string; reason: string; size: number; mtime_ms: number }> = [];

  const consider = (filePath: string) => {
    const rel = path.relative(root, filePath).replace(/\\/g, "/");
    // Preserve core workspace state.
    if (rel === "tasks.json" || rel === "memory_core/session_summary.md") return;
    if (rel.startsWith("sessions/tasks/") && rel.endsWith(".json")) return;
    if (rel.startsWith("skills/") && rel.includes("/SKILL.md")) return;

    const st = fs.statSync(filePath);
    const reasons: string[] = [];
    if (minMtime != null && st.mtimeMs < minMtime) reasons.push(`older_than_${ageDays}d`);
    if (maxBytes != null && st.size > maxBytes) reasons.push(`larger_than_${maxMb}mb`);

    if (deleteLogs) {
      if (rel.startsWith("logs/") || rel.endsWith(".log") || rel.endsWith(".jsonl")) reasons.push("log_cleanup");
    }
    if (deleteTemp) {
      if (rel.startsWith("temp/") || rel.includes("/temp/")) reasons.push("temp_cleanup");
    }

    if (!reasons.length) return;
    deletions.push({ path: filePath, reason: reasons.join(","), size: st.size, mtime_ms: st.mtimeMs });
  };

  for (const f of walkFiles(root)) {
    try {
      consider(f);
    } catch {
      // ignore
    }
  }

  deletions.sort((a, b) => b.mtime_ms - a.mtime_ms);

  const deleted: string[] = [];
  if (!dryRun) {
    for (const d of deletions) {
      try {
        fs.rmSync(d.path, { force: true });
        deleted.push(d.path);
      } catch {
        // ignore
      }
    }
  }

  return JSON.stringify(
    {
      ok: true,
      dry_run: dryRun,
      workspace_root: root,
      candidates: deletions.slice(0, 500),
      deleted: dryRun ? undefined : deleted,
      note: dryRun ? "Set dry_run=false to delete candidates." : undefined
    },
    null,
    2
  );
}
