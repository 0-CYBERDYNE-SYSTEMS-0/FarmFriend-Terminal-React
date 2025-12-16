import fs from "node:fs";
import path from "node:path";
import { ffHomeDir } from "./ffHome.js";

export type MountsConfig = {
  version: 1;
  mounts: {
    claude: boolean;
    factory: boolean;
  };
  // Optional additional explicit mounts (advanced users).
  extra_skill_dirs?: string[];
};

const DEFAULT_CONFIG: MountsConfig = {
  version: 1,
  mounts: { claude: false, factory: false },
  extra_skill_dirs: []
};

export function mountsConfigPath(): string {
  return path.join(ffHomeDir(), "config.json");
}

export function readMountsConfig(): MountsConfig {
  const p = mountsConfigPath();
  try {
    if (!fs.existsSync(p)) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(fs.readFileSync(p, "utf8")) as any;
    const cfg: MountsConfig = {
      version: 1,
      mounts: {
        claude: Boolean(parsed?.mounts?.claude),
        factory: Boolean(parsed?.mounts?.factory)
      },
      extra_skill_dirs: Array.isArray(parsed?.extra_skill_dirs) ? parsed.extra_skill_dirs.map(String) : []
    };
    return cfg;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeMountsConfig(cfg: MountsConfig): void {
  const p = mountsConfigPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

export function setMountEnabled(name: "claude" | "factory", enabled: boolean): MountsConfig {
  const cfg = readMountsConfig();
  cfg.mounts[name] = Boolean(enabled);
  writeMountsConfig(cfg);
  return cfg;
}

