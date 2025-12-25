import { AsyncLocalStorage } from "node:async_hooks";

export type SubagentEvent = {
  event: "start" | "progress" | "complete";
  agentId: string;
  task?: string;
  action?: string;
  file?: string;
  toolCount?: number;
  tokens?: number;
  status?: "done" | "error";
  error?: string;
};

export type ToolContext = {
  sessionId: string;
  workspaceDir: string;
  repoRoot: string;
  emitSubagentEvent?: (event: SubagentEvent) => void;
};

const als = new AsyncLocalStorage<ToolContext>();

export function getToolContext(): ToolContext | null {
  return als.getStore() ?? null;
}

export async function withToolContext<T>(ctx: ToolContext, fn: () => Promise<T>): Promise<T> {
  return await als.run(ctx, fn);
}

