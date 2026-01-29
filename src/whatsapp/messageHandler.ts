import type { WhatsAppMessage } from "./types.js";
import type { ToolRegistry } from "../runtime/tools/registry.js";
import type { StreamChunk } from "../runtime/streamProtocol.js";
import { runAgentTurn } from "../runtime/agentLoop.js";
import { withToolContext } from "../runtime/tools/context.js";
import { WhatsAppClient } from "./whatsappClient.js";
import { WhatsAppSessionManager } from "./sessionManager.js";
import { resolveConfig } from "../runtime/config/loadConfig.js";
import { evaluateSendPolicy } from "../runtime/session/sendPolicy.js";
import { resetSessionWithArchive, compactSessionWithSummary } from "../runtime/session/resetHelpers.js";

/**
 * Handles routing WhatsApp messages to the agent and formatting responses
 */
export class WhatsAppMessageHandler {
  private client: WhatsAppClient;
  private sessionManager: WhatsAppSessionManager;
  private registry: ToolRegistry;
  private workspaceDir: string;
  private repoRoot: string;
  private processingMessages: Set<string> = new Set();

  constructor(
    client: WhatsAppClient,
    sessionManager: WhatsAppSessionManager,
    registry: ToolRegistry,
    workspaceDir: string,
    repoRoot: string
  ) {
    this.client = client;
    this.sessionManager = sessionManager;
    this.registry = registry;
    this.workspaceDir = workspaceDir;
    this.repoRoot = repoRoot;
  }

  /**
   * Handle an incoming WhatsApp message
   */
  async handleMessage(message: WhatsAppMessage): Promise<void> {
    // Prevent duplicate processing
    if (this.processingMessages.has(message.messageId)) {
      return;
    }

    this.processingMessages.add(message.messageId);

    try {
      // Handle special commands
      if (message.text.startsWith("/")) {
        await this.handleCommand(message);
        return;
      }

      // Get or create session for this chat
      const chatId = message.isGroup ? message.groupId! : message.from;
      const sessionId = this.sessionManager.getOrCreateSession({
        chatId,
        isGroup: message.isGroup,
        displayName: undefined
      });

      console.log(`[WhatsApp] Processing message from ${message.senderName} (session: ${sessionId})`);

      const cfg = resolveConfig({ repoRoot: this.repoRoot });
      const decision = evaluateSendPolicy({
        cfg,
        provider: "whatsapp",
        chatType: message.isGroup ? "group" : "direct",
        sessionId
      });
      if (!decision.allowed) {
        console.log(`[WhatsApp] Send policy blocked reply for session ${sessionId}`);
        return;
      }

      // Send typing indicator
      await this.sendTypingIndicator(message.from, true);

      // Collect agent response
      let responseText = "";
      let hasError = false;

      try {
        await withToolContext(
          {
            sessionId,
            workspaceDir: this.workspaceDir,
            repoRoot: this.repoRoot,
            replyTarget: {
              kind: "gateway",
              provider: "whatsapp",
              chatId: message.isGroup ? message.groupId || message.from : message.from,
              chatType: message.isGroup ? "group" : "direct"
            }
          },
          async () => {
            for await (const chunk of runAgentTurn({
              userInput: message.text,
              registry: this.registry,
              sessionId,
              signal: new AbortController().signal
            })) {
              responseText += this.formatChunkForWhatsApp(chunk);
            }
          }
        );
      } catch (error) {
        console.error("[WhatsApp] Agent error:", error);
        hasError = true;
        responseText = "Sorry, I encountered an error processing your request. Please try again.";
      }

      // Send typing indicator off
      await this.sendTypingIndicator(message.from, false);

      // Send response (split into chunks if too long)
      if (responseText.trim()) {
        await this.sendLongMessage(message.from, responseText, message.messageId);
      } else if (!hasError) {
        await this.client.sendMessage(message.from, "✓ Done");
      }

    } finally {
      this.processingMessages.delete(message.messageId);
    }
  }

