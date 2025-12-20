import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { getToolContext } from "../context.js";
import { findRepoRoot } from "../../config/repoRoot.js";
import { defaultWorkspaceDir } from "../../config/paths.js";
import { guardWritePath } from "../guards/fsGuard.js";

type Args = {
  notebook_path?: string;
  new_source?: string;
  cell_id?: string;
  cell_type?: string;
  edit_mode?: string;
};

function ensureAllowedWriteTarget(absPath: string, repoRoot: string, workspaceDir: string): void {
  guardWritePath({ rawPath: absPath, repoRoot, workspaceDir, reason: "notebook_edit" });
}

function toSourceArray(s: string): string[] {
  const lines = s.split(/\r?\n/);
  return lines.map((l, idx) => (idx === lines.length - 1 ? l : l + "\n"));
}

function newCellId(): string {
  return crypto.randomBytes(4).toString("hex");
}

export async function notebookEditTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const notebookPath = String(args?.notebook_path || "").trim();
  const newSource = String(args?.new_source || "");
  const cellId = typeof args?.cell_id === "string" ? args.cell_id.trim() : "";
  const cellType = String(args?.cell_type || "code").trim().toLowerCase();
  const editMode = String(args?.edit_mode || "replace").trim().toLowerCase();

  if (!notebookPath) throw new Error("notebook_edit: missing args.notebook_path");
  if (!path.isAbsolute(notebookPath)) throw new Error("notebook_edit: notebook_path must be absolute");
  if (!newSource && newSource !== "") throw new Error("notebook_edit: missing args.new_source");
  if (!notebookPath.endsWith(".ipynb")) throw new Error("notebook_edit: file must end with .ipynb");

  const abs = path.resolve(notebookPath);
  const ctx = getToolContext();
  const repoRoot = path.resolve(ctx?.repoRoot ?? findRepoRoot());
  const workspaceDir = path.resolve(ctx?.workspaceDir ?? defaultWorkspaceDir());
  ensureAllowedWriteTarget(abs, repoRoot, workspaceDir);

  if (!fs.existsSync(abs)) throw new Error(`notebook_edit: notebook not found: ${abs}`);

  const raw = fs.readFileSync(abs, "utf8");
  let notebook: any;
  try {
    notebook = JSON.parse(raw);
  } catch (e) {
    throw new Error(`notebook_edit: invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }

  const cells: any[] = Array.isArray(notebook?.cells) ? notebook.cells : null;
  if (!cells) throw new Error("notebook_edit: invalid notebook format (missing cells array)");

  let cellIndex: number | null = null;
  if (cellId) {
    for (let i = 0; i < cells.length; i += 1) {
      if (String(cells[i]?.id || "") === cellId) {
        cellIndex = i;
        break;
      }
    }
    if (cellIndex == null && editMode !== "insert") throw new Error(`notebook_edit: cell_id not found: ${cellId}`);
  }

  const backupPath = `${abs}.backup`;
  fs.copyFileSync(abs, backupPath);

  let operation = "";
  if (editMode === "delete") {
    if (cellIndex == null) throw new Error("notebook_edit(delete): cell_id required");
    const deleted = cells.splice(cellIndex, 1)[0];
    operation = `Deleted cell ${cellId} (type: ${String(deleted?.cell_type || "unknown")})`;
  } else if (editMode === "insert") {
    const newCell: any = {
      cell_type: cellType === "markdown" ? "markdown" : "code",
      source: toSourceArray(newSource),
      metadata: {},
      id: newCellId()
    };
    if (newCell.cell_type === "code") {
      newCell.execution_count = null;
      newCell.outputs = [];
    }
    const insertPos = cellIndex != null ? cellIndex + 1 : cells.length;
    cells.splice(insertPos, 0, newCell);
    operation = `Inserted new ${newCell.cell_type} cell at position ${insertPos}`;
  } else {
    // replace
    if (cellIndex == null) throw new Error("notebook_edit(replace): cell_id required");
    const cell = cells[cellIndex] || {};
    cell.source = toSourceArray(newSource);
    if (cellType) {
      const desired = cellType === "markdown" ? "markdown" : "code";
      if (cell.cell_type !== desired) {
        cell.cell_type = desired;
        if (desired === "code") {
          if (!("execution_count" in cell)) cell.execution_count = null;
          if (!("outputs" in cell)) cell.outputs = [];
        } else {
          delete cell.execution_count;
          delete cell.outputs;
        }
      }
    }
    cells[cellIndex] = cell;
    operation = `Replaced cell ${cellId} content`;
  }

  const tmp = abs.replace(/\.ipynb$/i, ".tmp.ipynb");
  fs.writeFileSync(tmp, JSON.stringify(notebook, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, abs);

  return JSON.stringify(
    {
      ok: true,
      notebook_path: abs,
      backup_path: backupPath,
      operation,
      cell_count: cells.length,
      edit_mode: editMode
    },
    null,
    2
  );
}
