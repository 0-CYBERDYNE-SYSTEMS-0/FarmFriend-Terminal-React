import { createSession, loadSession, saveSession, type SessionFile } from "./sessionStore.js";

export type SessionOverrides = {
  model?: string;
  thinkingLevel?: string;
  verboseLevel?: string;
  reasoningLevel?: string;
};

export type SessionOverridesPatch = Partial<Record<keyof SessionOverrides, string | null | undefined>>;

export function getSessionOverrides(session: SessionFile): SessionOverrides {
  const overrides = (session.meta as any)?.overrides;
  if (!overrides || typeof overrides !== "object") return {};
  return { ...overrides } as SessionOverrides;
}

export function applySessionOverrides(session: SessionFile, patch: SessionOverridesPatch): SessionFile {
  const existing = getSessionOverrides(session);
  const next: SessionOverrides = { ...existing };
  for (const [key, raw] of Object.entries(patch || {})) {
    if (!(key in next) && !["model", "thinkingLevel", "verboseLevel", "reasoningLevel"].includes(key)) continue;
    if (raw === null || raw === undefined || String(raw).trim() === "") {
      delete (next as any)[key];
      continue;
    }
    (next as any)[key] = String(raw).trim();
  }
  return {
    ...session,
    meta: {
      ...(session.meta || {}),
      overrides: next
    }
  };
}

export function patchSessionOverrides(params: {
  sessionId: string;
  sessionDir: string;
  patch: SessionOverridesPatch;
}): SessionFile {
  const existing = loadSession(params.sessionId, params.sessionDir) ?? createSession(params.sessionId);
  const updated = applySessionOverrides(existing, params.patch);
  saveSession(updated, params.sessionDir);
  return updated;
}
