import fs from "node:fs";
import path from "node:path";

import { getToolContext } from "../context.js";
import { findRepoRoot } from "../../config/repoRoot.js";
import { resolveWorkspaceDir } from "../../config/paths.js";
import { guardWritePath } from "../guards/fsGuard.js";

type Edit = { old_string: string; new_string: string; replace_all?: boolean };

type Args = {
  file_path?: string;
  edits?: unknown[];
};

function parseEdit(e: unknown): Edit {
  if (typeof e === "string") {
    try {
      const parsed = JSON.parse(e) as any;
      return parseEdit(parsed);
    } catch {
      throw new Error("multi_edit_file: edits must be objects (or JSON strings) with old_string/new_string");
    }
  }
  if (!e || typeof e !== "object") throw new Error("multi_edit_file: invalid edit entry");
  const obj = e as any;
  if (typeof obj.old_string !== "string" || typeof obj.new_string !== "string") {
    throw new Error("multi_edit_file: each edit requires old_string and new_string");
  }
  return { old_string: obj.old_string, new_string: obj.new_string, replace_all: !!obj.replace_all };
}

export async function multiEditFileTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const filePath = typeof args?.file_path === "string" ? args.file_path : "";
  if (!path.isAbsolute(filePath)) throw new Error("multi_edit_file: file_path must be absolute");
  const ctx = getToolContext();
  const repoRoot = path.resolve(ctx?.repoRoot ?? findRepoRoot());
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
  guardWritePath({ rawPath: filePath, repoRoot, workspaceDir, reason: "multi_edit_file" });

  const editsRaw = Array.isArray(args.edits) ? args.edits : [];
  if (!editsRaw.length) throw new Error("multi_edit_file: missing edits");

  const edits = editsRaw.map(parseEdit);

  let content = fs.readFileSync(filePath, "utf8");
  for (const e of edits) {
    if (e.old_string === e.new_string) throw new Error("multi_edit_file: new_string must differ from old_string");
    if (!content.includes(e.old_string)) throw new Error("multi_edit_file: old_string not found in file");
    if (e.replace_all) content = content.split(e.old_string).join(e.new_string);
    else {
      const idx = content.indexOf(e.old_string);
      content = content.slice(0, idx) + e.new_string + content.slice(idx + e.old_string.length);
    }
  }

  fs.writeFileSync(filePath, content, "utf8");
  return `Edited ${filePath} (${edits.length} changes)`;
}
