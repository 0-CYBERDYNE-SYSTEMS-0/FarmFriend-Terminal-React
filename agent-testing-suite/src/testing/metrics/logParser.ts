import fs from "node:fs";
import path from "node:path";
import { LogEvent } from "../types.js";

/**
 * Parse JSONL session logs into structured events
 */
export class LogParser {
  private workspaceDir: string;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
  }

  /**
   * Parse session JSONL file into LogEvent array
   */
  async parseSession(sessionId: string): Promise<LogEvent[]> {
    const sessionLogPath = path.join(
      this.workspaceDir,
      "logs",
      "sessions",
      `${sessionId}.jsonl`
    );

    if (!fs.existsSync(sessionLogPath)) {
      return [];
    }

    const content = fs.readFileSync(sessionLogPath, "utf-8");
    const lines = content.trim().split("\n");

    const events: LogEvent[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as LogEvent;
        events.push(parsed);
      } catch (err) {
        // Skip malformed log lines
        continue;
      }
    }

    return events;
  }

  /**
   * Parse tool execution log file
   */
  async parseToolLog(sessionId: string): Promise<LogEvent[]> {
    const toolLogPath = path.join(
      this.workspaceDir,
      "logs",
      "hooks",
      `tools_${sessionId}.jsonl`
    );

    if (!fs.existsSync(toolLogPath)) {
      return [];
    }

    const content = fs.readFileSync(toolLogPath, "utf-8");
    const lines = content.trim().split("\n");

    const events: LogEvent[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as LogEvent;
        events.push(parsed);
      } catch {
        continue;
      }
    }

    return events;
  }

  /**
   * Filter events by type
   */
  filterByEvent(events: LogEvent[], eventType: string): LogEvent[] {
    return events.filter((e) => e.event === eventType);
  }

  /**
   * Filter events by session
   */
  filterBySession(events: LogEvent[], sessionId: string): LogEvent[] {
    return events.filter((e) => e.session_id === sessionId);
  }

  /**
   * Filter events by turn
   */
  filterByTurn(events: LogEvent[], turnId: string): LogEvent[] {
    return events.filter((e) => e.turn_id === turnId);
  }

  /**
   * Get unique session IDs from events
   */
  getSessionIds(events: LogEvent[]): string[] {
    const ids = new Set(events.map((e) => e.session_id));
    return Array.from(ids);
  }

  /**
   * Get unique turn IDs for a session
   */
  getTurnIds(events: LogEvent[], sessionId: string): string[] {
    const sessionEvents = this.filterBySession(events, sessionId);
    const ids = new Set(
      sessionEvents
        .filter((e) => e.turn_id)
        .map((e) => e.turn_id!)
    );
    return Array.from(ids);
  }
}
