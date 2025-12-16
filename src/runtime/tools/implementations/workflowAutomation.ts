import fs from "node:fs";
import path from "node:path";

import { getToolContext } from "../context.js";
import { macosControlTool } from "./macosControl.js";
import { runCommandTool } from "./runCommand.js";

type Args = {
  action?: string;
  workflow_name?: string;
  parameters?: Record<string, any>;
  execution_mode?: string;
  category?: string;
  description?: string;
  tags?: string[];
};

type WorkflowStep = {
  tool_name: string;
  parameters?: Record<string, any>;
};

type WorkflowData = {
  name: string;
  steps: WorkflowStep[];
  created_at: string;
};

type WorkflowMeta = {
  name: string;
  category: string;
  file_path: string;
  created_at: string;
  last_used: string | null;
  usage_count: number;
  success_rate: number;
  average_duration: number;
  tags: string[];
  description: string;
  parameters: Record<string, any>;
};

function storageRoot(workspaceDir: string): string {
  return path.join(workspaceDir, "memory_core", "workflows");
}

function metaPath(workspaceDir: string): string {
  return path.join(storageRoot(workspaceDir), "workflow_metadata.json");
}

function ensureDirs(root: string): void {
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(path.join(root, "active"), { recursive: true });
  fs.mkdirSync(path.join(root, "templates"), { recursive: true });
  fs.mkdirSync(path.join(root, "learned"), { recursive: true });
}

function loadMeta(workspaceDir: string): Record<string, WorkflowMeta> {
  ensureDirs(storageRoot(workspaceDir));
  const p = metaPath(workspaceDir);
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return {};
  }
}

function saveMeta(workspaceDir: string, meta: Record<string, WorkflowMeta>): void {
  ensureDirs(storageRoot(workspaceDir));
  fs.writeFileSync(metaPath(workspaceDir), JSON.stringify(meta, null, 2) + "\n", "utf8");
}

function categoryDir(root: string, category: string): string {
  const c = String(category || "user").trim().toLowerCase();
  if (c === "learned") return path.join(root, "learned");
  if (c === "template") return path.join(root, "templates");
  return path.join(root, "active");
}

function resolveWorkflowFile(workspaceDir: string, name: string): { meta: WorkflowMeta | null; filePath: string | null } {
  const meta = loadMeta(workspaceDir);
  const entry = meta[name];
  if (!entry) return { meta: null, filePath: null };
  return { meta: entry, filePath: entry.file_path };
}

function applyParams(obj: any, params: Record<string, any>): any {
  if (obj == null) return obj;
  if (typeof obj === "string") {
    return obj.replace(/\{\{([A-Za-z0-9_.-]+)\}\}/g, (_, k) => {
      const v = params[k];
      return v == null ? "" : String(v);
    });
  }
  if (Array.isArray(obj)) return obj.map((x) => applyParams(x, params));
  if (typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) out[k] = applyParams(v, params);
    return out;
  }
  return obj;
}

