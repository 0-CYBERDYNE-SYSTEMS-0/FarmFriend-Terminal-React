import { describe, expect, it } from "vitest";
import { GatewayBridgeManager } from "../../src/gateway/bridgeManager.js";

type Flags = { started: number; stopped: number };

class TestBridge {
  name = "test";
  private flags: Flags;
  constructor(flags: Flags) {
    this.flags = flags;
  }
  async start(): Promise<void> {
    this.flags.started += 1;
  }
  async stop(): Promise<void> {
    this.flags.stopped += 1;
  }
  status() {
    return { name: "test", enabled: true, running: true, healthy: true } as any;
  }
}

describe("GatewayBridgeManager", () => {
  it("replaces bridges by stopping then starting", async () => {
    const flagsA = { started: 0, stopped: 0 };
    const flagsB = { started: 0, stopped: 0 };
    const mgr = new GatewayBridgeManager({ workspaceDir: "/tmp" });
    mgr.register(new TestBridge(flagsA));
    await mgr.start();
    expect(flagsA.started).toBe(1);
    await mgr.replaceAll([new TestBridge(flagsB)]);
    expect(flagsA.stopped).toBe(1);
    expect(flagsB.started).toBe(1);
  });
});
