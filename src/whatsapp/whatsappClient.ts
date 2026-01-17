import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
  getAggregateVotesInPollMessage
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import type { WhatsAppClientOptions, WhatsAppMessage, WhatsAppConfig } from "./types.js";
import { WhatsAppAuthState } from "./authState.js";
import { PairingManager } from "./pairingManager.js";

/**
 * WhatsApp client integration using Baileys
 */
export class WhatsAppClient {
  private socket: WASocket | null = null;
  private authState: WhatsAppAuthState;
  private pairingManager: PairingManager;
  private options: WhatsAppClientOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;

  constructor(options: WhatsAppClientOptions) {
    this.options = options;
    this.authState = new WhatsAppAuthState(options.workspaceDir);
    this.pairingManager = new PairingManager(options.workspaceDir);
  }

  /**
   * Start the WhatsApp client and connect
   */
  async start(): Promise<void> {
    if (this.isConnecting) {
      console.log("[WhatsApp] Connection already in progress");
      return;
    }

    this.isConnecting = true;

    try {
      const { state, saveCreds } = await this.authState.getAuthState();

      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        defaultQueryTimeoutMs: undefined,
      });
      this.socket = socket;

      // Save credentials on update
      socket.ev.on("creds.update", saveCreds);

      // Handle connection updates
      socket.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log("[WhatsApp] QR Code received");
          if (this.options.onQR) {
            this.options.onQR(qr);
          } else {
            qrcode.generate(qr, { small: true });
            console.log("Scan the QR code above with WhatsApp to link your device");
          }
        }

        if (connection === "close") {
          const shouldReconnect =
            (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;

          console.log(
            "[WhatsApp] Connection closed. Reconnect?",
            shouldReconnect,
            "Reason:",
            lastDisconnect?.error
          );

          if (this.options.onDisconnect) {
            this.options.onDisconnect(lastDisconnect?.error?.message || "Unknown");
          }

          if (shouldReconnect && this.options.config.autoReconnect !== false) {
            await this.handleReconnect();
          } else {
            this.isConnecting = false;
          }
        } else if (connection === "open") {
          console.log("[WhatsApp] Connected successfully");
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          if (this.options.onReady) {
            this.options.onReady();
          }
        }
      });

      // Handle incoming messages
      socket.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;

        for (const msg of messages) {
          await this.handleIncomingMessage(msg);
        }
      });

    } catch (error) {
      console.error("[WhatsApp] Failed to start:", error);
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[WhatsApp] Max reconnection attempts reached");
      this.isConnecting = false;
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`[WhatsApp] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    await new Promise(resolve => setTimeout(resolve, delay));
    this.isConnecting = false;
    await this.start();
  }

  /**
   * Handle incoming WhatsApp message
   */
  private async handleIncomingMessage(msg: proto.IWebMessageInfo): Promise<void> {
    try {
      // Extract message details
      const from = msg.key.remoteJid || "";
      const messageId = msg.key.id || "";
      const isGroup = from.endsWith("@g.us");
      const text = this.extractMessageText(msg);

      if (!text) return;

      // Get sender phone number
      const phoneNumber = isGroup
        ? (msg.key.participant || "").replace("@s.whatsapp.net", "")
        : from.replace("@s.whatsapp.net", "");

      // Check if sender is allowed
      const dmPolicy = this.options.config.dmPolicy || "pairing";

      if (!isGroup && dmPolicy === "pairing") {
        if (!this.pairingManager.isAllowed(phoneNumber, this.options.config.allowFrom)) {
          // Generate pairing code
          const code = this.pairingManager.generatePairingCode(phoneNumber);
          await this.sendMessage(from,
            `🔐 First-time access requires approval.\n\nYour pairing code: ${code}\n\nAsk the bot owner to approve with:\nff-terminal whatsapp approve ${code}`
          );
          return;
        }
      }

      // Check group allowlist
      if (isGroup) {
        const groups = this.options.config.groups || [];
        if (!groups.includes("*") && !groups.includes(from)) {
          console.log(`[WhatsApp] Message from unauthorized group: ${from}`);
          return;
        }
      }

      // Create message object
      const whatsappMessage: WhatsAppMessage = {
        from,
        to: this.socket?.user?.id || "",
        text,
        messageId,
        timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now(),
        isGroup,
        groupId: isGroup ? from : undefined,
        senderName: msg.pushName || phoneNumber
      };

      // Pass to message handler
      await this.options.onMessage(whatsappMessage);

    } catch (error) {
      console.error("[WhatsApp] Error handling message:", error);
    }
  }

  /**
   * Extract text content from WhatsApp message
   */
  private extractMessageText(msg: proto.IWebMessageInfo): string | null {
    const message = msg.message;
    if (!message) return null;

    if (message.conversation) {
      return message.conversation;
    }

    if (message.extendedTextMessage?.text) {
      return message.extendedTextMessage.text;
    }

    if (message.imageMessage?.caption) {
      return message.imageMessage.caption;
    }

    if (message.videoMessage?.caption) {
      return message.videoMessage.caption;
    }

    return null;
  }

  /**
   * Send a message to a WhatsApp contact or group
   */
  async sendMessage(to: string, text: string): Promise<void> {
    if (!this.socket) {
      throw new Error("WhatsApp client not connected");
    }

    try {
      await this.socket.sendMessage(to, { text });
    } catch (error) {
      console.error("[WhatsApp] Failed to send message:", error);
      throw error;
    }
  }

  /**
   * Send a reply to a specific message
   */
  async replyToMessage(to: string, text: string, messageId: string): Promise<void> {
    if (!this.socket) {
      throw new Error("WhatsApp client not connected");
    }

    try {
      await this.socket.sendMessage(to, {
        text,
      }, {
        quoted: { key: { remoteJid: to, id: messageId } } as any
      });
    } catch (error) {
      console.error("[WhatsApp] Failed to reply to message:", error);
      throw error;
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.socket !== null;
  }

  /**
   * Check if device is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated();
  }

  /**
   * Disconnect and stop the client
   */
  async disconnect(): Promise<void> {
    if (this.socket) {
      await this.socket.logout();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  /**
   * Get pairing manager instance
   */
  getPairingManager(): PairingManager {
    return this.pairingManager;
  }

  /**
   * Get the underlying socket (for advanced use)
   */
  getSocket(): WASocket | null {
    return this.socket;
  }
}
