import { ToolCall } from "../tools/registry.js";
import {
  AgentStopContext,
  AgentStopResult,
  Hook,
  PostToolContext,
  PreToolContext,
  PreToolResult,
  ToolErrorContext
} from "./types.js";

function priorityOf(h: { priority?: number }): number {
  return typeof h.priority === "number" ? h.priority : 50;
}

function enabledOf(h: { enabled?: boolean }): boolean {
  return h.enabled !== false;
}

export class HookRegistry {
  private hooks: Hook[] = [];

  register(hook: Hook): void {
    this.hooks.push(hook);
  }

  private list<T extends Hook["type"]>(type: T): Extract<Hook, { type: T }>[] {
    return this.hooks
      .filter((h): h is Extract<Hook, { type: T }> => h.type === type)
      .filter((h) => enabledOf(h))
      .sort((a, b) => priorityOf(a) - priorityOf(b));
  }

  async runPreTool(ctx: Omit<PreToolContext, "type"> & { call: ToolCall }): Promise<PreToolResult> {
    const hooks = this.list("pre_tool_execution");
    const context: PreToolContext = { ...ctx, type: "pre_tool_execution" };
    for (const h of hooks) {
      const res = await h.run(context);
      if (res.action !== "allow") return res;
    }
    return { action: "allow" };
  }

  async runPostTool(ctx: Omit<PostToolContext, "type">): Promise<void> {
    const hooks = this.list("post_tool_execution");
    const context: PostToolContext = { ...ctx, type: "post_tool_execution" };
    for (const h of hooks) await h.run(context);
  }

  async runToolError(ctx: Omit<ToolErrorContext, "type">): Promise<void> {
    const hooks = this.list("tool_error");
    const context: ToolErrorContext = { ...ctx, type: "tool_error" };
    for (const h of hooks) await h.run(context);
  }

  async runAgentStop(ctx: Omit<AgentStopContext, "type">): Promise<AgentStopResult> {
    const hooks = this.list("agent_stop");
    if (!hooks.length) return { action: "allow" };
    const context: AgentStopContext = { ...ctx, type: "agent_stop" };
    for (const h of hooks) {
      const res = await h.run(context);
      if (res.action !== "allow") return res;
    }
    return { action: "allow" };
  }
}

