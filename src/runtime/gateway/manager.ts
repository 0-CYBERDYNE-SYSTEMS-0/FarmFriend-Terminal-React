import fs from "node:fs";
import path from "node:path";
import type { GatewayChannel, GatewayStatusReport } from "./types.js";

type GatewayManagerOptions = {
  workspaceDir: string;
};

export class GatewayManager {
  private channels: GatewayChannel[] = [];
  private workspaceDir: string;
  private statusTimer: NodeJS.Timeout | null = null;

  constructor(opts: GatewayManagerOptions) {
    this.workspaceDir = opts.workspaceDir;
  }

  register(channel: GatewayChannel): void {
    this.channels.push(channel);
  }

  listChannels(): GatewayChannel[] {
    return [...this.channels];
  }

  async start(): Promise<void> {
    for (const channel of this.channels) {
      try {
        await channel.start();
      } catch {
        // Channel will report error via status()
      }
    }
    this.writeStatus();
    this.startStatusLoop();
  }

  async stop(): Promise<void> {
    this.stopStatusLoop();
    for (const channel of this.channels) {
      try {
        await channel.stop();
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
      channels: this.channels.map((c) => c.status())
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
