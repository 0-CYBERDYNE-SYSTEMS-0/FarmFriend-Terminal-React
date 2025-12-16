import { ToolCall, ToolRegistry, ToolResult } from "./registry.js";

export async function executeToolCalls(
  registry: ToolRegistry,
  calls: ToolCall[],
  opts: {
    signal: AbortSignal;
    hooks?: {
      onStart?: (call: ToolCall) => void;
      onFinish?: (call: ToolCall, result: ToolResult, durationMs: number) => void;
    };
  }
): Promise<ToolResult[]> {
  const { signal, hooks } = opts;

  const tasks = calls.map(async (call): Promise<ToolResult> => {
    const handler = registry.get(call.name);
    if (!handler) {
      return { id: call.id, name: call.name, ok: false, output: `Tool not implemented: ${call.name}` };
    }

    hooks?.onStart?.(call);
    const started = Date.now();
    try {
      const out = await handler(call.arguments, signal);
      const result = { id: call.id, name: call.name, ok: true, output: out };
      hooks?.onFinish?.(call, result, Date.now() - started);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const result = { id: call.id, name: call.name, ok: false, output: msg };
      hooks?.onFinish?.(call, result, Date.now() - started);
      return result;
    }
  });

  // Concurrency rule: execute independent tool calls in parallel.
  const results = await Promise.all(tasks);

  // Preserve original ordering for traceability.
  results.sort((a, b) => calls.findIndex((c) => c.id === a.id) - calls.findIndex((c) => c.id === b.id));
  return results;
}
