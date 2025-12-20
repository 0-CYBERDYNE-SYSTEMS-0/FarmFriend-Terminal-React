import { Hook } from "../types.js";

const sessionPolicies = new Map<string, string[]>();

const ALWAYS_ALLOWED = new Set([
  "skill_loader",
  "skill_documentation",
  "skill_sequencer",
  "skill_draft",
  "skill_apply"
]);

function parseAllowedTools(output: string): string[] | null {
  try {
    const data = JSON.parse(output);
    const tools = data?.skill?.allowed_tools || data?.skill?.allowedTools || data?.skill?.["allowed-tools"];
    if (Array.isArray(tools)) return tools.map((t: any) => String(t).trim()).filter(Boolean);
    if (typeof tools === "string") {
      const list = tools
        .split(/\s+/)
        .map((t: string) => t.trim())
        .filter(Boolean);
      return list.length ? list : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function createSkillAllowedToolsHooks(): Hook[] {
  const preHook: Hook = {
    type: "pre_tool_execution",
    name: "skill_allowed_tools_enforcer",
    priority: 20,
    run: async (ctx) => {
      const allowed = sessionPolicies.get(ctx.sessionId);
      if (!allowed || allowed.length === 0) return { action: "allow" };
      if (ALWAYS_ALLOWED.has(ctx.call.name)) return { action: "allow" };
      if (allowed.includes(ctx.call.name)) return { action: "allow" };
      return { action: "block", reason: `Tool not allowed by active skill policy: ${ctx.call.name}` };
    }
  };

  const postHook: Hook = {
    type: "post_tool_execution",
    name: "skill_allowed_tools_capture",
    priority: 20,
    run: async (ctx) => {
      if (ctx.call.name !== "skill_loader") return;
      if (!ctx.ok) return;
      const tools = parseAllowedTools(ctx.output);
      if (!tools || tools.length === 0) {
        sessionPolicies.delete(ctx.sessionId);
        return;
      }
      sessionPolicies.set(ctx.sessionId, tools);
    }
  };

  return [preHook, postHook];
}

export function clearSkillAllowedToolsPolicy(sessionId: string): void {
  sessionPolicies.delete(sessionId);
}
