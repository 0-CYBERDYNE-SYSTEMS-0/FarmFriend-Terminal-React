import { describe, it, expect } from "vitest";
import { buildSessionKey } from "../../src/runtime/session/sessionKey.js";

describe("session key", () => {
  it("returns main for main scope", () => {
    const key = buildSessionKey({
      cfg: { session: { scope: "main" } } as any,
      provider: "whatsapp",
      chatType: "direct",
      chatId: "123"
    });
    expect(key).toBe("main");
  });

  it("returns main for bridge direct", () => {
    const key = buildSessionKey({
      cfg: { session: { scope: "bridge" } } as any,
      provider: "whatsapp",
      chatType: "direct",
      chatId: "123"
    });
    expect(key).toBe("main");
  });

  it("returns group key for bridge group", () => {
    const key = buildSessionKey({
      cfg: { session: { scope: "bridge" } } as any,
      provider: "whatsapp",
      chatType: "group",
      chatId: "group-1"
    });
    expect(key).toBe("whatsapp:group:group-1");
  });
});
