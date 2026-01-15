import { describe, expect, it } from "vitest";
import { createBridgeSubscriptionManager } from "../../src/gateway/bridgeSubscriptions.js";

describe("bridge subscription manager", () => {
  it("routes events to subscribed nodes", () => {
    const manager = createBridgeSubscriptionManager();
    const sent: Array<{ nodeId: string; event: string }> = [];
    manager.subscribe("node-a", "main");
    manager.subscribe("node-b", "main");
    manager.sendToSession("main", "chat", { ok: true }, (evt) => {
      sent.push({ nodeId: evt.nodeId, event: evt.event });
    });
    expect(sent).toHaveLength(2);
    expect(sent.map((s) => s.nodeId).sort()).toEqual(["node-a", "node-b"]);
  });

  it("unsubscribeAll clears session mappings", () => {
    const manager = createBridgeSubscriptionManager();
    const sent: string[] = [];
    manager.subscribe("node-a", "main");
    manager.subscribe("node-a", "secondary");
    manager.unsubscribeAll("node-a");
    manager.sendToSession("main", "tick", {}, (evt) => {
      sent.push(`${evt.nodeId}:${evt.event}`);
    });
    manager.sendToSession("secondary", "tick", {}, (evt) => {
      sent.push(`${evt.nodeId}:${evt.event}`);
    });
    expect(sent).toEqual([]);
  });
});
