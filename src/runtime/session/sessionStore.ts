import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type Role = "system" | "developer" | "user" | "assistant" | "tool";

export type ConversationMessage = {
  role: Role;
  content: string;
  created_at: string;
};

export type SessionFile = {
  version: 1;
  session_id: string;
  created_at: string;
  updated_at: string;
  conversation: ConversationMessage[];
  meta?: Record<string, unknown>;
};

export function defaultSessionDir(): string {
  return path.join(os.homedir(), ".ff-terminal", "sessions");
}

export function sessionPath(sessionId: string, sessionDir = defaultSessionDir()): string {
  return path.join(sessionDir, `${sessionId}.json`);
}

export function loadSession(sessionId: string, sessionDir = defaultSessionDir()): SessionFile | null {
  const p = sessionPath(sessionId, sessionDir);
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as SessionFile;
  } catch {
    return null;
  }
}

export function createSession(sessionId: string): SessionFile {
  const now = new Date().toISOString();
  return { version: 1, session_id: sessionId, created_at: now, updated_at: now, conversation: [] };
}

export function saveSession(session: SessionFile, sessionDir = defaultSessionDir()): void {
  const p = sessionPath(session.session_id, sessionDir);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  session.updated_at = new Date().toISOString();
  fs.writeFileSync(p, JSON.stringify(session, null, 2) + "\n", "utf8");
}

