export type StreamChunk =
  | { kind: "content"; delta: string }
  | { kind: "thinking"; delta: string }
  | { kind: "error"; message: string }
  | { kind: "status"; message: string }
  | { kind: "task_completed" }
  | { kind: "subagent_event"; event: "start" | "progress" | "complete"; agentId: string; task?: string; action?: string; file?: string; toolCount?: number; tokens?: number; status?: "done" | "error"; error?: string };

export function toWire(chunk: StreamChunk): string {
  switch (chunk.kind) {
    case "content":
      return `content:${chunk.delta}`;
    case "thinking":
      return `thinking:${chunk.delta}`;
    case "error":
      return `error:${chunk.message}`;
    case "status":
      return chunk.message;
    case "task_completed":
      return "task_completed";
    case "subagent_event":
      return `subagent_event:${JSON.stringify(chunk)}`;
  }
}
