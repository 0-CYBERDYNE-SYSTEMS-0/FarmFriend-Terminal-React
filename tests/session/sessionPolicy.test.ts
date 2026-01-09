import { describe, it, expect } from "vitest";
import { resolveMainSessionId, resolveSessionMode } from "../../src/runtime/session/sessionPolicy.js";

describe("session policy", () => {
  it("defaults to main mode", () => {
    const mode = resolveSessionMode({});
    expect(mode).toBe("main");
  });

  it("resolves main session id", () => {
    const sessionId = resolveMainSessionId({});
    expect(sessionId).toBe("main");
  });

  it("respects config override", () => {
    const mode = resolveSessionMode({ session_mode: "new" } as any);
    expect(mode).toBe("new");
  });
});
