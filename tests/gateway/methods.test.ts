import { describe, expect, it } from "vitest";
import { createGatewayMethods } from "../../src/gateway/server-methods/index.js";

describe("gateway methods registry", () => {
  it("includes core methods", () => {
    const methods = createGatewayMethods();
    expect(methods.connect).toBeDefined();
    expect(methods.health).toBeDefined();
    expect(methods.status).toBeDefined();
    expect(methods["sessions.list"]).toBeDefined();
    expect(methods["channels.status"]).toBeDefined();
    expect(methods["config.get"]).toBeDefined();
    expect(methods["logs.tail"]).toBeDefined();
    expect(methods["cron.list"]).toBeDefined();
  });
});
