import type { ToolRegistry } from "../../runtime/tools/registry.js";
import type { WhatsAppConfig } from "../../whatsapp/types.js";
import { WhatsAppServer } from "../../whatsapp/whatsappServer.js";
import type { GatewayBridge, GatewayChannelStatus } from "../types.js";
import type { SessionMode } from "../../runtime/session/sessionPolicy.js";

type WhatsAppBridgeOpts = {
  config?: WhatsAppConfig;
  registry: ToolRegistry;
  workspaceDir: string;
  repoRoot: string;
  sessionMode?: SessionMode;
  mainSessionId?: string;
};

export class WhatsAppBridge implements GatewayBridge {
  name = "whatsapp";
  private config?: WhatsAppConfig;
  private registry: ToolRegistry;
  private workspaceDir: string;
  private repoRoot: string;
  private server: WhatsAppServer | null = null;
  private lastError: string | null = null;
  private sessionMode?: SessionMode;
  private mainSessionId?: string;

  constructor(opts: WhatsAppBridgeOpts) {
    this.config = opts.config;
    this.registry = opts.registry;
    this.workspaceDir = opts.workspaceDir;
    this.repoRoot = opts.repoRoot;
    this.sessionMode = opts.sessionMode;
    this.mainSessionId = opts.mainSessionId;
  }

  async start(): Promise<void> {
    this.lastError = null;
    if (!this.config?.enabled) {
      return;
    }
    try {
      this.server = new WhatsAppServer(this.config, this.registry, this.workspaceDir, this.repoRoot, {
        sessionMode: this.sessionMode,
        mainSessionId: this.mainSessionId
      });
      await this.server.start();
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      this.server = null;
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      await this.server.stop();
      this.server = null;
    }
  }

  status(): GatewayChannelStatus {
    const enabled = Boolean(this.config?.enabled);
    const running = Boolean(this.server);
    const connected = this.server?.isConnected() || false;
    const authenticated = this.server?.isAuthenticated() || false;
    return {
      name: this.name,
      enabled,
      running,
      healthy: enabled ? connected : true,
      last_error: this.lastError ?? undefined,
      details: enabled
        ? {
            connected,
            authenticated
          }
        : { reason: "disabled" }
    };
  }
}
