import os from "node:os";
import path from "node:path";

export function ffHomeDir(): string {
  // Canonical FF-Terminal home (shared across implementations).
  // Allow override for power users / testing.
  const override = String(process.env.FF_HOME_DIR || process.env.FF_TERMINAL_HOME || "").trim();
  if (override) return path.resolve(override);
  return path.join(os.homedir(), ".ff-terminal");
}

