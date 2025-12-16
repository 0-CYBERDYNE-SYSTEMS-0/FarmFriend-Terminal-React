import { ToolCall } from "../tools/registry.js";

export type HookType = "pre_tool_execution" | "post_tool_execution" | "tool_error" | "agent_stop";

export type HookAction = "allow" | "block" | "modify" | "need_user";

export type HookBaseContext = {
  sessionId: string;
  repoRoot: string;
  workspaceDir?: string;
};

export type PreToolContext = HookBaseContext & {
  type: "pre_tool_execution";
  call: ToolCall;
};

export type PreToolResult =
  | { action: "allow" }
  | { action: "modify"; modifiedArguments: unknown }
  | { action: "block"; reason: string };

export type PostToolContext = HookBaseContext & {
  type: "post_tool_execution";
  call: ToolCall;
  ok: boolean;
  output: string;
  durationMs: number;
};

export type ToolErrorContext = HookBaseContext & {
  type: "tool_error";
  call: ToolCall;
  error: string;
};

export type AgentStopContext = HookBaseContext & {
  type: "agent_stop";
  userInput: string;
  assistantContent: string;
  iteration: number;
  maxIterations: number;
  toolExecutionsCount: number;
};

export type AgentStopResult =
  | { action: "allow" }
  | { action: "block"; reason: string; systemPrompt: string; statusMessage?: string }
  | { action: "need_user"; reason: string; statusMessage?: string };

export type Hook =
  | {
      type: "pre_tool_execution";
      name: string;
      priority?: number;
      enabled?: boolean;
      run: (ctx: PreToolContext) => Promise<PreToolResult>;
    }
  | {
      type: "post_tool_execution";
      name: string;
      priority?: number;
      enabled?: boolean;
      run: (ctx: PostToolContext) => Promise<void>;
    }
  | {
      type: "tool_error";
      name: string;
      priority?: number;
      enabled?: boolean;
      run: (ctx: ToolErrorContext) => Promise<void>;
    }
  | {
      type: "agent_stop";
      name: string;
      priority?: number;
      enabled?: boolean;
      run: (ctx: AgentStopContext) => Promise<AgentStopResult>;
    };