  /**
   * Handle special WhatsApp commands
   */
  private async handleCommand(message: WhatsAppMessage): Promise<void> {
    const command = message.text.toLowerCase().trim();
    const chatId = message.isGroup ? message.groupId! : message.from;
    const cfg = resolveConfig({ repoRoot: this.repoRoot });

    switch (command) {
      case "/status":
        const stats = this.sessionManager.getStats();
        await this.client.sendMessage(
          message.from,
          `🤖 FF-Terminal Status\n\n` +
          `Active sessions (24h): ${stats.activeLast24h}\n` +
          `Active sessions (7d): ${stats.activeLast7d}\n` +
          `Total sessions: ${stats.totalSessions}`
        );
        break;

      case "/new":
      case "/reset":
        {
          const sessionId = this.sessionManager.getOrCreateSession({
            chatId,
            isGroup: message.isGroup,
            displayName: undefined
          });
          await resetSessionWithArchive({
            sessionId,
            workspaceDir: this.workspaceDir,
            repoRoot: this.repoRoot,
            cfg
          });
          await this.client.sendMessage(message.from, "✓ Started new conversation");
        }
        break;

      case "/compact":
        {
          const sessionId = this.sessionManager.getOrCreateSession({
            chatId,
            isGroup: message.isGroup,
            displayName: undefined
          });
          const result = await compactSessionWithSummary({
            sessionId,
            workspaceDir: this.workspaceDir,
            repoRoot: this.repoRoot,
            cfg
          });
          const suffix = result.summarizedCount > 0
            ? ` (${result.summarizedCount} messages summarized)`
            : " (no changes needed)";
          await this.client.sendMessage(message.from, `✓ Session compacted${suffix}`);
        }
        break;

      case "/help":
        await this.client.sendMessage(
          message.from,
          `🤖 FF-Terminal WhatsApp Bot\n\n` +
          `Commands:\n` +
          `/help - Show this help\n` +
          `/status - Show bot status\n` +
          `/new - Start new conversation\n` +
          `/reset - Reset conversation\n` +
          `/compact - Summarize older history\n\n` +
          `Just send a message to chat with the AI assistant!`
        );
        break;

      default:
        await this.client.sendMessage(
          message.from,
          `Unknown command. Send /help for available commands.`
        );
    }
  }

  /**
   * Format agent stream chunk for WhatsApp
   */
  private formatChunkForWhatsApp(chunk: StreamChunk): string {
    switch (chunk.kind) {
      case "content":
        return chunk.delta || "";

      case "thinking":
        // Don't show thinking in WhatsApp
        return "";

      case "status":
        // Don't show status messages
        return "";

      case "error":
        console.error("[WhatsApp] Agent error:", chunk.message);
        return "";

      case "task_completed":
        // Task completed, no output
        return "";

      case "subagent_event":
        // Don't show subagent events
        return "";

      default:
        return "";
    }
  }

  /**
   * Send a long message, splitting it into chunks if necessary
   */
  private async sendLongMessage(to: string, text: string, replyToId?: string): Promise<void> {
    const maxLength = 4000; // WhatsApp message limit is ~4096 chars

    if (text.length <= maxLength) {
      if (replyToId) {
        await this.client.replyToMessage(to, text, replyToId);
      } else {
        await this.client.sendMessage(to, text);
      }
      return;
    }

    // Split into chunks at paragraph or sentence boundaries
    const chunks = this.splitIntoChunks(text, maxLength);

    for (let i = 0; i < chunks.length; i++) {
      const prefix = chunks.length > 1 ? `[${i + 1}/${chunks.length}]\n\n` : "";
      const chunk = prefix + chunks[i];

      if (i === 0 && replyToId) {
        await this.client.replyToMessage(to, chunk, replyToId);
      } else {
        await this.client.sendMessage(to, chunk);
      }

      // Small delay between chunks
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  /**
   * Split text into chunks at natural boundaries
   */
  private splitIntoChunks(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let currentChunk = "";

    const paragraphs = text.split("\n\n");

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length + 2 <= maxLength) {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        if (paragraph.length > maxLength) {
          // Split long paragraph at sentence boundaries
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
          currentChunk = "";

          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length <= maxLength) {
              currentChunk += sentence;
            } else {
              if (currentChunk) {
                chunks.push(currentChunk);
              }
              currentChunk = sentence;
            }
          }
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Send typing indicator
   */
  private async sendTypingIndicator(to: string, isTyping: boolean): Promise<void> {
    try {
      const socket = this.client.getSocket();
      if (socket) {
        await socket.sendPresenceUpdate(isTyping ? "composing" : "paused", to);
      }
    } catch (error) {
      // Ignore typing indicator errors
    }
  }
}
