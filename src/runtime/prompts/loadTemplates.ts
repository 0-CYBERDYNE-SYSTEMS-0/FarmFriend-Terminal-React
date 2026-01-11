import fs from "node:fs";
import path from "node:path";
import { findRepoRoot } from "../config/repoRoot.js";

export function portPacketDir(repoRoot = findRepoRoot()): string {
  const localPacket = path.join(repoRoot, "packet");
  if (fs.existsSync(localPacket) && fs.statSync(localPacket).isDirectory()) return localPacket;

  const direct = path.join(repoRoot, "ff_terminal_port_packet 2");
  if (fs.existsSync(direct) && fs.statSync(direct).isDirectory()) return direct;

  const nested = path.join(repoRoot, "reference source code python ver", "ff_terminal_port_packet 2");
  if (fs.existsSync(nested) && fs.statSync(nested).isDirectory()) return nested;

  return direct;
}

export function loadPromptTemplate(isLocal: boolean = false, repoRoot = findRepoRoot()): string {
  const dir = portPacketDir(repoRoot);
  const file = isLocal ? "system_prompt_local.TEMPLATE.md" : "system_prompt.TEMPLATE.md";
  return fs.readFileSync(path.join(dir, file), "utf8");
}

export function interpolate(template: string, values: Record<string, string>): string {
  // Avoid clobbering double-brace placeholders like `{{partial}}` that appear in the prompts.
  // Node 20+ supports lookbehind.
  return template.replace(/(?<!\{)\{([a-zA-Z0-9_]+)\}(?!\})/g, (m, key) => {
    if (Object.prototype.hasOwnProperty.call(values, key)) return values[key] ?? "";
    return m;
  });
}
