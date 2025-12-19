import os from "node:os";
import path from "node:path";

function expandHome(p: string): string {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

/**
 * Normalize any workspace hint to the canonical workspace directory under the user's home.
 *
 * Accepted inputs:
 * - undefined / empty  → defaults to ~/ff-terminal-workspace
 * - "~/ff-terminal-workspace" → expanded
 * - "ff-terminal-workspace/..." (relative) → mapped under ~/ff-terminal-workspace
 * - any other relative path → anchored under ~/ff-terminal-workspace (prevents scattering)
 * - absolute path → normalized and returned
 */
export function resolveWorkspaceDir(raw?: string | null): string {
  const homeDefault = path.join(os.homedir(), "ff-terminal-workspace");
  const hint = String(raw ?? "").trim();
  if (!hint) return homeDefault;

  const expanded = expandHome(hint);

  // If user wrote "ff-terminal-workspace" (or subpath) without a leading slash, treat it as the canonical home workspace.
  if (!path.isAbsolute(expanded)) {
    if (expanded === "ff-terminal-workspace" || expanded.startsWith(`ff-terminal-workspace${path.sep}`)) {
      const suffix = expanded.slice("ff-terminal-workspace".length);
      return path.normalize(path.join(homeDefault, suffix));
    }
    // Any other relative path is anchored under the canonical workspace to avoid dropping files in cwd.
    return path.normalize(path.join(homeDefault, expanded));
  }

  return path.normalize(expanded);
}

export function defaultConfigPath(): string {
  const home = os.homedir();
  const platform = process.platform;

  if (platform === "darwin") {
    return path.join(home, "Library", "Application Support", "ff-terminal", "config.json");
  }

  if (platform === "win32") {
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    return path.join(appData, "ff-terminal", "config.json");
  }

  return path.join(home, ".config", "ff-terminal", "config.json");
}

export function defaultWorkspaceDir(): string {
  /**
   * BEST PRACTICES: Use a single global workspace directory in the user's home folder.
   * This ensures all projects, logs, generated images, and thoughts are stored in one location,
   * preventing data fragmentation and making backups easier.
   *
   * Previous behavior: Created project-specific workspaces, causing data scattering
   * across multiple directories and confusing state management.
   */
  const home = os.homedir();
  return path.join(home, "ff-terminal-workspace");
}
