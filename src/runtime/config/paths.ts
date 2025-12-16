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

export function defaultWorkspaceDir(cwd = process.cwd()): string {
  return path.join(cwd, "ff-terminal-workspace");
}
