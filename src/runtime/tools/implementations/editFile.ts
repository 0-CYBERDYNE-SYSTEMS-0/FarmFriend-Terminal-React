import fs from "node:fs";
import path from "node:path";

import { getToolContext } from "../context.js";
import { findRepoRoot } from "../../config/repoRoot.js";
import { resolveWorkspaceDir } from "../../config/paths.js";
import { guardWritePath } from "../guards/fsGuard.js";

type Args = {
  file_path?: string;
  old_string?: string;
  new_string?: string;
  replace_all?: boolean;
};

export async function editFileTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const filePath = typeof args?.file_path === "string" ? args.file_path : "";
  const oldString = typeof args?.old_string === "string" ? args.old_string : "";
  const newString = typeof args?.new_string === "string" ? args.new_string : "";
  const replaceAll = !!args.replace_all;

  if (!path.isAbsolute(filePath)) throw new Error("edit_file: file_path must be absolute");
  if (oldString === newString) throw new Error("edit_file: new_string must differ from old_string");
  const ctx = getToolContext();
  const repoRoot = path.resolve(ctx?.repoRoot ?? findRepoRoot());
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
  guardWritePath({ rawPath: filePath, repoRoot, workspaceDir, reason: "edit_file" });

  const before = fs.readFileSync(filePath, "utf8");
  if (!before.includes(oldString)) throw new Error("edit_file: old_string not found in file");

  let after: string;
  if (replaceAll) {
    after = before.split(oldString).join(newString);
  } else {
    const idx = before.indexOf(oldString);
    after = before.slice(0, idx) + newString + before.slice(idx + oldString.length);
  }

  fs.writeFileSync(filePath, after, "utf8");
  return `Edited ${filePath}`;
}
