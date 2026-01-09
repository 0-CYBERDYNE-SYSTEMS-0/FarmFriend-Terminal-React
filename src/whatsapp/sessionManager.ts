import type { WhatsAppSession } from "./types.js";
import type { SessionMode } from "../runtime/session/sessionPolicy.js";
import { resolveMainSessionId, resolveSessionMode } from "../runtime/session/sessionPolicy.js";
import { buildSessionKey } from "../runtime/session/sessionKey.js";
import { getOrCreateSessionIdForKey, listSessionIndex, removeSessionIndexKeys } from "../runtime/session/sessionIndex.js";
import { resolveConfig, type RuntimeConfig } from "../runtime/config/loadConfig.js";
import { findRepoRoot } from "../runtime/config/repoRoot.js";
import { newId } from "../shared/ids.js";

/**
 * Manages mapping between WhatsApp chats and FF-Terminal sessions
 */
export class WhatsAppSessionManager {
  private sessions: Map<string, WhatsAppSession> = new Map();
  private sessionMode: SessionMode;
  private mainSessionId: string;
  private cfg: RuntimeConfig;
  private workspaceDir: string;
  private repoRoot: string;

  constructor(workspaceDir: string, opts?: { sessionMode?: SessionMode; mainSessionId?: string; repoRoot?: string; cfg?: RuntimeConfig }) {
    this.workspaceDir = workspaceDir;
    this.repoRoot = opts?.repoRoot ?? findRepoRoot();
    this.sessionMode = opts?.sessionMode ?? resolveSessionMode();
    this.mainSessionId = opts?.mainSessionId ?? resolveMainSessionId();
    this.cfg = opts?.cfg ?? resolveConfig({ repoRoot: this.repoRoot });
    this.loadSessions();
  }

  private loadSessions(): void {
    try {
      const entries = listSessionIndex(this.workspaceDir);
      const map = new Map<string, WhatsAppSession>();
      for (const entry of entries) {
        if (entry.provider !== "whatsapp") continue;
        map.set(entry.sessionKey, {
          sessionId: entry.sessionId,
          phoneNumber: entry.sessionKey,
          lastActivity: Date.parse(entry.updatedAt || "") || Date.now(),
          messageCount: 0
        });
      }
      this.sessions = map;
    } catch (error) {
      console.error("[WhatsApp SessionManager] Failed to load sessions:", error);
      this.sessions = new Map();
    }
  }

  /**
   * Get or create a session ID for a WhatsApp chat
   */
  getOrCreateSession(params: { chatId: string; isGroup: boolean; displayName?: string }): string {
    if (this.sessionMode === "new") {
      return newId("session");
    }
    const provider = "whatsapp";
    const chatType = params.isGroup ? "group" : "direct";
    const sessionKey = buildSessionKey({
      cfg: this.cfg,
      provider,
      chatType,
      chatId: params.chatId
    });
    const resolvedKey = this.sessionMode === "main" && chatType === "direct" ? "main" : sessionKey;
    const { sessionId } = getOrCreateSessionIdForKey({
      workspaceDir: this.workspaceDir,
      cfg: this.cfg,
      sessionKey: resolvedKey,
      provider,
      chatType,
      displayName: params.displayName
    });
    const existing = this.sessions.get(resolvedKey);
    if (existing) {
      existing.lastActivity = Date.now();
      existing.messageCount++;
      existing.sessionId = sessionId;
      this.sessions.set(resolvedKey, existing);
      return sessionId;
    }
    const session: WhatsAppSession = {
      sessionId,
      phoneNumber: resolvedKey,
      lastActivity: Date.now(),
      messageCount: 1
    };
    this.sessions.set(resolvedKey, session);
    return sessionId;
  }

  /**
   * Get session ID for a phone number
   */
  getSessionId(phoneNumber: string): string | null {
    return this.sessions.get(phoneNumber)?.sessionId || null;
  }

  /**
   * Reset a session (create new session ID for phone number)
   */
  resetSession(phoneNumber: string): string {
    this.sessions.delete(phoneNumber);
    return this.getOrCreateSession({ chatId: phoneNumber, isGroup: phoneNumber.includes(":group:"), displayName: undefined });
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): WhatsAppSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clean up old sessions (inactive for more than 7 days)
   */
  cleanupOldSessions(): void {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    let cleaned = 0;
    const removedKeys: string[] = [];

    for (const [phoneNumber, session] of this.sessions.entries()) {
      if (session.lastActivity < sevenDaysAgo) {
        this.sessions.delete(phoneNumber);
        cleaned++;
        removedKeys.push(phoneNumber);
      }
    }

    if (cleaned > 0) {
      console.log(`[WhatsApp SessionManager] Cleaned up ${cleaned} old sessions`);
      removeSessionIndexKeys(this.workspaceDir, removedKeys);
    }
  }

  /**
   * Get statistics about sessions
   */
  getStats(): {
    totalSessions: number;
    activeLast24h: number;
    activeLast7d: number;
  } {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    let activeLast24h = 0;
    let activeLast7d = 0;

    for (const session of this.sessions.values()) {
      if (session.lastActivity > oneDayAgo) {
        activeLast24h++;
      }
      if (session.lastActivity > sevenDaysAgo) {
        activeLast7d++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeLast24h,
      activeLast7d
    };
  }
}
