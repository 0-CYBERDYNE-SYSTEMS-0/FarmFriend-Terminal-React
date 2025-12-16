export type ToolCall = { id: string; name: string; arguments: unknown };
export type ToolResult = { id: string; name: string; ok: boolean; output: string };

export type ToolHandler = (args: unknown, signal: AbortSignal) => Promise<string>;

export class ToolRegistry {
  private handlers = new Map<string, ToolHandler>();

  register(name: string, handler: ToolHandler): void {
    this.handlers.set(name, handler);
  }

  has(name: string): boolean {
    return this.handlers.has(name);
  }

  get(name: string): ToolHandler | undefined {
    return this.handlers.get(name);
  }

  listNames(): string[] {
    return [...this.handlers.keys()].sort();
  }
}
