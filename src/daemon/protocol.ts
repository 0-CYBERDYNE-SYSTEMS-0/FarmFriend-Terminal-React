import { newId, isValidSessionId } from "../shared/ids.js";

type Todo = {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  priority: "high" | "medium" | "low";
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

export type ClientMessage =
  | { type: "hello"; client: "ink" | "web"; version?: string }
  | { type: "start_turn"; input: string | any[]; sessionId?: string }
  | { type: "cancel_turn"; turnId: string }
  | { type: "list_tools" };

export type ServerMessage =
  | { type: "hello"; daemonVersion: string }
  | { type: "turn_started"; sessionId: string; turnId: string }
  | { type: "chunk"; turnId: string; seq: number; chunk: string }
  | { type: "turn_finished"; turnId: string; ok: boolean; error?: string }
  | { type: "tools"; tools: string[] }
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
  return false;
}

export function newSessionId(): string {
  return newId("session");
}

export function newTurnId(): string {
  return newId("turn");
}

export { isValidSessionId };

