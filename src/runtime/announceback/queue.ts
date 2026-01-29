import fs from "node:fs";
import path from "node:path";
import { newId } from "../../shared/ids.js";

export type AnnouncebackTarget =
  | { kind: "daemon"; sessionId: string }
  | { kind: "gateway"; provider: "telegram" | "whatsapp"; chatId: string; chatType?: "direct" | "group" };

export type AnnouncebackEvent = {
  id: string;
  createdAt: string;
  target: AnnouncebackTarget;
  message: string;
  label?: string;
  parentSessionId?: string;
  sourceSessionId?: string;
};

export type AnnouncebackRequest = {
  target: AnnouncebackTarget;
  label?: string;
  prefix?: string;
  parentSessionId?: string;
  sourceSessionId?: string;
};

function queueDir(workspaceDir: string, kind: AnnouncebackTarget["kind"]): string {
  return path.join(workspaceDir, "announceback", kind);
}

export function enqueueAnnounceback(workspaceDir: string, event: AnnouncebackEvent): { id: string; path: string } {
  const dir = queueDir(workspaceDir, event.target.kind);
  fs.mkdirSync(dir, { recursive: true });
  const id = event.id || newId("announce");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(dir, `${stamp}_${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify({ ...event, id }, null, 2) + "\n", "utf8");
  return { id, path: filePath };
}

export function drainAnnounceback(
  workspaceDir: string,
  kind: AnnouncebackTarget["kind"],
  limit = 50
): AnnouncebackEvent[] {
  const dir = queueDir(workspaceDir, kind);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const events: AnnouncebackEvent[] = [];
  for (const file of files.slice(0, Math.max(1, limit))) {
    const filePath = path.join(dir, file);
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as AnnouncebackEvent;
      if (parsed?.target?.kind === kind && typeof parsed?.message === "string") {
        events.push(parsed);
      }
    } catch {
      // ignore malformed entries
    }
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore delete failures
    }
  }
  return events;
}
