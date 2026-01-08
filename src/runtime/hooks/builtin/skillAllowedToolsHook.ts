import { Hook } from "../types.js";

const skillPolicies = new Map<string, string[]>();
const workspacePolicies = new Map<string, string[]>();

export const ALWAYS_ALLOWED_TOOLS = new Set([
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

function intersect(a: string[], b: string[]): string[] {
  const bSet = new Set(b);
  return a.filter((t) => bSet.has(t));
}

function getEffectiveAllowedTools(sessionId: string): string[] | null {
  const workspace = workspacePolicies.get(sessionId);
  const skill = skillPolicies.get(sessionId);
  if (workspace && skill) return intersect(workspace, skill);
  return skill || workspace || null;
}

export function setWorkspaceAllowedToolsPolicy(sessionId: string, tools: string[] | null): boolean {
  if (!tools || tools.length === 0) {
    const had = workspacePolicies.has(sessionId);
    workspacePolicies.delete(sessionId);
    return had;
  }
  const normalized = tools.map((t) => String(t).trim()).filter(Boolean);
  const prev = workspacePolicies.get(sessionId) || [];
  const changed = prev.join(",") !== normalized.join(",");
  workspacePolicies.set(sessionId, normalized);
  return changed;
}

export function setSkillAllowedToolsPolicy(sessionId: string, tools: string[] | null): void {
  if (!tools || tools.length === 0) {
    skillPolicies.delete(sessionId);
    return;
  }
  const normalized = tools.map((t) => String(t).trim()).filter(Boolean);
  skillPolicies.set(sessionId, normalized);
}

export function createSkillAllowedToolsHooks(): Hook[] {
  const preHook: Hook = {
    type: "pre_tool_execution",
    name: "skill_allowed_tools_enforcer",
    priority: 20,
    run: async (ctx) => {
      const allowed = getEffectiveAllowedTools(ctx.sessionId);
      if (!allowed || allowed.length === 0) return { action: "allow" };
      if (ALWAYS_ALLOWED_TOOLS.has(ctx.call.name)) return { action: "allow" };
      if (allowed.includes(ctx.call.name)) return { action: "allow" };
      return { action: "block", reason: `Tool not allowed by active tool policy: ${ctx.call.name}` };
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
      setSkillAllowedToolsPolicy(ctx.sessionId, tools);
    }
  };

  return [preHook, postHook];
}

export function clearToolPolicies(sessionId: string): void {
  skillPolicies.delete(sessionId);
  workspacePolicies.delete(sessionId);
}
