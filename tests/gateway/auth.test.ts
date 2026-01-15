import { describe, expect, it } from "vitest";
import { resolveGatewayAuth } from "../../src/gateway/auth.js";

describe("gateway auth", () => {
  it("allows tailscale when enabled and no password auth", () => {
    const auth = resolveGatewayAuth({
      authConfig: { allowTailscale: true },
      tailscaleMode: "serve",
      env: {}
    });
    expect(auth.allowTailscale).toBe(true);
    expect(auth.mode).toBe("none");
  });

  it("disables tailscale when password auth is active", () => {
    const auth = resolveGatewayAuth({
      authConfig: { password: "secret" },
      tailscaleMode: "serve",
      env: {}
    });
    expect(auth.allowTailscale).toBe(false);
    expect(auth.mode).toBe("password");
  });
});
