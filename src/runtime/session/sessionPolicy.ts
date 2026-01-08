import fs from "node:fs";
import path from "node:path";
import { newId, isValidSessionId } from "../../shared/ids.js";
import type { RuntimeConfig } from "../config/loadConfig.js";

export type SessionMode = "main" | "last" | "new";

export function resolveSessionMode(cfg?: RuntimeConfig): SessionMode {
  const raw = String((cfg as any)?.session_mode || process.env.FF_SESSION_MODE || "").trim().toLowerCase();
  if (raw === "main" || raw === "last" || raw === "new") return raw;
  return "main";
}

export function resolveMainSessionId(cfg?: RuntimeConfig): string {
  const raw = String((cfg as any)?.main_session_id || process.env.FF_MAIN_SESSION_ID || "main").trim();
  return raw || "main";
}

export function loadLastActiveSession(workspaceDir: string): string | null {
  try {
    const filePath = path.join(workspaceDir, ".last-session-id");
    if (!fs.existsSync(filePath)) return null;

    const sessionId = fs.readFileSync(filePath, "utf8").trim();
    if (!isValidSessionId(sessionId)) {
      cleanupLastActiveSession(workspaceDir);
      return null;
    }

    const sessionPath = path.join(workspaceDir, "sessions", `${sessionId}.json`);
    if (!fs.existsSync(sessionPath)) {
      cleanupLastActiveSession(workspaceDir);
      return null;
    }

    return sessionId;
  } catch {
    return null;
  }
}

export function saveLastActiveSession(workspaceDir: string, sessionId: string): void {
  try {
    const filePath = path.join(workspaceDir, ".last-session-id");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, sessionId, "utf8");
  } catch {
    // ignore
  }
}

export function cleanupLastActiveSession(workspaceDir: string): void {
  try {
    const filePath = path.join(workspaceDir, ".last-session-id");
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}

export function resolveSessionId(params: {
  requested?: string | null;
  workspaceDir: string;
  cfg?: RuntimeConfig;
  mode?: SessionMode;
}): string {
  const requested = String(params.requested || "").trim();
  if (requested) return requested;

  const mode = params.mode ?? resolveSessionMode(params.cfg);
  if (mode === "new") return newId("session");
  if (mode === "main") return resolveMainSessionId(params.cfg);

  const last = loadLastActiveSession(params.workspaceDir);
  if (last) return last;

  return resolveMainSessionId(params.cfg) || newId("session");
}
