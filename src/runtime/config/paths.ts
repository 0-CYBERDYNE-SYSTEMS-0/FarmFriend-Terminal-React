import os from "node:os";
import path from "node:path";

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
