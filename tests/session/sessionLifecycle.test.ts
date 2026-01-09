import { describe, it, expect } from "vitest";
import { createSession } from "../../src/runtime/session/sessionStore.js";
import { isSessionExpired } from "../../src/runtime/session/sessionLifecycle.js";

describe("session lifecycle", () => {
  it("does not expire with idleMinutes=0", () => {
    const session = createSession("main");
    const expired = isSessionExpired(session, { session: { idleMinutes: 0 } } as any);
    expect(expired).toBe(false);
  });

  it("expires after idle timeout", () => {
    const session = createSession("main");
    const past = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    if (session.stats) session.stats.lastActiveAt = past;
    const expired = isSessionExpired(session, { session: { idleMinutes: 60 } } as any);
    expect(expired).toBe(true);
  });
});
