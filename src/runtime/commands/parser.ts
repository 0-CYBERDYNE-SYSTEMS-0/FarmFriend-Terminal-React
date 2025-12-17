import type { CommandParseResult } from "./types.js";

/**
 * Substitute variables in command template
 * Supports:
 * - $1, $2, $3, ... for positional arguments
 * - $ARGUMENTS for all arguments joined by space
 * - $ARGn for nth argument (same as $n)
 */
export function parseCommand(template: string, args: string[]): CommandParseResult {
  let result = template;

  // Replace $ARGUMENTS with all args joined by space
  result = result.replace(/\$ARGUMENTS/g, args.join(" "));

  // Replace $ARGn and $n with positional arguments
  for (let i = 0; i < Math.max(args.length, 10); i++) {
    const positional = i + 1;
    const value = args[i] || "";

    // Replace $N format (e.g., $1, $2)
    const posRegex = new RegExp(`\\$${positional}`, "g");
    result = result.replace(posRegex, value);

    // Replace $ARGN format (e.g., $ARG1, $ARG2)
    const argRegex = new RegExp(`\\$ARG${positional}`, "gi");
    result = result.replace(argRegex, value);
  }

  return {
    template,
    substituted: result,
    args
  };
}

/**
 * Parse YAML-style frontmatter from markdown
 * Expects format:
 * ---
 * key: value
 * key2: value2
 * ---
 * Body content here
 */
export function parseFrontmatter(
  content: string
): { frontmatter: Record<string, any>; body: string } {
  const lines = content.split("\n");

  if (!lines[0]?.trim().startsWith("---")) {
    return { frontmatter: {}, body: content };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim().startsWith("---")) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const body = lines.slice(endIndex + 1).join("\n");

  const frontmatter: Record<string, any> = {};

  for (const line of frontmatterLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const valueStr = trimmed.slice(colonIndex + 1).trim();

    // Parse value based on content
    if (valueStr.startsWith("[") && valueStr.endsWith("]")) {
      // Array: [item1, item2]
      const items = valueStr
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
      frontmatter[key] = items;
    } else if (valueStr === "true") {
      frontmatter[key] = true;
    } else if (valueStr === "false") {
      frontmatter[key] = false;
    } else {
      // String value, remove quotes if present
      frontmatter[key] = valueStr.replace(/^["']|["']$/g, "");
    }
  }

  return { frontmatter, body: body.trim() };
}
