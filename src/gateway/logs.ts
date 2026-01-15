import fs from "node:fs";

function tailLines(raw: string, limit: number): string[] {
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length <= limit) return lines;
  return lines.slice(lines.length - limit);
}

export function tailJsonLines(filePath: string, limit: number): Array<Record<string, any> | { raw: string }> {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = tailLines(raw, limit);
  return lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { raw: line };
    }
  });
}
