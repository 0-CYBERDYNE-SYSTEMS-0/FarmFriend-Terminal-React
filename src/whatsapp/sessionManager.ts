import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { WhatsAppSession } from "./types.js";
import type { SessionMode } from "../runtime/session/sessionPolicy.js";
import { resolveMainSessionId, resolveSessionMode } from "../runtime/session/sessionPolicy.js";

/**
 * Manages mapping between WhatsApp chats and FF-Terminal sessions
 */
export class WhatsAppSessionManager {
  private sessionsPath: string;
  private sessions: Map<string, WhatsAppSession> = new Map();
  private sessionMode: SessionMode;
  private mainSessionId: string;

  constructor(workspaceDir: string, opts?: { sessionMode?: SessionMode; mainSessionId?: string }) {
    this.sessionsPath = path.join(workspaceDir, "whatsapp", "sessions.json");
    this.sessionMode = opts?.sessionMode ?? resolveSessionMode();
    this.mainSessionId = opts?.mainSessionId ?? resolveMainSessionId();
    this.ensureFile();
    this.loadSessions();
  }

  private ensureFile(): void {
    const dir = path.dirname(this.sessionsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.sessionsPath)) {
      fs.writeFileSync(this.sessionsPath, JSON.stringify({}, null, 2));
    }
  }

  private loadSessions(): void {
    try {
      const data = fs.readFileSync(this.sessionsPath, "utf8");
      const obj = JSON.parse(data);
      this.sessions = new Map(Object.entries(obj));
    } catch (error) {
      console.error("[WhatsApp SessionManager] Failed to load sessions:", error);
      this.sessions = new Map();
    }
  }

  private saveSessions(): void {
    try {
      const obj = Object.fromEntries(this.sessions);
      fs.writeFileSync(this.sessionsPath, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error("[WhatsApp SessionManager] Failed to save sessions:", error);
    }
  }

  /**
   * Get or create a session ID for a WhatsApp chat
   */
  getOrCreateSession(phoneNumber: string): string {
    const existing = this.sessions.get(phoneNumber);

    if (existing) {
      // Update last activity
      existing.lastActivity = Date.now();
      existing.messageCount++;
      this.saveSessions();
      return existing.sessionId;
    }

    // Create new session
    const sessionId = this.sessionMode === "main" ? this.mainSessionId : randomUUID();
    const session: WhatsAppSession = {
      sessionId,
      phoneNumber,
      lastActivity: Date.now(),
      messageCount: 1
    };

    this.sessions.set(phoneNumber, session);
    this.saveSessions();

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
    if (this.sessionMode === "main") {
      const sessionId = this.mainSessionId;
      const session: WhatsAppSession = {
        sessionId,
        phoneNumber,
        lastActivity: Date.now(),
        messageCount: 1
      };
      this.sessions.set(phoneNumber, session);
      this.saveSessions();
      return sessionId;
    }
    this.sessions.delete(phoneNumber);
    this.saveSessions();
    return this.getOrCreateSession(phoneNumber);
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

    for (const [phoneNumber, session] of this.sessions.entries()) {
      if (session.lastActivity < sevenDaysAgo) {
        this.sessions.delete(phoneNumber);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[WhatsApp SessionManager] Cleaned up ${cleaned} old sessions`);
      this.saveSessions();
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
