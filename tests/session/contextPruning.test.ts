import { describe, it, expect } from "vitest";
import { pruneToolMessages } from "../../src/runtime/session/contextPruning.js";

describe("context pruning", () => {
  it("does nothing when disabled", () => {
    const messages = [
      { role: "assistant", content: "hello" },
      { role: "tool", name: "read_file", tool_call_id: "1", content: "tool output" }
    ] as any;
    const result = pruneToolMessages({ messages, cfg: {} as any });
    expect(result.messages).toEqual(messages);
  });

  it("hard clears tool output in aggressive mode", () => {
    const messages = [
      { role: "assistant", content: "a" },
      { role: "tool", name: "read_file", tool_call_id: "1", content: "x".repeat(200) },
      { role: "assistant", content: "b" }
    ] as any;
    const result = pruneToolMessages({
      messages,
      cfg: { session: { contextPruning: { enabled: true, mode: "aggressive", keepLastAssistants: 1 } } } as any,
      contextWindowTokens: 10
    });
    const toolMsg = result.messages[1] as any;
    expect(toolMsg.content).toContain("Old tool result");
  });
});
