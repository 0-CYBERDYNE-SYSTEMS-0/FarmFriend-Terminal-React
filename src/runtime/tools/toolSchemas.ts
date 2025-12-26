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
    strict?: boolean;
  };
};

/**
 * Enforce strict mode on a tool schema for structured outputs.
 * This ensures the model returns valid JSON matching the schema.
 */
function enforceStrictSchema(schema: OpenAIToolSchema): OpenAIToolSchema {
  const params = schema.function.parameters as Record<string, unknown> | undefined;
  if (!params || typeof params !== "object") {
    return {
      ...schema,
      function: {
        ...schema.function,
        strict: true,
        parameters: { type: "object", properties: {}, additionalProperties: false }
      }
    };
  }

  // Deep clone and add additionalProperties: false recursively
  const enforceAdditionalProperties = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = { ...obj };

    if (result.type === "object" && !("additionalProperties" in result)) {
      result.additionalProperties = false;
    }

    // Handle nested objects in properties
    if (result.properties && typeof result.properties === "object") {
      const props = result.properties as Record<string, unknown>;
      const newProps: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(props)) {
        if (value && typeof value === "object") {
          newProps[key] = enforceAdditionalProperties(value as Record<string, unknown>);
        } else {
          newProps[key] = value;
        }
      }
      result.properties = newProps;
    }

    // Handle items in arrays
    if (result.items && typeof result.items === "object") {
      result.items = enforceAdditionalProperties(result.items as Record<string, unknown>);
    }

    return result;
  };

  return {
    ...schema,
    function: {
      ...schema.function,
      strict: true,
      parameters: enforceAdditionalProperties(params)
    }
  };
}

/**
 * Validate tool call arguments against schema.
 * Returns { valid: true } or { valid: false, error: string }
 */
export function validateToolArgs(
  toolName: string,
  args: unknown,
  schemas: OpenAIToolSchema[]
): { valid: true } | { valid: false; error: string } {
  const schema = schemas.find(s => s.function.name === toolName);
  if (!schema) {
    return { valid: false, error: `Unknown tool: ${toolName}` };
  }

  const params = schema.function.parameters as Record<string, unknown> | undefined;
  if (!params) {
    return { valid: true }; // No parameters required
  }

  // Check required fields
  const required = (params.required as string[]) || [];
  const properties = (params.properties as Record<string, unknown>) || {};

  if (args === null || args === undefined || typeof args !== "object") {
    if (required.length > 0) {
      return { valid: false, error: `${toolName}: missing required arguments: ${required.join(", ")}` };
    }
    return { valid: true };
  }

  const argObj = args as Record<string, unknown>;

  for (const req of required) {
    const value = argObj[req];
    if (value === undefined || value === null) {
      return { valid: false, error: `${toolName}: missing required argument '${req}'` };
    }
    // Check for empty strings on required string fields
    const propSchema = properties[req] as Record<string, unknown> | undefined;
    if (propSchema?.type === "string" && value === "") {
      return { valid: false, error: `${toolName}: required argument '${req}' cannot be empty` };
    }
  }

  return { valid: true };
}

export function loadToolSchemas(repoRoot = findRepoRoot(), options?: { strict?: boolean }): OpenAIToolSchema[] {
  const p = path.join(portPacketDir(repoRoot), "tool_schemas.openai.json");
  const base = JSON.parse(fs.readFileSync(p, "utf8")) as OpenAIToolSchema[];

  // TS-only tools that are not part of the original port packet export.
  const hasSkillImport = base.some((t) => t?.type === "function" && t.function?.name === "skill_import");
  const extra: OpenAIToolSchema[] = hasSkillImport
    ? []
    : [
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

  const schemas = [...base, ...extra];

  // Apply strict mode if requested (for providers that support structured outputs)
  if (options?.strict) {
    return schemas.map(enforceStrictSchema);
  }

  return schemas;
}
