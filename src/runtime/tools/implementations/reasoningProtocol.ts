import fs from "node:fs";
import path from "node:path";
import { portPacketDir } from "../../prompts/loadTemplates.js";

export async function reasoningProtocolTool(): Promise<string> {
  const dir = portPacketDir();
  const filePath = path.join(dir, "reasoning_protocol.md");

  try {
    const protocol = fs.readFileSync(filePath, "utf8").trim();
    return JSON.stringify({ ok: true, path: filePath, protocol }, null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ ok: false, error: message, path: filePath }, null, 2);
  }
}
