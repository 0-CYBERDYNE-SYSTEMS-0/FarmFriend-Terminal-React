import { ToolRegistry } from "./tools/registry.js";
import { readFileTool } from "./tools/implementations/readFile.js";
import { writeFileTool } from "./tools/implementations/writeFile.js";
import { scheduleTaskTool } from "./scheduling/scheduleTaskTool.js";
import { runCommandTool } from "./tools/implementations/runCommand.js";
import { globTool } from "./tools/implementations/glob.js";
import { grepTool } from "./tools/implementations/grep.js";
import { editFileTool } from "./tools/implementations/editFile.js";
import { multiEditFileTool } from "./tools/implementations/multiEditFile.js";
import { todoWriteTool } from "./tools/implementations/todoWrite.js";
import { tavilySearchTool } from "./tools/implementations/tavilySearch.js";
import { perplexitySearchTool } from "./tools/implementations/perplexitySearch.js";
import { browseWebTool } from "./tools/implementations/browseWeb.js";
import { searchCodeTool, semanticSearchTool } from "./tools/implementations/searchCode.js";
import { thinkTool } from "./tools/implementations/think.js";
import { quickUpdateTool } from "./tools/implementations/quickUpdate.js";
import { sessionSummaryTool } from "./tools/implementations/sessionSummary.js";
import { manageTaskTool } from "./tools/implementations/manageTask.js";
import { completionValidationTool } from "./tools/implementations/completionValidation.js";
import { skillDocumentationTool, skillImportTool, skillLoaderTool } from "./tools/implementations/skills.js";
import { subagentTool } from "./tools/implementations/subagentTool.js";
import { tavilyCrawlTool, tavilyExtractTool, tavilyMapTool } from "./tools/implementations/tavilyAdvanced.js";
import { astGrepTool } from "./tools/implementations/astGrep.js";
import { listTemplatesTool, projectTemplateTool } from "./tools/implementations/templates.js";
import { skillApplyTool, skillDraftTool, skillSequencerTool } from "./tools/implementations/skillsWorkflow.js";
import { agentApplyTool, agentDraftTool } from "./tools/implementations/agentsWorkflow.js";
import { smartCleanupTool } from "./tools/implementations/smartCleanup.js";
import { analyzeDataTool } from "./tools/implementations/analyzeData.js";
import { notebookEditTool } from "./tools/implementations/notebookEdit.js";
import { generateImageGeminiTool, analyzeImageGeminiTool, editImageGeminiTool, analyzeVideoGeminiTool } from "./tools/implementations/mediaTools.js";
import { generateImageOpenAITool } from "./tools/implementations/openaiImage.js";
import { askOracleTool } from "./tools/implementations/askOracle.js";
import { macosControlTool } from "./tools/implementations/macosControl.js";
import { workflowAutomationTool } from "./tools/implementations/workflowAutomation.js";

export function registerDefaultTools(registry: ToolRegistry, opts: { workspaceDir: string }): void {
  registry.register("read_file", async (args) => readFileTool(args));
  registry.register("write_file", async (args) => writeFileTool(args));
  registry.register("schedule_task", async (args) => scheduleTaskTool(args, opts.workspaceDir));
  registry.register("run_command", async (args, signal) => runCommandTool(args, signal));
  registry.register("glob", async (args) => globTool(args));
  registry.register("grep", async (args, signal) => grepTool(args, signal));
  registry.register("edit_file", async (args) => editFileTool(args));
  registry.register("multi_edit_file", async (args) => multiEditFileTool(args));
  registry.register("TodoWrite", async (args) => todoWriteTool(args));

  // Meta / UX tools referenced by the system prompt.
  registry.register("think", async (args) => thinkTool(args));
  registry.register("quick_update", async (args) => quickUpdateTool(args));
  registry.register("session_summary", async (args) => sessionSummaryTool(args));
  registry.register("manage_task", async (args) => manageTaskTool(args));
  registry.register("completion_validation", async (args) => completionValidationTool(args));
  registry.register("skill_loader", async (args) => skillLoaderTool(args));
  registry.register("skill_documentation", async (args) => skillDocumentationTool(args));
  registry.register("skill_import", async (args) => skillImportTool(args));

  // Web/search tools from the port packet schema (optional keys required for some).
  registry.register("tavily_search", async (args, signal) => tavilySearchTool(args, signal));
  registry.register("tavily_extract", async (args, signal) => tavilyExtractTool(args, signal));
  registry.register("tavily_map", async (args, signal) => tavilyMapTool(args, signal));
  registry.register("tavily_crawl", async (args, signal) => tavilyCrawlTool(args, signal));
  registry.register("perplexity_search", async (args, signal) => perplexitySearchTool(args, signal));
  registry.register("browse_web", async (args, signal) => browseWebTool(args, signal));

  // Port packet code search tools (best-effort implementations in TS).
  registry.register("search_code", async (args, signal) => searchCodeTool(args, signal));
  registry.register("semantic_search", async (args, signal) => semanticSearchTool(args, signal));

  // Semantic code search via ast-grep.
  registry.register("ast_grep", async (args, signal) => astGrepTool(args, signal));

  // Project templates.
  registry.register("list_templates", async () => listTemplatesTool());
  registry.register("project_template", async (args) => projectTemplateTool(args));

  // Skills workflow helpers (draft/apply/sequence).
  registry.register("skill_draft", async (args) => skillDraftTool(args));
  registry.register("skill_apply", async (args) => skillApplyTool(args));
  registry.register("skill_sequencer", async (args) => skillSequencerTool(args));

  // Agents workflow helpers (draft/apply).
  registry.register("agent_draft", async (args) => agentDraftTool(args));
  registry.register("agent_apply", async (args) => agentApplyTool(args));

  // Workspace cleanup.
  registry.register("smart_cleanup", async (args) => smartCleanupTool(args));

  // Data + notebooks.
  registry.register("analyze_data", async (args) => analyzeDataTool(args));
  registry.register("notebook_edit", async (args) => notebookEditTool(args));

  // Media tools (Gemini-first).
  registry.register("generate_image_gemini", async (args, signal) => generateImageGeminiTool(args, signal));
  registry.register("analyze_image_gemini", async (args, signal) => analyzeImageGeminiTool(args, signal));
  registry.register("edit_image_gemini", async (args, signal) => editImageGeminiTool(args, signal));
  registry.register("analyze_video_gemini", async (args, signal) => analyzeVideoGeminiTool(args, signal));
  registry.register("generate_image_openai", async (args, signal) => generateImageOpenAITool(args, signal));

  // Oracle escalation (OpenRouter).
  registry.register("ask_oracle", async (args, signal) => askOracleTool(args, signal));

  // System automation (best-effort; gated).
  registry.register("macos_control", async (args, signal) => macosControlTool(args, signal));
  registry.register("workflow_automation", async (args, signal) => workflowAutomationTool(args, signal));
}

// Default + higher-level orchestration tools that may recurse.
export function registerAllTools(registry: ToolRegistry, opts: { workspaceDir: string }): void {
  registerDefaultTools(registry, opts);
  registry.register("subagent_tool", async (args, signal) => subagentTool(args, signal));
}
