import fs from "node:fs";
import path from "node:path";
import { newId } from "../../shared/ids.js";
import { resolveMainSessionId } from "./sessionPolicy.js";
import type { RuntimeConfig } from "../config/loadConfig.js";

export type SessionIndexEntry = {
  sessionKey: string;
  sessionId: string;
  updatedAt: string;
  provider?: string;
  chatType?: "direct" | "group" | "unknown";
  displayName?: string;
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
    provider: params.provider,
    chatType: params.chatType,
    displayName: params.displayName
  };
  index[params.sessionKey] = entry;
  saveIndex(params.workspaceDir, index);
  return { sessionId, entry };
}

export function listSessionIndex(workspaceDir: string): SessionIndexEntry[] {
  const index = loadIndex(workspaceDir);
  return Object.values(index).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
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
