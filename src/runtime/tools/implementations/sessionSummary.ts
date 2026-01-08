import fs from "node:fs";
import path from "node:path";
import { getToolContext } from "../context.js";
import { resolveWorkspaceDir } from "../../config/paths.js";

type Args = {
  action?: "write" | "read" | "append" | string;
  accomplishments?: string;
  decisions?: string;
  next_steps?: string;
  context?: string;
  project_name?: string;
};

function buildSummary(args: Args): string {
  const now = new Date().toISOString();
  const project = (args.project_name || "").trim();
  const header = `# Memory Summary${project ? ` — ${project}` : ""}\n\n_Last updated: ${now}_\n`;

  const sections: Array<[string, string]> = [
    ["Accomplishments", String(args.accomplishments || "").trim()],
    ["Decisions", String(args.decisions || "").trim()],
    ["Next Steps", String(args.next_steps || "").trim()],
    ["Context", String(args.context || "").trim()]
  ];

  const body = sections
    .filter(([, v]) => v.length)
    .map(([k, v]) => `\n\n## ${k}\n\n${v}\n`)
    .join("");

  return `${header}${body || "\n\n## Notes\n\n(Empty)\n"}`;
}

export async function sessionSummaryTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as Args;
  const action = String(args?.action || "").trim().toLowerCase();
  if (!action) throw new Error("session_summary: missing args.action");

  const ctx = getToolContext();
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
  const filePath = path.join(workspaceDir, "MEMORY.md");
  const dailyDir = path.join(workspaceDir, "memory");
  const day = new Date().toISOString().slice(0, 10);
  const dailyPath = path.join(dailyDir, `${day}.md`);

  if (action === "read") {
    if (!fs.existsSync(filePath)) return "";
    return fs.readFileSync(filePath, "utf8");
  }

  if (action === "write") {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const content = buildSummary(args);
    fs.writeFileSync(filePath, content, "utf8");
    const now = new Date().toISOString();
    fs.mkdirSync(dailyDir, { recursive: true });
    if (!fs.existsSync(dailyPath)) {
      fs.writeFileSync(dailyPath, `# Memory Log - ${day}\n\n`, "utf8");
    }
    fs.appendFileSync(dailyPath, `\n---\n${now}\n\nUpdated MEMORY.md\n`, "utf8");
    return JSON.stringify({ ok: true, action, path: filePath }, null, 2);
  }

  if (action === "append") {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const now = new Date().toISOString();
    const parts: string[] = [];
    if (args.accomplishments) parts.push(`### Accomplishments\n${String(args.accomplishments).trim()}`);
    if (args.decisions) parts.push(`### Decisions\n${String(args.decisions).trim()}`);
    if (args.next_steps) parts.push(`### Next Steps\n${String(args.next_steps).trim()}`);
    if (args.context) parts.push(`### Context\n${String(args.context).trim()}`);
    const block = `\n\n---\n${now}\n\n${parts.join("\n\n")}\n`;
    fs.appendFileSync(filePath, block, "utf8");
    fs.mkdirSync(dailyDir, { recursive: true });
    if (!fs.existsSync(dailyPath)) {
      fs.writeFileSync(dailyPath, `# Memory Log - ${day}\n\n`, "utf8");
    }
    fs.appendFileSync(dailyPath, block, "utf8");
    return JSON.stringify({ ok: true, action, path: filePath }, null, 2);
  }

  throw new Error(`session_summary: unknown action "${action}"`);
}
