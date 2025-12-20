import os from "node:os";
import path from "node:path";

function expandHome(p: string): string {
  let home = process.env.HOME || os.homedir() || "";
  if (!home) {
    try {
      home = os.userInfo().homedir || "";
    } catch {
      home = "";
    }
  }
  if (!home) return p;
  return p.startsWith("~") ? path.join(home, p.slice(1)) : p;
}

/**
 * Normalize any workspace hint to the canonical workspace directory under the user's home.
 *
 * Accepted inputs:
 * - undefined / empty  → defaults to <repoRoot>/ff-terminal-workspace (or cwd if no repoRoot)
 * - "~/ff-terminal-workspace" → expanded
 * - "ff-terminal-workspace/..." (relative) → resolved under repoRoot/cwd
 * - any other relative path → resolved under repoRoot/cwd
 * - absolute path → normalized and returned
 */
export function resolveWorkspaceDir(
  raw?: string | null,
  opts?: { repoRoot?: string; cwd?: string }
): string {
  const base = path.resolve(opts?.repoRoot || opts?.cwd || process.cwd());
  const hint = String(raw ?? "").trim();
  if (!hint) return path.join(base, "ff-terminal-workspace");

  const expanded = expandHome(hint);
  const home = process.env.HOME || "";
  const legacyHomeDefault = home ? path.join(home, "ff-terminal-workspace") : "";

  // If user wrote "ff-terminal-workspace" (or subpath) without a leading slash, treat it as the canonical local workspace.
  if (!path.isAbsolute(expanded)) {
    return path.normalize(path.join(base, expanded));
  }

  if (legacyHomeDefault && path.normalize(expanded) === path.normalize(legacyHomeDefault)) {
    return path.join(base, "ff-terminal-workspace");
  }

  return path.normalize(expanded);
}

export function defaultConfigPath(): string {
  const home = process.env.HOME || "";
  const platform = process.platform;

  if (platform === "darwin") {
    return path.join(home, "Library", "Application Support", "ff-terminal", "config.json");
  }

  if (platform === "win32") {
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    return path.join(appData, "ff-terminal", "config.json");
  }

  return path.join(home || process.cwd(), ".config", "ff-terminal", "config.json");
}

export function defaultWorkspaceDir(opts?: { repoRoot?: string; cwd?: string }): string {
  /**
   * Default workspace lives next to the project (repo root) to keep data colocated.
   */
  const base = path.resolve(opts?.repoRoot || opts?.cwd || process.cwd());
  return path.join(base, "ff-terminal-workspace");
}
