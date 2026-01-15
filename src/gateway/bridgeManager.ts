import fs from "node:fs";
import path from "node:path";
import type { GatewayBridge, GatewayStatusReport } from "./types.js";

export class GatewayBridgeManager {
  private bridges: GatewayBridge[] = [];
  private workspaceDir: string;
  private statusTimer: NodeJS.Timeout | null = null;
  private startedAt = Date.now();

  constructor(opts: { workspaceDir: string }) {
    this.workspaceDir = opts.workspaceDir;
  }

  register(bridge: GatewayBridge): void {
    this.bridges.push(bridge);
  }

  list(): GatewayBridge[] {
    return [...this.bridges];
  }

  async replaceAll(next: GatewayBridge[]): Promise<void> {
    await this.stop();
    this.bridges = [...next];
    await this.start();
  }

  async start(): Promise<void> {
    for (const bridge of this.bridges) {
      try {
        await bridge.start();
      } catch {
        // Bridge status surfaces error.
      }
    }
    this.writeStatus();
    this.startStatusLoop();
  }

  async stop(): Promise<void> {
    this.stopStatusLoop();
    for (const bridge of this.bridges) {
      try {
        await bridge.stop();
      } catch {
        // ignore stop errors
      }
    }
    this.writeStatus();
  }

  getStatus(): GatewayStatusReport {
    return {
      timestamp: new Date().toISOString(),
      workspace_dir: this.workspaceDir,
      uptime_ms: Math.max(0, Date.now() - this.startedAt),
      channels: this.bridges.map((b) => b.status())
    };
  }

  private startStatusLoop(): void {
    if (this.statusTimer) return;
    this.statusTimer = setInterval(() => {
      this.writeStatus();
    }, 10_000);
  }

  private stopStatusLoop(): void {
    if (!this.statusTimer) return;
    clearInterval(this.statusTimer);
    this.statusTimer = null;
  }

  private writeStatus(): void {
    try {
      const report = this.getStatus();
      const dir = path.join(this.workspaceDir, "logs", "gateway");
      fs.mkdirSync(dir, { recursive: true });
      const statusPath = path.join(dir, "status.json");
      fs.writeFileSync(statusPath, JSON.stringify(report, null, 2) + "\n", "utf8");
      const eventsPath = path.join(dir, "events.jsonl");
      fs.appendFileSync(eventsPath, JSON.stringify(report) + "\n", "utf8");
    } catch {
      // ignore status write failures
    }
  }
}
