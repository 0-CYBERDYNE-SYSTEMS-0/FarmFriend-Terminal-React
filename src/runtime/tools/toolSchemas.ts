import fs from "node:fs";
import path from "node:path";
import { portPacketDir } from "../prompts/loadTemplates.js";
import { findRepoRoot } from "../config/repoRoot.js";

export type OpenAIToolSchema = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: unknown;
  };
};

export function loadToolSchemas(repoRoot = findRepoRoot()): OpenAIToolSchema[] {
  const p = path.join(portPacketDir(repoRoot), "tool_schemas.openai.json");
  const base = JSON.parse(fs.readFileSync(p, "utf8")) as OpenAIToolSchema[];

  // TS-only tools that are not part of the original port packet export.
  const extra: OpenAIToolSchema[] = [
    {
      type: "function",
      function: {
        name: "skill_import",
        description: "Import a SKILL.md folder into the local workspace skills directory (ff-terminal-workspace/skills).",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            source_path: { type: "string", description: "Path to a skill directory (containing SKILL.md) or to a SKILL.md file." },
            overwrite: { type: "boolean", description: "Overwrite an existing destination skill folder (default: false)." }
          },
          required: ["source_path"]
        }
      }
    }
  ];

  return [...base, ...extra];
}