async function executeStep(step: WorkflowStep, executionMode: string, params: Record<string, any>, signal: AbortSignal): Promise<{ ok: boolean; tool: string; error?: string }> {
  const toolName = String(step.tool_name || "").trim();
  const toolParams = applyParams(step.parameters || {}, params);
  try {
    if (toolName === "run_command") {
      const out = await runCommandTool(toolParams, signal);
      return { ok: true, tool: toolName };
    }
    if (toolName === "macos_control") {
      const out = await macosControlTool(toolParams, signal);
      return { ok: true, tool: toolName };
    }
    return { ok: false, tool: toolName, error: `Unsupported step tool_name: ${toolName}` };
  } catch (e) {
    return { ok: false, tool: toolName, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function workflowAutomationTool(argsRaw: unknown, signal: AbortSignal): Promise<string> {
  const args = argsRaw as Args;
  const action = String(args?.action || "").trim().toLowerCase();
  if (!action) throw new Error("workflow_automation: missing args.action");

  const ctx = getToolContext();
  const workspaceDir = ctx?.workspaceDir ? ctx.workspaceDir : process.cwd();
  const root = storageRoot(workspaceDir);
  ensureDirs(root);

  if (String(process.env.FF_ALLOW_WORKFLOW_AUTOMATION || "") !== "1") {
    // Allow list even when disabled (read-only visibility).
    if (action !== "list") throw new Error("workflow_automation: blocked (set FF_ALLOW_WORKFLOW_AUTOMATION=1 to enable)");
  }

  if (action === "list") {
    const meta = loadMeta(workspaceDir);
    const items = Object.values(meta).map((m) => ({
      name: m.name,
      category: m.category,
      description: m.description,
      usage_count: m.usage_count,
      success_rate: m.success_rate,
      last_used: m.last_used,
      tags: m.tags
    }));
    items.sort((a, b) => a.name.localeCompare(b.name));
    return JSON.stringify({ ok: true, workflows: items }, null, 2);
  }

  const name = String(args?.workflow_name || "").trim();
  if (!name && ["replay", "record", "stop", "delete"].includes(action)) {
    throw new Error("workflow_automation: missing args.workflow_name");
  }

  if (action === "delete") {
    const meta = loadMeta(workspaceDir);
    const entry = meta[name];
    if (!entry) throw new Error(`workflow_automation: workflow not found: ${name}`);
    try {
      fs.rmSync(entry.file_path, { force: true });
    } catch {
      // ignore
    }
    delete meta[name];
    saveMeta(workspaceDir, meta);
    return JSON.stringify({ ok: true, action: "delete", workflow_name: name }, null, 2);
  }

  if (action === "record" || action === "stop" || action === "teach" || action === "suggest") {
    // These require deeper integration with the hook system + interactive UI.
    return JSON.stringify(
      {
        ok: false,
        action,
        message: "Not implemented in TS build yet. Planned: record via tool hooks, teach via interactive wizard, suggest via pattern mining.",
        note: "For now, you can create a workflow JSON manually under workspaceDir/memory_core/workflows/active and add it to workflow_metadata.json."
      },
      null,
      2
    );
  }

  if (action === "replay") {
    const params = args?.parameters && typeof args.parameters === "object" ? args.parameters : {};
    const executionMode = String(args?.execution_mode || "auto").trim().toLowerCase();

    const resolved = resolveWorkflowFile(workspaceDir, name);
    if (!resolved.filePath) throw new Error(`workflow_automation: workflow not found: ${name}`);
    if (!fs.existsSync(resolved.filePath)) throw new Error(`workflow_automation: workflow file missing: ${resolved.filePath}`);

    const data = JSON.parse(fs.readFileSync(resolved.filePath, "utf8")) as any;
    const steps: WorkflowStep[] = Array.isArray(data?.steps) ? data.steps : [];
    if (!steps.length) throw new Error(`workflow_automation: workflow '${name}' has no steps`);

    // Best-effort execution: only supports run_command and macos_control for now.
    const started = Date.now();
    const results: any[] = [];
    let okCount = 0;
    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i]!;
      const r = await executeStep(step, executionMode, params, signal);
      results.push({ step_number: i + 1, tool_name: step.tool_name, success: r.ok, error: r.error || null });
      if (r.ok) okCount += 1;
    }

    const duration = (Date.now() - started) / 1000;
    const successRate = okCount / steps.length;

    // Update stats.
    const meta = loadMeta(workspaceDir);
    const entry = meta[name];
    if (entry) {
      entry.usage_count += 1;
      entry.last_used = new Date().toISOString();
      entry.success_rate = entry.usage_count === 1 ? (successRate >= 0.8 ? 1 : 0) : ((entry.success_rate * (entry.usage_count - 1) + (successRate >= 0.8 ? 1 : 0)) / entry.usage_count);
      entry.average_duration = entry.usage_count === 1 ? duration : (entry.average_duration * (entry.usage_count - 1) + duration) / entry.usage_count;
      meta[name] = entry;
      saveMeta(workspaceDir, meta);
    }

    const overallOk = successRate >= 0.8;
    return JSON.stringify(
      {
        ok: overallOk,
        action: "replay",
        workflow_name: name,
        execution_mode: executionMode,
        steps_total: steps.length,
        steps_successful: okCount,
        success_rate: successRate,
        duration_s: duration,
        execution_results: results,
        message: `Workflow '${name}' executed with ${okCount}/${steps.length} successful steps.`
      },
      null,
      2
    );
  }

  throw new Error(`workflow_automation: unknown action: ${action}`);
}

