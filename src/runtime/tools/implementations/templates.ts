import fs from "node:fs";
import path from "node:path";

import { getToolContext } from "../context.js";
import { findRepoRoot } from "../../config/repoRoot.js";
import { defaultWorkspaceDir, resolveWorkspaceDir } from "../../config/paths.js";

type ProjectTemplateType = "web-app" | "research" | "automation";

const TEMPLATES: Array<{ template_type: ProjectTemplateType; description: string }> = [
  { template_type: "web-app", description: "Minimal web app skeleton (README + basic structure)." },
  { template_type: "research", description: "Research notes + sources scaffold." },
  { template_type: "automation", description: "Automation script scaffold (node + README)." }
];

function isSafeName(name: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,63}$/.test(name);
}

function resolveWorkspace(params: { workspacePath?: string; repoRoot: string; workspaceDir: string }): string {
  const raw = String(params.workspacePath || "").trim();
  if (!raw) return params.workspaceDir;
  const abs = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(params.workspaceDir, raw);

  const allowedRoots = [params.repoRoot, params.workspaceDir].map((r) => (r.endsWith(path.sep) ? r : r + path.sep));
  const ok = allowedRoots.some((r) => abs === r.slice(0, -1) || abs.startsWith(r));
  if (!ok) {
    throw new Error(
      `project_template: blocked (workspace_path must be under repo root or ff-terminal workspace)\n- repo: ${params.repoRoot}\n- workspace: ${params.workspaceDir}\n- got: ${abs}`
    );
  }
  return abs;
}

function writeFile(abs: string, content: string): void {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
}

export async function listTemplatesTool(): Promise<string> {
  return JSON.stringify({ templates: TEMPLATES }, null, 2);
}

export async function projectTemplateTool(argsRaw: unknown): Promise<string> {
  const args = argsRaw as { template_type?: string; project_name?: string; workspace_path?: string };
  const templateType = String(args?.template_type || "").trim() as ProjectTemplateType;
  const projectName = String(args?.project_name || "").trim();
  const customWorkspace = typeof args?.workspace_path === "string" ? args.workspace_path : undefined;

  if (!templateType) throw new Error("project_template: missing args.template_type");
  if (!projectName) throw new Error("project_template: missing args.project_name");
  if (!isSafeName(projectName)) throw new Error("project_template: project_name must be kebab-case (letters/numbers/dashes), 2-64 chars");

  const known = new Set(TEMPLATES.map((t) => t.template_type));
  if (!known.has(templateType)) {
    throw new Error(`project_template: unknown template_type: ${templateType}. Use one of: ${[...known].join(", ")}`);
  }

  const ctx = getToolContext();
  const repoRoot = path.resolve(ctx?.repoRoot ?? findRepoRoot());
  const workspaceDir = resolveWorkspaceDir(ctx?.workspaceDir ?? process.env.FF_WORKSPACE_DIR ?? undefined);
  const targetWorkspace = resolveWorkspace({ workspacePath: customWorkspace, repoRoot, workspaceDir });

  const outDir = path.join(targetWorkspace, "projects", projectName);
  if (fs.existsSync(outDir)) throw new Error(`project_template: destination exists: ${outDir}`);
  fs.mkdirSync(outDir, { recursive: true });

  const created: string[] = [];
  const add = (rel: string, content: string) => {
    const abs = path.join(outDir, rel);
    writeFile(abs, content);
    created.push(abs);
  };

  if (templateType === "web-app") {
    add(
      "README.md",
      `# ${projectName}\n\nCreated by FF-Terminal template: \`${templateType}\`.\n\n## Next\n- Add your app code under \`src/\`\n- Choose your bundler (Vite/Next/etc.)\n`
    );
    add("src/index.ts", `export const hello = () => "hello";\n`);
  } else if (templateType === "research") {
    add(
      "README.md",
      `# ${projectName}\n\nCreated by FF-Terminal template: \`${templateType}\`.\n\n## Files\n- \`notes.md\`\n- \`sources.md\`\n`
    );
    add("notes.md", `# Notes\n\n`);
    add("sources.md", `# Sources\n\n- \n`);
  } else if (templateType === "automation") {
    add(
      "README.md",
      `# ${projectName}\n\nCreated by FF-Terminal template: \`${templateType}\`.\n\n## Run\n- Install deps: \`npm i\`\n- Run script: \`node src/main.js\`\n`
    );
    add("package.json", JSON.stringify({ name: projectName, private: true, type: "module", scripts: { start: "node src/main.js" } }, null, 2) + "\n");
    add("src/main.js", `console.log("automation ready");\n`);
  }

  return JSON.stringify({ ok: true, template_type: templateType, project_name: projectName, project_dir: outDir, created_files: created }, null, 2);
}
