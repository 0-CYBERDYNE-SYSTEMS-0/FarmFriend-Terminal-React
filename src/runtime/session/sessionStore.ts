import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveWorkspaceDir } from "../config/paths.js";

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
  stats?: {
    totalMessages: number;
    totalTokens?: number;
    createdAt: string;
    lastActiveAt: string;
    archivedCount?: number;
  };
  meta?: Record<string, unknown> & {
    overrides?: {
      model?: string;
      thinkingLevel?: string;
      verboseLevel?: string;
      reasoningLevel?: string;
    };
  };
};

export function defaultSessionDir(workspaceDir?: string): string {
  const workspaceRoot = resolveWorkspaceDir(workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
  return path.join(workspaceRoot, "sessions");
}

export function legacySessionDir(): string {
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
    try {
      const legacyPath = sessionPath(sessionId, legacySessionDir());
      return JSON.parse(fs.readFileSync(legacyPath, "utf8")) as SessionFile;
    } catch {
      return null;
    }
  }
}

export function createSession(sessionId: string): SessionFile {
  const now = new Date().toISOString();
  return {
    version: 1,
    session_id: sessionId,
    created_at: now,
    updated_at: now,
    conversation: [],
    stats: {
      totalMessages: 0,
      totalTokens: 0,
      createdAt: now,
      lastActiveAt: now,
      archivedCount: 0
    }
  };
}

function estimateTokensForConversation(messages: ConversationMessage[]): number {
  let total = 0;
  for (const m of messages) {
    const text = m.content || "";
    total += Math.max(1, Math.ceil(text.length / 4));
  }
  return total;
}

export function saveSession(session: SessionFile, sessionDir = defaultSessionDir()): void {
  const p = sessionPath(session.session_id, sessionDir);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const now = new Date().toISOString();
  session.updated_at = now;
  if (!session.stats) {
    session.stats = {
      totalMessages: session.conversation.length,
      totalTokens: estimateTokensForConversation(session.conversation),
      createdAt: session.created_at || now,
      lastActiveAt: now,
      archivedCount: 0
    };
  }
  session.stats.totalMessages = session.conversation.length;
  session.stats.totalTokens = estimateTokensForConversation(session.conversation);
  session.stats.lastActiveAt = now;
  fs.writeFileSync(p, JSON.stringify(session, null, 2) + "\n", "utf8");
}

export function appendSessionMessage(
  sessionId: string,
  message: ConversationMessage,
  sessionDir = defaultSessionDir()
): SessionFile {
  const session = loadSession(sessionId, sessionDir) || createSession(sessionId);
  session.conversation.push(message);
  saveSession(session, sessionDir);
  return session;
}
