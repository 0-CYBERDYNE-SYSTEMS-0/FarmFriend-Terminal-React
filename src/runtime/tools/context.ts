import { AsyncLocalStorage } from "node:async_hooks";

export type ToolContext = {
  sessionId: string;
  workspaceDir: string;
  repoRoot: string;
};

const als = new AsyncLocalStorage<ToolContext>();

export function getToolContext(): ToolContext | null {
  return als.getStore() ?? null;
}

export async function withToolContext<T>(ctx: ToolContext, fn: () => Promise<T>): Promise<T> {
  return await als.run(ctx, fn);
}

