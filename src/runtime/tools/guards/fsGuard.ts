import fs from "node:fs";
import path from "node:path";

export const WORKSPACE_ALLOWED_DIRS = [
  "agents",
  "commands",
  "skills",
  "logs",
  "memory_core",
  "projects",
  "thoughts",
  "todos",
  "generated-images",
  "sessions",
  "imessage_sessions"
];

export const WORKSPACE_ALLOWED_ROOT_FILES = [
  "tasks.json",
  "completion_validation.json"
];

function normalizeDir(p: string): string {
  const resolved = path.resolve(p);
  return resolved.endsWith(path.sep) ? resolved : resolved + path.sep;
}

function resolveRealPathForWrite(absPath: string): string {
  let probe = absPath;
  const suffixParts: string[] = [];

  while (!fs.existsSync(probe)) {
    const parent = path.dirname(probe);
    if (parent === probe) break;
    suffixParts.unshift(path.basename(probe));
    probe = parent;
  }

  const base = fs.existsSync(probe) ? fs.realpathSync(probe) : probe;
  return suffixParts.length ? path.join(base, ...suffixParts) : base;
}

function isWithinRoot(target: string, root: string): boolean {
  const normalizedRoot = normalizeDir(root);
  return target === normalizedRoot.slice(0, -1) || target.startsWith(normalizedRoot);
}

function isAllowedWorkspacePath(targetAbs: string, workspaceDir: string): boolean {
  const rel = path.relative(workspaceDir, targetAbs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
  const [top] = rel.split(path.sep);
  if (!top || top === ".") return false;
  if (WORKSPACE_ALLOWED_DIRS.includes(top)) return true;
  if (WORKSPACE_ALLOWED_ROOT_FILES.includes(top) && rel === top) return true;
  return false;
}

export function guardWritePath(params: {
  rawPath: string;
  repoRoot: string;
  workspaceDir: string;
  reason: string;
  allowRepoWrites?: boolean;
  allowWorkspaceWrites?: boolean;
}): { absPath: string; location: "repo" | "workspace" } {
  const {
    rawPath,
    repoRoot,
    workspaceDir,
    reason,
    allowRepoWrites = true,
    allowWorkspaceWrites = true
  } = params;

  if (!rawPath) throw new Error(`${reason}: missing path`);

  let abs: string;
  if (!path.isAbsolute(rawPath) && (rawPath === "ff-terminal-workspace" || rawPath.startsWith(`ff-terminal-workspace${path.sep}`))) {
    const suffix = rawPath.slice("ff-terminal-workspace".length);
    abs = path.join(workspaceDir, suffix);
  } else {
    abs = path.isAbsolute(rawPath) ? path.resolve(rawPath) : path.resolve(repoRoot, rawPath);
  }

  const realAbs = resolveRealPathForWrite(abs);
  const realRepoRoot = resolveRealPathForWrite(repoRoot);
  const realWorkspaceRoot = resolveRealPathForWrite(workspaceDir);

  if (realAbs.includes(`${path.sep}.git${path.sep}`) || realAbs.endsWith(`${path.sep}.git`)) {
    throw new Error(`${reason}: blocked (refusing to write under .git)`);
  }

  if (allowRepoWrites && isWithinRoot(realAbs, realRepoRoot)) {
    return { absPath: realAbs, location: "repo" };
  }

  if (allowWorkspaceWrites && isWithinRoot(realAbs, realWorkspaceRoot)) {
    if (!isAllowedWorkspacePath(realAbs, realWorkspaceRoot)) {
      throw new Error(
        `${reason}: blocked (path outside allowed workspace layout)\n` +
          `- allowed dirs: ${WORKSPACE_ALLOWED_DIRS.join(", ")}\n` +
          `- allowed root files: ${WORKSPACE_ALLOWED_ROOT_FILES.join(", ")}\n` +
          `- got: ${realAbs}`
      );
    }
    return { absPath: realAbs, location: "workspace" };
  }

  throw new Error(
    `${reason}: blocked (path must be under repo root or workspace)\n` +
      `- repo: ${realRepoRoot}\n` +
      `- workspace: ${realWorkspaceRoot}\n` +
      `- got: ${realAbs}`
  );
}
