import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50
};

type LoggerOpts = {
  filePath: string;
  level?: LogLevel;
  maxBytes?: number;
  retention?: number;
};

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_RETENTION = 3;

export function parseLogLevel(raw?: unknown): LogLevel {
  const val = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (val === "trace" || val === "debug" || val === "info" || val === "warn" || val === "error") return val;
  return "info";
}

export function redactValue(value: unknown): unknown {
  // Only redact when the entire key is sensitive (not just containing the substring),
  // so nested objects like `credentials.api_key` remain traversable and get redacted at the leaf.
  const KEY_RE = /^(api_?key|token|password|secret|authorization|cookie|credential|bearer|session|jwt)$/i;

  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length >= 16) return "[REDACTED]";
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(redactValue);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as any)) {
      out[k] = KEY_RE.test(k) ? "[REDACTED]" : redactValue(v);
    }
    return out;
  }
  return String(value);
}

export function truncateForLog(text: string, maxLen = 800): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + `...(${text.length} chars)`;
}

export function hashPreview(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export class StructuredLogger {
  private filePath: string;
  private level: LogLevel;
  private maxBytes: number;
  private retention: number;

  constructor(opts: LoggerOpts) {
    this.filePath = path.resolve(opts.filePath);
    this.level = opts.level ?? "info";
    this.maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
    this.retention = Math.max(1, Math.min(opts.retention ?? DEFAULT_RETENTION, 10));
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
  }

  /**
   * Log an event with structured data.
   *
   * NOTE: This method is intentionally fire-and-forget (synchronous return,
   * async I/O) to avoid blocking agent loops. Logs are eventually consistent
   * with a slight delay. In rare cases (process exit immediately after log),
   * the final log entry may be lost. This is an acceptable trade-off for
   * performance.
   */
  log(level: LogLevel, event: string, data?: Record<string, unknown>): void {
    if (!this.isEnabled(level)) return;
    const payload = {
      ts: new Date().toISOString(),
      level,
      event,
      ...data
    };
    const line = JSON.stringify(payload);
    this.rotateIfNeeded();
    // Fire-and-forget append to avoid blocking agent loops.
    fs.promises.appendFile(this.filePath, line + "\n").catch(() => {});
  }

  isEnabled(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[this.level];
  }

  private rotateIfNeeded(): void {
    try {
      const st = fs.statSync(this.filePath);
      if (st.size < this.maxBytes) return;
    } catch {
      return;
    }

    // Simple numeric rotation: file -> .1 -> .2 ...
    for (let i = this.retention; i >= 1; i -= 1) {
      const current = i === 1 ? this.filePath : `${this.filePath}.${i - 1}`;
      const next = `${this.filePath}.${i}`;
      if (fs.existsSync(current)) {
        try {
          fs.renameSync(current, next);
        } catch {
          // ignore rotation errors to avoid disrupting runtime
        }
      }
    }
  }
}
