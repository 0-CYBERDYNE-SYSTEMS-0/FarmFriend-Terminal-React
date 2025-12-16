import fs from "node:fs";
import path from "node:path";

export function loadParallelSection(params: { repoRoot: string; enabled: boolean }): string {
  // Prefer the Python reference templates if present (they are the source of truth).
  const p = path.join(
    params.repoRoot,
    "reference source code python ver",
    "ff_terminal",
    "prompts",
    params.enabled ? "parallel_enabled.md" : "parallel_basic.md"
  );

  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

