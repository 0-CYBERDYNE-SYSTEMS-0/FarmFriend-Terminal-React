import fs from "node:fs";
import path from "node:path";
import { newId } from "../../shared/ids.js";
import { resolveMainSessionId } from "./sessionPolicy.js";
import type { RuntimeConfig } from "../config/loadConfig.js";

export type SessionIndexEntry = {
  sessionKey: string;
  sessionId: string;
  updatedAt: string;
  lastActiveAt?: string;
  createdAt?: string;
  provider?: string;
  chatType?: "direct" | "group" | "unknown";
  displayName?: string;
  totalMessages?: number;
  totalTokens?: number;
  overrides?: Record<string, unknown>;
};

type SessionIndex = Record<string, SessionIndexEntry>;

function indexPath(workspaceDir: string): string {
  return path.join(workspaceDir, "sessions", "index.json");
}

function loadIndex(workspaceDir: string): SessionIndex {
  const p = indexPath(workspaceDir);
  try {
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, "utf8")) as SessionIndex;
  } catch {
    return {};
  }
}

function saveIndex(workspaceDir: string, index: SessionIndex): void {
  const p = indexPath(workspaceDir);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(index, null, 2) + "\n", "utf8");
}

function findEntryBySessionId(index: SessionIndex, sessionId: string): SessionIndexEntry | null {
  for (const entry of Object.values(index)) {
    if (entry.sessionId === sessionId) return entry;
  }
  return null;
}

export function getOrCreateSessionIdForKey(params: {
  workspaceDir: string;
  cfg: RuntimeConfig;
  sessionKey: string;
  provider?: string;
  chatType?: "direct" | "group" | "unknown";
  displayName?: string;
}): { sessionId: string; entry: SessionIndexEntry } {
  const index = loadIndex(params.workspaceDir);
  const existing = index[params.sessionKey];
  const now = new Date().toISOString();

  if (existing?.sessionId) {
    existing.updatedAt = now;
    existing.lastActiveAt = existing.lastActiveAt || now;
    existing.createdAt = existing.createdAt || now;
    if (params.provider) existing.provider = params.provider;
    if (params.chatType) existing.chatType = params.chatType;
    if (params.displayName) existing.displayName = params.displayName;
    index[params.sessionKey] = existing;
    saveIndex(params.workspaceDir, index);
    return { sessionId: existing.sessionId, entry: existing };
  }

  const mainSessionId = resolveMainSessionId(params.cfg);
  const sessionId = params.sessionKey === "main" ? mainSessionId : newId("session");
  const entry: SessionIndexEntry = {
    sessionKey: params.sessionKey,
    sessionId,
    updatedAt: now,
    lastActiveAt: now,
    createdAt: now,
    provider: params.provider,
    chatType: params.chatType,
    displayName: params.displayName
  };
  index[params.sessionKey] = entry;
  saveIndex(params.workspaceDir, index);
  return { sessionId, entry };
}

export function upsertSessionIndexEntry(params: {
  workspaceDir: string;
  sessionId: string;
  sessionKey?: string;
  provider?: string;
  chatType?: "direct" | "group" | "unknown";
  displayName?: string;
  updatedAt?: string;
  lastActiveAt?: string;
  createdAt?: string;
  totalMessages?: number;
  totalTokens?: number;
  overrides?: Record<string, unknown>;
}): SessionIndexEntry {
  const index = loadIndex(params.workspaceDir);
  const now = params.updatedAt || new Date().toISOString();
  let key = params.sessionKey?.trim();
  let entry = key ? index[key] : null;
  if (!entry && !key) {
    entry = findEntryBySessionId(index, params.sessionId);
    if (entry) key = entry.sessionKey;
  }
  if (!key) key = params.sessionId;
  const next: SessionIndexEntry = {
    sessionKey: key,
    sessionId: params.sessionId,
    updatedAt: now,
    lastActiveAt: params.lastActiveAt || entry?.lastActiveAt || now,
    createdAt: params.createdAt || entry?.createdAt,
    provider: params.provider || entry?.provider,
    chatType: params.chatType || entry?.chatType,
    displayName: params.displayName || entry?.displayName,
    totalMessages: typeof params.totalMessages === "number" ? params.totalMessages : entry?.totalMessages,
    totalTokens: typeof params.totalTokens === "number" ? params.totalTokens : entry?.totalTokens,
    overrides: params.overrides ?? entry?.overrides
  };
  index[key] = next;
  saveIndex(params.workspaceDir, index);
  return next;
}

export function listSessionIndex(workspaceDir: string): SessionIndexEntry[] {
  const index = loadIndex(workspaceDir);
  return Object.values(index).sort((a, b) => String(b.updatedAt || b.lastActiveAt || "").localeCompare(String(a.updatedAt || a.lastActiveAt || "")));
}

export function removeSessionIndexKeys(workspaceDir: string, keys: string[]): void {
  if (!keys.length) return;
  const index = loadIndex(workspaceDir);
  let changed = false;
  for (const key of keys) {
    if (index[key]) {
      delete index[key];
      changed = true;
    }
  }
  if (changed) saveIndex(workspaceDir, index);
}
