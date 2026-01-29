import { newId, isValidSessionId } from "../shared/ids.js";

type Todo = {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  priority: "high" | "medium" | "low";
  completedAt?: number;
};

type SubagentProgress = {
  agentId: string;
  task: string;
  status: "running" | "done" | "error";
  currentAction?: string;
  currentFile?: string;
  toolCount: number;
  tokens: number;
};

type HistoryMessage = {
  role: "system" | "developer" | "user" | "assistant" | "tool";
  content: string;
  created_at?: string;
};

export type ClientMessage =
  | { type: "hello"; client: "ink" | "web"; version?: string }
  | { type: "start_turn"; input: string | any[]; sessionId?: string }
  | { type: "cancel_turn"; turnId: string }
  | { type: "list_tools" }
  | { type: "list_sessions"; limit?: number; activeMinutes?: number; messageLimit?: number }
  | { type: "get_history"; sessionId?: string; limit?: number; includeSystem?: boolean; includeTool?: boolean }
  | {
      type: "patch_session";
      sessionId?: string;
      sessionKey?: string;
      overrides?: Record<string, string | null>;
      displayName?: string | null;
    };

export type ServerMessage =
  | { type: "hello"; daemonVersion: string }
  | { type: "turn_started"; sessionId: string; turnId: string }
  | { type: "chunk"; turnId: string; seq: number; chunk: string }
  | { type: "turn_finished"; turnId: string; ok: boolean; error?: string }
  | { type: "async_message"; sessionId: string; content: string; label?: string }
  | { type: "tools"; tools: string[] }
  | { type: "sessions_list"; sessions: any[] }
  | { type: "history"; sessionId: string; messages: HistoryMessage[] }
  | {
      type: "session_patched";
      ok: boolean;
      sessionId?: string;
      sessionKey?: string;
      overrides?: Record<string, string | null>;
      error?: string;
    }
  | { type: "todo_update"; todos: Todo[] }
  | { type: "subagent_start"; agentId: string; task: string }
  | { type: "subagent_progress"; agentId: string; action: string; file?: string; toolCount: number; tokens: number }
  | { type: "subagent_complete"; agentId: string; status: "done" | "error"; error?: string };

export function safeJsonParse(raw: unknown): unknown {
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

export function isClientMessage(value: unknown): value is ClientMessage {
  if (!value || typeof value !== "object") return false;
  const type = (value as any).type;
  if (type === "hello") return (value as any).client === "ink" || (value as any).client === "web";
  if (type === "start_turn") return typeof (value as any).input === "string" || Array.isArray((value as any).input);
  if (type === "cancel_turn") return typeof (value as any).turnId === "string";
  if (type === "list_tools") return true;
  if (type === "list_sessions") return true;
  if (type === "get_history") return true;
  if (type === "patch_session") return true;
  return false;
}

export function newSessionId(): string {
  return newId("session");
}

export function newTurnId(): string {
  return newId("turn");
}

export { isValidSessionId };
