import { loadPromptTemplate, PromptVariant, interpolate } from "./loadTemplates.js";
import { buildEnvironmentalContext, buildContextFooter } from "./envContext.js";
import { loadParallelSection } from "./parallelSection.js";
import { loadToolSchemas } from "../tools/toolSchemas.js";
import { buildToolsCompact } from "./toolsCompact.js";
import { findRepoRoot } from "../config/repoRoot.js";

export function buildSystemPrompt(params: {
  variant: PromptVariant;
  repoRoot?: string;
  workingDir: string;
  parallelMode: boolean;
  skillSections?: string;
  sessionSummary?: string;
  availableToolNames?: string[];
}): string {
  const repoRoot = params.repoRoot ?? findRepoRoot();
  const template = loadPromptTemplate(params.variant, repoRoot);
  const env_context = buildEnvironmentalContext({ workingDir: params.workingDir, sessionSummary: params.sessionSummary });
  const parallel_section = loadParallelSection({ repoRoot, enabled: params.parallelMode });
  const toolSchemas = (() => {
    const all = loadToolSchemas(repoRoot);
    if (!params.availableToolNames?.length) return all;
    const allowed = new Set(params.availableToolNames);
    return all.filter((t) => allowed.has(t.function.name));
  })();
  const tools_compact = buildToolsCompact(toolSchemas);
  const footer = buildContextFooter({ workingDir: params.workingDir });

  return interpolate(template, {
    env_context,
    parallel_section,
    tools_compact,
    skill_sections: params.skillSections ?? "",
    essential_tools: tools_compact,
    simple_context: env_context,
    ...footer
  });
}
