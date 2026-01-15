export function rawDataToString(data: unknown): string {
  if (typeof data === "string") return data;
  if (data instanceof Buffer) return data.toString("utf8");
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  if (Array.isArray(data)) return Buffer.concat(data as Buffer[]).toString("utf8");
  return String(data ?? "");
}

export function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
