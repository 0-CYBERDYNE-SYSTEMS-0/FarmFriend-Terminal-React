import type { ToolRegistry } from "../runtime/tools/registry.js";
import type { WhatsAppConfig, WhatsAppMessage } from "./types.js";
import { WhatsAppClient } from "./whatsappClient.js";
import { WhatsAppSessionManager } from "./sessionManager.js";
import { WhatsAppMessageHandler } from "./messageHandler.js";
import { PairingManager } from "./pairingManager.js";
import type { SessionMode } from "../runtime/session/sessionPolicy.js";
import { resolveConfig } from "../runtime/config/loadConfig.js";

/**
 * WhatsApp Server - Main entry point for WhatsApp integration
 */
export class WhatsAppServer {
  private client: WhatsAppClient | null = null;
  private sessionManager: WhatsAppSessionManager;
  private messageHandler: WhatsAppMessageHandler | null = null;
  private config: WhatsAppConfig;
  private workspaceDir: string;
  private repoRoot: string;
  private registry: ToolRegistry;
  private sessionMode?: SessionMode;
  private mainSessionId?: string;

  constructor(
    config: WhatsAppConfig,
    registry: ToolRegistry,
    workspaceDir: string,
    repoRoot: string,
    opts?: { sessionMode?: SessionMode; mainSessionId?: string }
  ) {
    this.config = config;
    this.registry = registry;
    this.workspaceDir = workspaceDir;
    this.repoRoot = repoRoot;
    this.sessionMode = opts?.sessionMode;
    this.mainSessionId = opts?.mainSessionId;
    const cfg = resolveConfig({ repoRoot: this.repoRoot });
    this.sessionManager = new WhatsAppSessionManager(workspaceDir, {
      sessionMode: this.sessionMode,
      mainSessionId: this.mainSessionId,
      repoRoot: this.repoRoot,
      cfg
    });
  }

  /**
   * Start the WhatsApp server
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log("[WhatsApp] Integration disabled in config");
      return;
    }

    console.log("[WhatsApp] Starting WhatsApp integration...");

    // Create client
    this.client = new WhatsAppClient({
      workspaceDir: this.workspaceDir,
      config: this.config,
      onMessage: this.handleMessage.bind(this),
      onQR: (qr) => {
        console.log("\n[WhatsApp] Scan this QR code with WhatsApp:\n");
        const qrcode = require("qrcode-terminal");
        qrcode.generate(qr, { small: true });
        console.log("\nWaiting for QR code scan...\n");
      },
      onReady: () => {
        console.log("[WhatsApp] ✓ Connected and ready");
      },
      onDisconnect: (reason) => {
        console.log(`[WhatsApp] Disconnected: ${reason}`);
      }
    });

    // Create message handler
    this.messageHandler = new WhatsAppMessageHandler(
      this.client,
      this.sessionManager,
      this.registry,
      this.workspaceDir,
      this.repoRoot
    );

    // Start client
    await this.client.start();

    // Schedule periodic cleanup
    this.scheduleCleanup();
  }

  /**
   * Handle incoming WhatsApp message
   */
  private async handleMessage(message: WhatsAppMessage): Promise<void> {
    if (!this.messageHandler) {
      console.error("[WhatsApp] Message handler not initialized");
      return;
    }

    try {
      await this.messageHandler.handleMessage(message);
    } catch (error) {
      console.error("[WhatsApp] Error handling message:", error);
    }
  }

  /**
   * Schedule periodic cleanup of old sessions and pairing requests
   */
  private scheduleCleanup(): void {
    // Run cleanup every 6 hours
    setInterval(() => {
      console.log("[WhatsApp] Running periodic cleanup...");
      this.sessionManager.cleanupOldSessions();
      if (this.client) {
        this.client.getPairingManager().cleanupOldRequests();
      }
    }, 6 * 60 * 60 * 1000);
  }

  /**
   * Stop the WhatsApp server
   */
  async stop(): Promise<void> {
    if (this.client) {
      console.log("[WhatsApp] Stopping...");
      await this.client.disconnect();
      this.client = null;
    }
  }

  /**
   * Get the WhatsApp client instance
   */
  getClient(): WhatsAppClient | null {
    return this.client;
  }

  /**
   * Get the session manager
   */
  getSessionManager(): WhatsAppSessionManager {
    return this.sessionManager;
  }

  /**
   * Get the pairing manager
   */
  getPairingManager(): PairingManager | null {
    return this.client?.getPairingManager() || null;
  }

  /**
   * Check if WhatsApp is connected
   */
  isConnected(): boolean {
    return this.client?.isConnected() || false;
  }

  /**
   * Check if device is authenticated
   */
  isAuthenticated(): boolean {
    return this.client?.isAuthenticated() || false;
  }
}
