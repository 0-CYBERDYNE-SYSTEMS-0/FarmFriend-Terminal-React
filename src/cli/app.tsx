import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { render, Box, Text, useApp, useInput, useStdout } from "ink";
import WebSocket from "ws";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { ChildProcess } from "node:child_process";
import { readConfig, writeConfig } from "../runtime/profiles/storage.js";
import type { Profile } from "../runtime/profiles/types.js";
import { loadToolSchemas } from "../runtime/tools/toolSchemas.js";
import { readMountsConfig, setMountEnabled } from "../runtime/config/mounts.js";
import { findRepoRoot } from "../runtime/config/repoRoot.js";
import { resolveWorkspaceDir } from "../runtime/config/paths.js";
import { resolveConfig } from "../runtime/config/loadConfig.js";
import { loadCommands, listCommands, getCommand } from "../runtime/commands/loader.js";
import { loadAgentConfigs, listAgentConfigs, getAllTemplates } from "../runtime/agents/loader.js";
import { parseCommand } from "../runtime/commands/parser.js";
import type { Command } from "../runtime/commands/types.js";
import type { AgentConfig, AgentTemplate } from "../runtime/agents/types.js";
import { validateWorkspace, generateReport } from "../runtime/workspace/doctor.js";
import { planMigration, executeMigration } from "../runtime/workspace/migration.js";
import { startTtsService, stopTtsService, TextBuffer, synthesize, AudioPlaybackQueue } from "./tts/index.js";

type ServerMessage =
  | { type: "hello"; daemonVersion: string }
  | { type: "turn_started"; sessionId: string; turnId: string }
  | { type: "chunk"; turnId: string; seq: number; chunk: string }
  | { type: "turn_finished"; turnId: string; ok: boolean; error?: string }
  | { type: "tools"; tools: string[] };

const DEFAULT_PORT = Number(process.env.FF_TERMINAL_PORT || 28888);

type Line = { kind: "system" | "user" | "assistant" | "thinking" | "tool" | "error"; text: string };
type LineEntry = Line & { id: number };
type InputStore = {
  value: string;
  subscribers: Set<() => void>;
};
type Todo = {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  priority: "high" | "medium" | "low";
};

function parseWireChunk(chunk: string, displayMode: string = "clean"): Line | null {
  // Hide verbose metadata in clean mode
  if (displayMode === "clean") {
    if (chunk === "task_completed") return null;
    if (chunk === "Starting turn...") return null;
    if (chunk.startsWith("Provider:") && chunk.includes("Model:")) return null;
    if (chunk.startsWith("completion_validation:")) return null;
  }

  if (chunk === "task_completed") return { kind: "system", text: "task_completed" };
  if (chunk.startsWith("content:")) return { kind: "assistant", text: chunk.slice("content:".length) };
  if (chunk.startsWith("thinking:")) return { kind: "thinking", text: chunk.slice("thinking:".length) };
  if (chunk.startsWith("error:")) return { kind: "error", text: chunk.slice("error:".length) };

  if (chunk.startsWith("tool_start:")) {
    const rest = chunk.slice("tool_start:".length);
    const [toolName, ...contextParts] = rest.split("|");
    const contextMsg = contextParts.join("|").trim();

    if (contextMsg) {
      // Clean mode: show contextual message with emoji
      return { kind: "tool", text: contextMsg };
    } else {
      // Fallback: show traditional format
      return { kind: "tool", text: `▶ ${toolName.trim()}` };
    }
  }

  if (chunk.startsWith("tool_end:")) {
    const rest = chunk.slice("tool_end:".length);
    const [toolName, duration, status, ...previewParts] = rest.split("|");
    const preview = previewParts.join("|").trim();

    if (duration && status) {
      // Clean mode: show result with checkmark/X and duration
      const icon = status === "ok" ? "✓" : "✗";
      let text = `${icon} `;

      if (preview && status === "ok") {
        // Smart previews are already concise, show them in full
        text += preview;
      } else if (status === "error") {
        // Failed tool
        text += `${toolName.trim()} failed`;
        if (preview) text += `: ${preview.slice(0, 50)}`;
      } else {
        // No preview available, just show completion
        text += `Completed in ${duration}`;
      }

      return { kind: "tool", text };
    } else {
      // Fallback: show traditional format
      return { kind: "tool", text: `■ ${toolName.trim()}` };
    }
  }

  return { kind: "system", text: chunk };
}

const FARMFRIEND_ASCII_ART = [
  "███████╗ █████╗ ██████╗ ███╗   ███╗",
  "██╔════╝██╔══██╗██╔══██╗████╗ ████║",
  "█████╗  ███████║██████╔╝██╔████╔██║",
  "██╔══╝  ██╔══██║██╔══██╗██║╚██╔╝██║",
  "██║     ██║  ██║██║  ██║██║ ╚═╝ ██║",
  "╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝",
  "",
  "███████╗██████╗ ██╗███████╗███╗   ██╗██████╗ ",
  "██╔════╝██╔══██╗██║██╔════╝████╗  ██║██╔══██╗",
  "█████╗  ██████╔╝██║█████╗  ██╔██╗ ██║██║  ██║",
  "██╔══╝  ██╔══██╗██║██╔══╝  ██║╚██╗██║██║  ██║",
  "██║     ██║  ██║██║███████╗██║ ╚████║██████╔╝",
  "╚═╝     ╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═══╝╚═════╝ ",
  "",
  "████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗     ",
  "╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║     ",
  "   ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║     ",
  "   ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║     ",
  "   ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗",
  "   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝"
] as const;

const Banner = memo(function Banner(props: { displayMode: string; width: number }) {
  if (props.displayMode === "verbose") {
    if (props.width < 60) {
      return (
        <Box flexDirection="column">
          <Text color="greenBright" bold>
            FARM
          </Text>
          <Text color="greenBright" bold>
            FRIEND
          </Text>
          <Text color="cyanBright" bold>
            TERMINAL v3.0
          </Text>
          <Text color="gray">Ultra-Autonomous AI Terminal Interface</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        {FARMFRIEND_ASCII_ART.map((line, i) => {
          if (!line) return <Text key={i}> </Text>;
          // Approximate the Python aurora gradient (leafy green → sky teal) with ANSI colors.
          const t = i / Math.max(1, FARMFRIEND_ASCII_ART.length - 1);
          const color = t < 0.5 ? "greenBright" : "cyanBright";
          return (
            <Text key={i} color={color} bold>
              {line}
            </Text>
          );
        })}
        <Text> </Text>
        <Text color="gray">🌾 Ultra-Autonomous AI Terminal Interface</Text>
      </Box>
    );
  }

  // Clean mode (default): match Python clean display which prints the compact FF-Terminal box logo.
  if (props.displayMode === "clean") {
    if (props.width < 46) {
      return (
        <Box flexDirection="column">
          <Text color="cyanBright" bold>
            FF-Terminal v3.0
          </Text>
          <Text color="gray">Ultra-Autonomous AI Terminal</Text>
        </Box>
      );
    }

    const box = [
      "╔═══════════════════════════════════════╗",
      "║           FF-Terminal v3.0            ║",
      "║     Ultra-Autonomous AI Terminal      ║",
      "╚═══════════════════════════════════════╝"
    ];

    return (
      <Box flexDirection="column">
        {box.map((line, i) => (
          <Text key={i} color="cyanBright" bold>
            {line}
          </Text>
        ))}
      </Box>
    );
  }

  return null;
});

const Spinner = memo(function Spinner(props: { active: boolean }) {
  const [i, setI] = useState(0);
  // ASCII spinner to maximize compatibility across terminal fonts.
  const frames = useMemo(() => ["|", "/", "-", "\\"], []);

  useEffect(() => {
    if (!props.active) return;
    const t = setInterval(() => setI((n) => (n + 1) % frames.length), 90);
    return () => clearInterval(t);
  }, [props.active, frames.length]);

  if (!props.active) return null;
  return (
    <Text color="yellow">
      [{frames[i]}]{" "}
    </Text>
  );
});

const ChatPrompt = memo(function ChatPrompt(props: {
  inputStore: InputStore;
  operationMode: OperationMode;
  processing: boolean;
  showThinking: boolean;
  showTodoPanel: boolean;
  showToolDetails: boolean;
  thinkingCount: number;
  ttsEnabled?: boolean;
  currentVoice?: string;
}) {
  const value = useSyncExternalStore(
    (cb) => {
      props.inputStore.subscribers.add(cb);
      return () => {
        props.inputStore.subscribers.delete(cb);
      };
    },
    () => props.inputStore.value,
    () => props.inputStore.value
  );

  const thinkingText = props.showThinking
    ? "visible"
    : `hidden (${props.thinkingCount})`;
  const todosText = props.showTodoPanel ? "shown" : "hidden";
  const toolsText = props.showToolDetails ? "expanded" : "collapsed";
  const voiceStatus = process.env.FF_TTS_ENABLED === "true"
    ? (props.ttsEnabled ? `voice:on (${props.currentVoice || "af_heart"})` : "voice:off")
    : "";

  return (
    <>
      <Text>› {value}</Text>
      <Box gap={1}>
        <Spinner active={props.processing} />
        <Text color="gray">
          Enter to send • Ctrl+C to cancel • Shift+Tab: mode={props.operationMode} • Ctrl+T: thinking {thinkingText} • Ctrl+D: todos {todosText} • Ctrl+E: tools {toolsText} {voiceStatus && `• Ctrl+V: ${voiceStatus}`} • /help
        </Text>
      </Box>
    </>
  );
});

const TOOL_NAME_PATTERNS = [
  /^▶\s*([A-Za-z0-9_-]+)/,
  /^■\s*([A-Za-z0-9_-]+)/,
  /^✓\s*([A-Za-z0-9_-]+)/,
  /^Tool:\s*([A-Za-z0-9_-]+)/i
];

function extractToolName(text: string): string | null {
  for (const rx of TOOL_NAME_PATTERNS) {
    const match = text.match(rx);
    if (match && match[1]) return match[1];
  }
  return null;
}

function summarizeToolGroup(lines: LineEntry[]): string {
  const names = new Set<string>();
  for (const line of lines) {
    const name = extractToolName(line.text.trim());
    if (name) names.add(name);
  }
  const unique = Array.from(names);
  if (unique.length) {
    const shown = unique.slice(0, 3).join(", ");
    const more = unique.length > 3 ? ` +${unique.length - 3}` : "";
    return `Tools · ${unique.length} ran (${shown}${more}) · Ctrl+E to expand`;
  }
  return `Tools · ${lines.length} events · Ctrl+E to expand`;
}

const Transcript = memo(function Transcript(props: {
  lines: LineEntry[];
  showThinking: boolean;
  showToolDetails: boolean;
  scrollOffset: number;
  visibleCount: number;
}) {
  const filteredLines = props.showThinking
    ? props.lines
    : props.lines.filter(l => l.kind !== "thinking");

  const rendered: LineEntry[] = [];
  let i = 0;
  let prevKind: Line["kind"] | null = null;
  while (i < filteredLines.length) {
    const line = filteredLines[i];
    if (line.kind === "tool") {
      const group: LineEntry[] = [];
      while (i < filteredLines.length && filteredLines[i].kind === "tool") {
        group.push(filteredLines[i]);
        i += 1;
      }
      if (props.showToolDetails) {
        rendered.push(...group);
      } else {
        rendered.push({
          id: group[group.length - 1]?.id ?? line.id,
          kind: "tool",
          text: summarizeToolGroup(group)
        });
      }
      prevKind = "tool";
      continue;
    }

    if (line.kind === "assistant" && prevKind !== "assistant") {
      rendered.push({ id: line.id * 1000 + 1, kind: "system", text: "Assistant" } as LineEntry);
    }
    rendered.push(line);
    prevKind = line.kind;
    i += 1;
  }

  const visibleCount = Math.max(8, props.visibleCount);
  const maxOffset = Math.max(0, rendered.length - visibleCount);
  const offset = Math.min(Math.max(0, props.scrollOffset), maxOffset);
  const start = Math.max(0, rendered.length - visibleCount - offset);
  const windowed = rendered.slice(start, start + visibleCount);

  return (
    <Box flexDirection="column">
      {windowed.map((l) => (
        <Text
          key={l.id}
          color={
            l.kind === "user"
              ? "cyanBright"
              : l.kind === "assistant"
                ? "whiteBright"
                : l.kind === "thinking"
                  ? "magenta"
                  : l.kind === "tool"
                    ? "yellow"
                    : l.kind === "error"
                      ? "red"
                      : "gray"
          }
          bold={l.kind === "user" || l.kind === "assistant"}
          dimColor={false}
        >
          {l.kind === "user" ? `› ${l.text}` : l.text}
        </Text>
      ))}
    </Box>
  );
});

const isValidSessionId = (sessionId: string): boolean => {
  if (!sessionId || sessionId.length === 0) return false;
  return /^[a-zA-Z0-9_-]+$/.test(sessionId);
};

const TodoPanel = memo(function TodoPanel(props: {
  sessionId: string | null;
  workspaceDir: string;
  visible: boolean;
}) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastModified, setLastModified] = useState<number>(0);

  useEffect(() => {
    if (!props.visible || !props.sessionId) return;
    if (!isValidSessionId(props.sessionId)) {
      setError("Invalid session ID format");
      return;
    }

    const todoPath = path.join(
      props.workspaceDir,
      "todos",
      "sessions",
      `${props.sessionId}.json`
    );

    try {
      if (!fs.existsSync(todoPath)) {
        setTodos([]);
        setError(null);
        return;
      }

      const content = fs.readFileSync(todoPath, "utf8");
      const data = JSON.parse(content);
      setTodos(Array.isArray(data.todos) ? data.todos : []);
      setError(null);

      const stat = fs.statSync(todoPath);
      setLastModified(stat.mtimeMs);
    } catch (err) {
      setError(`Failed to load todos: ${(err as Error).message}`);
      setTodos([]);
    }
  }, [props.visible, props.sessionId, props.workspaceDir, lastModified]);

  useEffect(() => {
    if (!props.visible || !props.sessionId) return;
    if (!isValidSessionId(props.sessionId)) return;

    const interval = setInterval(() => {
      const todoPath = path.join(
        props.workspaceDir,
        "todos",
        "sessions",
        `${props.sessionId}.json`
      );

      try {
        if (fs.existsSync(todoPath)) {
          const stat = fs.statSync(todoPath);
          if (stat.mtimeMs !== lastModified) {
            setLastModified(stat.mtimeMs);
          }
        }
      } catch {
        // Ignore refresh errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [props.visible, props.sessionId, props.workspaceDir, lastModified]);

  if (!props.visible) return null;

  if (error) {
    return (
      <Box flexDirection="column" borderStyle="single" borderColor="red">
        <Text color="red">Todo Panel - Error</Text>
        <Text dimColor>{error}</Text>
      </Box>
    );
  }

  if (todos.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="single" borderColor="gray">
        <Text color="yellow">Todo Panel</Text>
        <Text color="gray">No todos for this session. Use manage_task tool to create.</Text>
      </Box>
    );
  }

  const pending = todos.filter(t => t.status === "pending");
  const inProgress = todos.filter(t => t.status === "in_progress");
  const completed = todos.filter(t => t.status === "completed");

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="cyan">
      <Text color="cyan" bold>
        Todo Panel ({todos.length} total)
      </Text>

      {inProgress.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow">▶ In Progress ({inProgress.length})</Text>
          {inProgress.slice(0, 3).map(t => (
            <Text key={t.id} dimColor={false}>
              • {t.content.slice(0, 60)}
              {t.content.length > 60 ? "..." : ""}
            </Text>
          ))}
        </Box>
      )}

      {pending.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="gray">○ Pending ({pending.length})</Text>
          {pending.slice(0, 3).map(t => (
            <Text key={t.id} color="gray">
              • {t.content.slice(0, 60)}
              {t.content.length > 60 ? "..." : ""}
            </Text>
          ))}
          {pending.length > 3 && (
            <Text color="gray">  ... and {pending.length - 3} more</Text>
          )}
        </Box>
      )}

      {completed.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green">✓ Completed ({completed.length})</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">
          Press Ctrl+D to hide • Auto-refreshes every 2s
        </Text>
      </Box>
    </Box>
  );
});

const TodoSummary = memo(function TodoSummary(props: {
  sessionId: string | null;
  workspaceDir: string;
  visible: boolean;
}) {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    if (!props.sessionId) return;
    const todoPath = path.join(
      props.workspaceDir,
      "todos",
      "sessions",
      `${props.sessionId}.json`
    );

    const refresh = () => {
      try {
        if (!fs.existsSync(todoPath)) {
          setTodos([]);
          return;
        }
        const content = fs.readFileSync(todoPath, "utf8");
        const data = JSON.parse(content);
        setTodos(Array.isArray(data.todos) ? data.todos : []);
      } catch {
        setTodos([]);
      }
    };

    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [props.sessionId, props.workspaceDir]);

  if (!props.visible || !props.sessionId || todos.length === 0) return null;

  const pending = todos.filter(t => t.status === "pending").length;
  const completed = todos.filter(t => t.status === "completed").length;
  return (
    <Text color="gray">
      Todos · {todos.length} total ({pending} pending · {completed} done) · Ctrl+D to open
    </Text>
  );
});

type Mode = "chat" | "models" | "mounts" | "init_project" | "wizard" | "commands" | "agents" | "skills";
type ModelKey = "model" | "subagentModel" | "toolModel" | "webModel" | "imageModel" | "videoModel";
type ModelRow = { key: ModelKey; label: string; help: string };

const MODEL_ROWS: ModelRow[] = [
  { key: "model", label: "Main model", help: "Used for normal turns" },
  { key: "subagentModel", label: "Subagent model", help: "Used by subagent_tool (blank = main model)" },
  { key: "toolModel", label: "Tool model", help: "Reserved (future tool-LLM routing)" },
  { key: "webModel", label: "Web model", help: "Reserved (future web-LLM routing)" },
  { key: "imageModel", label: "Image model", help: "Reserved (future image tools)" },
  { key: "videoModel", label: "Video model", help: "Reserved (future video tools)" }
];

type WizardId = "models" | "mounts" | "init_project" | "commands" | "agents" | "skills";
type WizardRow = { id: WizardId; label: string; help: string };
const WIZARD_ROWS: WizardRow[] = [
  { id: "models", label: "Models", help: "Edit model overrides for this profile" },
  { id: "mounts", label: "Mounts", help: "Enable read-only mounts for external skills" },
  { id: "init_project", label: "Init Project", help: "Load FF_PROJECT.md / PROJECT.md from a project directory" },
  { id: "commands", label: "Commands", help: "Create and manage custom slash commands" },
  { id: "agents", label: "Agents", help: "Configure specialized agent personas" },
  { id: "skills", label: "Skills", help: "Create and manage reusable skills" }
];

type OperationMode = "auto" | "confirm" | "read_only" | "planning";
const OP_MODES: OperationMode[] = ["auto", "confirm", "read_only", "planning"];
const MAX_TRANSCRIPT_LINES = 400;
const LINE_COMMIT_DELAY = 120;

type ProjectStub = { dir: string; name: string; status: "ready" | "needs_setup" };

type MainViewProps = {
  displayMode: string;
  stdoutWidth: number;
  connected: boolean;
  daemonVersion: string | null;
  mode: Mode;
  wizardIndex: number;
  mountRows: ReadonlyArray<{ key: string; label: string; enabled: boolean }>;
  mountsIndex: number;
  workspaceDir: string;
  projectFilter: string;
  projectRows: ProjectStub[];
  projectIndex: number;
  modelIndex: number;
  modelEditingKey: ModelKey | null;
  modelEditValue: string;
  currentProfile: Profile | null;
  profileName: string;
  commandRows: Command[];
  commandsIndex: number;
  agentRows: AgentConfig[];
  agentsIndex: number;
  agentTemplates: AgentTemplate[];
  agentMenuMode: "list" | "creation_method" | "template_select" | "form" | "ai_description";
  agentCreationMethodIndex: number;
  agentTemplateIndex: number;
  agentFormStep: number;
  agentFormData: Partial<AgentConfig>;
  agentEditValue: string;
  skillMenuMode: "list" | "form" | "preview";
  skillFormStep: number;
  skillFormData: Record<string, any>;
  skillSkippedFields: Set<string>;
  skillEditValue: string;
  commandMenuMode: "list" | "form" | "preview";
  commandFormStep: number;
  commandFormData: Record<string, any>;
  commandSkippedFields: Set<string>;
  commandEditValue: string;
};

const MainView = memo(function MainView(props: MainViewProps) {
  const {
    displayMode,
    stdoutWidth,
    connected,
    daemonVersion,
    mode,
    wizardIndex,
    mountRows,
    mountsIndex,
    workspaceDir,
    projectFilter,
    projectRows,
    projectIndex,
    modelIndex,
    modelEditingKey,
    modelEditValue,
    currentProfile,
    profileName,
    commandRows,
    commandsIndex,
    agentRows,
    agentsIndex,
    agentTemplates,
    agentMenuMode,
    agentCreationMethodIndex,
    agentTemplateIndex,
    agentFormStep,
    agentFormData,
    agentEditValue,
    skillMenuMode,
    skillFormStep,
    skillFormData,
    skillSkippedFields,
    skillEditValue,
    commandMenuMode,
    commandFormStep,
    commandFormData,
    commandSkippedFields,
    commandEditValue
  } = props;

  const wizardPanel = mode === "wizard" ? (
    <Box flexDirection="column">
      <Text>
        Wizards for profile: <Text color="yellow">{profileName}</Text>
      </Text>
      <Text dimColor>Esc: back • ↑/↓: select • Enter: open</Text>
      <Box flexDirection="column" marginTop={1}>
        {WIZARD_ROWS.map((row, idx) => {
          const selected = idx === wizardIndex;
          return (
            <Text key={row.id} color={selected ? "cyan" : "white"} dimColor={!selected}>
              {selected ? "› " : "  "}
              {row.label}
            </Text>
          );
        })}
      </Box>
      <Text dimColor>{WIZARD_ROWS[wizardIndex]?.help}</Text>
    </Box>
  ) : null;

  const mountsPanel = mode === "mounts" ? (
    <Box flexDirection="column">
      <Text>Mounts (read-only)</Text>
      <Text dimColor>Esc: back • ↑/↓: select • Space/Enter: toggle</Text>
      <Box flexDirection="column" marginTop={1}>
        {mountRows.map((row, idx) => {
          const selected = idx === mountsIndex;
          const mark = row.enabled ? "[x]" : "[ ]";
          return (
            <Text key={row.key} color={selected ? "cyan" : "white"} dimColor={!selected}>
              {selected ? "› " : "  "}
              {mark} {row.label}
            </Text>
          );
        })}
      </Box>
      <Text dimColor>
        Enabled mounts are read-only and searched after workspace/bundled skills. Changes take effect immediately for skill loading.
      </Text>
    </Box>
  ) : null;

  const initProjectPanel = mode === "init_project" ? (
    <Box flexDirection="column">
      <Text>Init Project</Text>
      <Text dimColor>Type to filter • ↑/↓ select • Enter load • Esc quit</Text>
      <Text dimColor>Workspace: {workspaceDir}</Text>
      <Text>Filter: {projectFilter || "(none)"}</Text>
      <Box flexDirection="column" marginTop={1}>
        {projectRows.length ? (
          (() => {
            const windowSize = 20;
            const start = Math.max(0, Math.min(projectIndex - 8, Math.max(0, projectRows.length - windowSize)));
            const slice = projectRows.slice(start, start + windowSize);
            return slice.map((p, idx) => {
              const absoluteIndex = start + idx;
              const selected = absoluteIndex === projectIndex;
              const status = p.status === "ready" ? "ready" : "needs setup";
              const statusColor = p.status === "ready" ? "green" : "yellow";
              return (
                <Text key={p.dir} color={selected ? "cyan" : "white"} dimColor={!selected}>
                  {selected ? "› " : "  "}
                  {p.name}{" "}
                  <Text color={statusColor} dimColor={false}>
                    ({status})
                  </Text>
                </Text>
              );
            });
          })()
        ) : (
          <Text color="yellow">No projects found under ff-terminal-workspace/projects/</Text>
        )}
      </Box>
      <Text dimColor>
        Tip: create `{path.join(workspaceDir, "projects")}/&lt;name&gt;/FF_PROJECT.md` to show up here.
      </Text>
    </Box>
  ) : null;

  const modelsPanel = mode === "models" ? (
    <Box flexDirection="column">
      <Text>
        Models for profile: <Text color="yellow">{profileName}</Text>
      </Text>
      <Text dimColor>Esc: back • ↑/↓: select • Enter: edit</Text>
      <Box flexDirection="column" marginTop={1}>
        {MODEL_ROWS.map((row, idx) => {
          const selected = idx === modelIndex && !modelEditingKey;
          const value = (currentProfile ? (currentProfile as any)[row.key] : "") as string;
          const display = value ? value : row.key === "subagentModel" ? "(inherit main)" : "(blank)";
          return (
            <Text key={row.key} color={selected ? "cyan" : "white"} dimColor={!selected}>
              {selected ? "› " : "  "}
              {row.label}: {display}
            </Text>
          );
        })}
      </Box>
      {modelEditingKey ? (
        <Box flexDirection="column" marginTop={1}>
          <Text>
            Editing <Text color="cyan">{modelEditingKey}</Text> — {MODEL_ROWS.find((r) => r.key === modelEditingKey)?.help || ""}
          </Text>
          <Text>› {modelEditValue}</Text>
          <Text dimColor>Enter to save (empty = clear) • Esc to cancel</Text>
        </Box>
      ) : (
        <Text dimColor>{MODEL_ROWS[modelIndex]?.help}</Text>
      )}
    </Box>
  ) : null;

  const commandsPanel = mode === "commands" ? (() => {
    // Commands list view
    if (commandMenuMode === "list") {
      return (
        <Box flexDirection="column">
          <Text>Commands Manager</Text>
          <Text dimColor>Esc: back • ↑/↓: select • Enter: view • n: new</Text>
          <Box flexDirection="column" marginTop={1}>
            {commandRows.length ? (
              commandRows.slice(Math.max(0, commandsIndex - 8), commandsIndex + 12).map((cmd, idx) => {
                const absoluteIndex = Math.max(0, commandsIndex - 8) + idx;
                const selected = absoluteIndex === commandsIndex;
                return (
                  <Text key={cmd.slug} color={selected ? "cyan" : "white"} dimColor={!selected}>
                    {selected ? "› " : "  "}
                    /{cmd.slug} {cmd.description && `— ${cmd.description}`}
                  </Text>
                );
              })
            ) : (
              <Text color="yellow">No custom commands yet. Press 'n' to create one</Text>
            )}
          </Box>
          {commandRows.length > 0 && (
            <Text dimColor>{commandRows[commandsIndex]?.template?.slice(0, 60)}...</Text>
          )}
        </Box>
      );
    }

    // Commands form - 3 steps (slug, description, template)
    if (commandMenuMode === "form") {
      const formSteps = [
        { label: "Command Slug", hint: "e.g., 'deploy-app' (lowercase, alphanumeric)", required: true },
        { label: "Description", hint: "Short description of what the command does", required: true },
        { label: "Template", hint: "Command template with $1, $2 for arguments", required: true },
        { label: "Tags", hint: "Comma-separated tags [press Enter to skip]", required: false },
        { label: "Review & Save", hint: "Enter to save, 'e' to edit, Esc to cancel", required: false }
      ];

      const currentStep = formSteps[commandFormStep];
      if (!currentStep) return null;

      const stepFieldKey = ["command_slug", "description", "template", "tags"][commandFormStep];

      return (
        <Box flexDirection="column">
          <Text>Create New Command</Text>
          <Text dimColor>
            Step {commandFormStep + 1}/{formSteps.length}: {currentStep.label}
            {currentStep.required ? " (required)" : " (optional)"}
          </Text>
          <Box flexDirection="column" marginTop={1}>
            {commandFormStep < 4 && (
              <>
                <Text>{currentStep.hint}</Text>
                <Text>
                  <Text color="green">{"› "}</Text>
                  {commandEditValue}
                </Text>
              </>
            )}

            {commandFormStep === 4 && (
              <>
                <Text bold color="cyanBright">Command Configuration Preview</Text>
                <Text dimColor>Review the command below</Text>
                <Box flexDirection="column" marginTop={1}>
                  <Text>Slug: {commandFormData.command_slug || "(not set)"}</Text>
                  <Text>Description: {commandFormData.description || "(not set)"}</Text>
                  <Text dimColor>Template: {commandFormData.template?.slice(0, 50) || "(not set)"}...</Text>
                  <Box marginTop={1}>
                    <Text dimColor>Tags: {commandFormData.tags?.join(", ") || "(AI will generate)"}</Text>
                  </Box>
                </Box>
                <Box marginTop={1}>
                  <Text dimColor>Press Enter to create, 'e' to edit, Esc to cancel</Text>
                </Box>
              </>
            )}
          </Box>
        </Box>
      );
    }

    // Commands preview (unused in this flow, but keeping for consistency)
    if (commandMenuMode === "preview") {
      return (
        <Box flexDirection="column">
          <Text>Command Configuration Preview</Text>
          <Text dimColor>Review the command configuration below</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text>Slug: {commandFormData.command_slug || "(not set)"}</Text>
            <Text>Description: {commandFormData.description || "(not set)"}</Text>
            <Text dimColor>Template: {commandFormData.template?.slice(0, 50) || "(not set)"}...</Text>
            <Box marginTop={1}><Text dimColor>Tags: {commandFormData.tags?.join(", ") || "(AI will generate)"}</Text></Box>
          </Box>
          <Box marginTop={1}><Text dimColor>Press Enter to create, 'e' to edit, Esc to cancel</Text></Box>
        </Box>
      );
    }

    return null;
  })() : null;

  const agentsPanel = mode === "agents" ? (() => {
    // Agent list view - shows configured agents
    if (agentMenuMode === "list") {
      return (
        <Box flexDirection="column">
          <Text>Agents Manager</Text>
          <Text dimColor>Esc: back • ↑/↓: select • Enter: view • n: new agent</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text bold color="cyanBright">Configured Agents:</Text>
            {agentRows.length ? (
              agentRows.slice(Math.max(0, agentsIndex - 8), agentsIndex + 12).map((agent, idx) => {
                const absoluteIndex = Math.max(0, agentsIndex - 8) + idx;
                const selected = absoluteIndex === agentsIndex;
                return (
                  <Text key={agent.id} color={selected ? "cyan" : "white"} dimColor={!selected}>
                    {selected ? "› " : "  "}
                    {agent.name}
                  </Text>
                );
              })
            ) : (
              <Text dimColor>(none configured yet)</Text>
            )}
            <Box marginTop={1}>
              <Text bold color="cyanBright">Built-in Templates:</Text>
            </Box>
            {agentTemplates.slice(0, 3).map((template) => (
              <Text key={template.id} dimColor>
                • {template.name}
              </Text>
            ))}
          </Box>
        </Box>
      );
    }

    // Creation method selection menu
    if (agentMenuMode === "creation_method") {
      const creationMethods = [
        { label: "Create from template", description: "Customize a built-in template" },
        { label: "Create from scratch", description: "Manual form entry" },
        { label: "AI-assisted creation", description: "Describe what you want" }
      ];

      return (
        <Box flexDirection="column">
          <Text>Create New Agent</Text>
          <Text dimColor>↑/↓: select • Enter: choose • Esc: back</Text>
          <Box flexDirection="column" marginTop={1}>
            {creationMethods.map((method, idx) => {
              const selected = idx === agentCreationMethodIndex;
              return (
                <Box key={idx} flexDirection="column">
                  <Text color={selected ? "cyan" : "white"} dimColor={!selected}>
                    {selected ? "› " : "  "}
                    {method.label}
                  </Text>
                  {selected && <Text dimColor>  {method.description}</Text>}
                </Box>
              );
            })}
          </Box>
        </Box>
      );
    }

    // Template selection menu
    if (agentMenuMode === "template_select") {
      return (
        <Box flexDirection="column">
          <Text>Select Template</Text>
          <Text dimColor>↑/↓: select • Enter: use template • Esc: back</Text>
          <Box flexDirection="column" marginTop={1}>
            {agentTemplates.map((template, idx) => {
              const selected = idx === agentTemplateIndex;
              return (
                <Box key={template.id} flexDirection="column">
                  <Text color={selected ? "cyan" : "white"} dimColor={!selected}>
                    {selected ? "› " : "  "}
                    {template.name}
                  </Text>
                  {selected && <Text dimColor>  {template.description}</Text>}
                </Box>
              );
            })}
          </Box>
        </Box>
      );
    }

    // Manual form mode
    if (agentMenuMode === "form") {
      const formSteps = [
        { label: "Agent ID", hint: "lowercase alphanumeric, 2-64 chars (a-z0-9_-)", required: true },
        { label: "Display Name", hint: "user-friendly name for the agent", required: true },
        { label: "Description", hint: "one-line summary of the agent's purpose", required: true },
        { label: "Operation Mode", hint: "auto / confirm / read_only / planning", required: true },
        { label: "System Prompt", hint: "detailed instructions for the agent", required: true },
        { label: "Allowed Tools", hint: "comma-separated (e.g., read_file,write_file) [press Enter to skip]", required: false },
        { label: "Denied Tools", hint: "comma-separated tools to block [press Enter to skip]", required: false },
        { label: "Max Turns", hint: "max iterations (number) [press Enter to skip]", required: false },
        { label: "Tags", hint: "comma-separated tags [press Enter to skip]", required: false },
        { label: "Review & Save", hint: "Enter to create, 'e' to edit, Esc to cancel", required: false }
      ];

      const currentStep = formSteps[agentFormStep];
      if (!currentStep) return null;

      // Final step is preview
      if (agentFormStep === 9) {
        return (
          <Box flexDirection="column">
            <Text>Agent Configuration Preview</Text>
            <Text dimColor>Review the agent configuration below</Text>
            <Box flexDirection="column" marginTop={1}>
              <Text>ID: {agentFormData.id || "(not set)"}</Text>
              <Text>Name: {agentFormData.name || "(not set)"}</Text>
              <Text>Description: {agentFormData.description || "(not set)"}</Text>
              <Text>Mode: {agentFormData.mode || "auto"}</Text>
              <Text dimColor>System Prompt: {agentFormData.systemPromptAddition?.slice(0, 50) || "(not set)"}...</Text>
              <Box marginTop={1}>
                <Text dimColor>Allowed Tools: {Array.isArray(agentFormData.allowedTools) ? agentFormData.allowedTools.join(", ") : "(AI will generate)"}</Text>
              </Box>
              <Text dimColor>Denied Tools: {Array.isArray(agentFormData.deniedTools) ? agentFormData.deniedTools.join(", ") : "(AI will generate)"}</Text>
              <Text dimColor>Max Turns: {agentFormData.maxTurns || "(AI will generate)"}</Text>
              <Text dimColor>Tags: {Array.isArray(agentFormData.tags) ? agentFormData.tags.join(", ") : "(AI will generate)"}</Text>
            </Box>
            <Box marginTop={1}>
              <Text dimColor>Press Enter to create, 'e' to edit, Esc to cancel</Text>
            </Box>
          </Box>
        );
      }

      return (
        <Box flexDirection="column">
          <Text>Create Agent - Step {agentFormStep + 1}/{formSteps.length}</Text>
          <Text dimColor>
            {currentStep.required ? "" : "[optional - press Enter to skip] "}
            Esc: cancel
          </Text>
          <Box flexDirection="column" marginTop={1}>
            <Text>{currentStep.label}</Text>
            <Text dimColor>{currentStep.hint}</Text>
            <Box marginTop={1}>
              <Text color="green">{"› "}</Text>
              <Text>{agentEditValue}</Text>
            </Box>
          </Box>
        </Box>
      );
    }

    // AI description input
    if (agentMenuMode === "ai_description") {
      return (
        <Box flexDirection="column">
          <Text>AI-Assisted Agent Creation</Text>
          <Text dimColor>Describe what you want • Enter when done • Esc: cancel</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>Description:</Text>
            <Text>{agentEditValue || "(type here)"}</Text>
          </Box>
        </Box>
      );
    }

    return null;
  })() : null;

  const skillsPanel = mode === "skills" ? (() => {
    // Skills list view
    if (skillMenuMode === "list") {
      return (
        <Box flexDirection="column">
          <Text>Skills Manager</Text>
          <Text dimColor>Esc: back • n: create new skill</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>Skills are stored in: ff-terminal-workspace/skills/</Text>
            <Text dimColor>Create reusable AI capabilities with custom instructions</Text>
          </Box>
        </Box>
      );
    }

    // Skills form - interactive field entry
    if (skillMenuMode === "form") {
      const formSteps = [
        { label: "Skill ID", hint: "lowercase alphanumeric, 2-64 chars (a-z0-9_-)", required: true },
        { label: "Name", hint: "display name for the skill", required: true },
        { label: "Summary", hint: "one-line description", required: true },
        { label: "Instructions", hint: "detailed skill instructions (multi-line)", required: true },
        { label: "Triggers", hint: "when to activate (e.g., 'code review, testing') [press Enter to skip]", required: false },
        { label: "Tags", hint: "comma-separated tags [press Enter to skip]", required: false },
        { label: "Recommended Tools", hint: "comma-separated tool names [press Enter to skip]", required: false }
      ];

      const currentStep = formSteps[skillFormStep];

      return (
        <Box flexDirection="column">
          <Text>Create Skill - Step {skillFormStep + 1}/{formSteps.length}</Text>
          <Text dimColor>{currentStep?.required ? "Required" : "Optional (Enter to skip)"} • Esc: cancel</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text>{currentStep?.label}</Text>
            <Text dimColor>{currentStep?.hint}</Text>
            <Box marginTop={1}>
              <Text>{skillEditValue || "(empty)"}</Text>
            </Box>
          </Box>
        </Box>
      );
    }

    // Skills preview - show collected data and generated fields
    if (skillMenuMode === "preview") {
      return (
        <Box flexDirection="column">
          <Text>Skill Configuration Preview</Text>
          <Text dimColor>Review the skill configuration below</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text>ID: {skillFormData.skill_slug || "(not set)"}</Text>
            <Text>Name: {skillFormData.name || "(not set)"}</Text>
            <Text>Summary: {skillFormData.summary || "(not set)"}</Text>
            <Box marginTop={1}><Text dimColor>Triggers: {skillFormData.triggers?.join(", ") || "(AI will generate)"}</Text></Box>
            <Text dimColor>Tags: {skillFormData.tags?.join(", ") || "(AI will generate)"}</Text>
            <Text dimColor>Tools: {skillFormData.recommended_tools?.join(", ") || "(AI will generate)"}</Text>
          </Box>
          <Box marginTop={1}><Text dimColor>Press Enter to create, 'e' to edit, Esc to cancel</Text></Box>
        </Box>
      );
    }

    return null;
  })() : null;

  return (
    <>
      <Banner displayMode={displayMode} width={stdoutWidth} />
      <Text color="gray">
        {connected ? "connected" : "connecting..."}
        {daemonVersion ? ` (daemon ${daemonVersion})` : ""}
      </Text>
      {wizardPanel}
      {mountsPanel}
      {initProjectPanel}
      {modelsPanel}
      {commandsPanel}
      {agentsPanel}
      {skillsPanel}
    </>
  );
});

function App(props: { port: number }) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const stdoutWidth = stdout?.columns ?? 80;
  const [connected, setConnected] = useState(false);
  const [daemonVersion, setDaemonVersion] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turnId, setTurnId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lines, setLinesState] = useState<LineEntry[]>([]);
  const [mode, setMode] = useState<Mode>("chat");
  const linesRef = useRef<LineEntry[]>([]);
  const lineSeq = useRef(0);
  const linesCommitTimer = useRef<NodeJS.Timeout | null>(null);
  const ctrlCPressTime = useRef<number>(0);
  const inputStore = useRef<InputStore>({ value: "", subscribers: new Set() });
  const notifyInputSubscribers = useCallback(() => {
    inputStore.current.subscribers.forEach((cb) => cb());
  }, []);
  const setInputValue = useCallback(
    (value: string) => {
      inputStore.current.value = value;
      notifyInputSubscribers();
    },
    [notifyInputSubscribers]
  );
  const updateInputValue = useCallback(
    (updater: (prev: string) => string) => {
      setInputValue(updater(inputStore.current.value));
    },
    [setInputValue]
  );

  const [wizardIndex, setWizardIndex] = useState(0);
  const [operationMode, setOperationMode] = useState<OperationMode>("auto");
  const [mountsRefresh, setMountsRefresh] = useState(0);
  const [mountsIndex, setMountsIndex] = useState(0);
  const [projectRefresh, setProjectRefresh] = useState(0);
  const [projectFilter, setProjectFilter] = useState("");
  const [projectIndex, setProjectIndex] = useState(0);
  const [commandsRefresh, setCommandsRefresh] = useState(0);
  const [commandsIndex, setCommandsIndex] = useState(0);
  const [agentsRefresh, setAgentsRefresh] = useState(0);
  const [agentsIndex, setAgentsIndex] = useState(0);
  const [agentMenuMode, setAgentMenuMode] = useState<"list" | "creation_method" | "template_select" | "form" | "ai_description">("list");
  const [agentCreationMethodIndex, setAgentCreationMethodIndex] = useState(0);
  const [agentTemplateIndex, setAgentTemplateIndex] = useState(0);
  const [agentFormStep, setAgentFormStep] = useState(0);
  const [agentFormData, setAgentFormData] = useState<Partial<AgentConfig>>({});
  const [agentEditValue, setAgentEditValue] = useState("");

  const [skillMenuMode, setSkillMenuMode] = useState<"list" | "form" | "preview">("list");
  const [skillFormStep, setSkillFormStep] = useState(0);
  const [skillFormData, setSkillFormData] = useState<Record<string, any>>({});
  const [skillSkippedFields, setSkillSkippedFields] = useState<Set<string>>(new Set());
  const [skillEditValue, setSkillEditValue] = useState("");

  const [commandMenuMode, setCommandMenuMode] = useState<"list" | "form" | "preview">("list");
  const [commandFormStep, setCommandFormStep] = useState(0);
  const [commandFormData, setCommandFormData] = useState<Record<string, any>>({});
  const [commandSkippedFields, setCommandSkippedFields] = useState<Set<string>>(new Set());
  const [commandEditValue, setCommandEditValue] = useState("");

  const [showThinking, setShowThinking] = useState(false);
  const [showTodoPanel, setShowTodoPanel] = useState(false);
  const [showToolDetails, setShowToolDetails] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);

  // TTS state
  const [ttsEnabled, setTtsEnabled] = useState(process.env.FF_TTS_ENABLED === "true");
  const ttsServiceReadyRef = useRef(false); // Use ref to avoid closure staleness in WebSocket handler
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [currentVoice] = useState(process.env.FF_TTS_VOICE || "af_heart");
  const textBufferRef = useRef<TextBuffer | null>(null);
  const playbackQueueRef = useRef<AudioPlaybackQueue | null>(null);
  const ttsProcessRef = useRef<ChildProcess | null>(null);
  // Buffer for early chunks that arrive before TTS is ready
  const earlyTtsChunksRef = useRef<string[]>([]);

  const [doctorRunning, setDoctorRunning] = useState(false);
  const [doctorWaitingForConfirm, setDoctorWaitingForConfirm] = useState(false);

  const mountsCfg = useMemo(() => readMountsConfig(), [mountsRefresh]);
  const mountRows = useMemo(
    () =>
      [
        {
          key: "claude" as const,
          label: "Claude mounts (.claude/skills)",
          enabled: mountsCfg.mounts.claude
        },
        {
          key: "factory" as const,
          label: "Factory mounts (.factory/skills)",
          enabled: mountsCfg.mounts.factory
        }
      ] as const,
    [mountsCfg.mounts.claude, mountsCfg.mounts.factory]
  );

  const workspaceDir = useMemo(() => {
    const repoRoot = findRepoRoot();
    const runtimeCfg = resolveConfig({ repoRoot });
    const workspaceFromEnv = process.env.FF_WORKSPACE_DIR;
    return resolveWorkspaceDir((runtimeCfg as any).workspace_dir ?? workspaceFromEnv ?? undefined);
  }, []);

  const transcriptHeight = useMemo(() => {
    const rows = stdout?.rows ?? 40;
    return Math.max(8, rows - 12);
  }, [stdout?.rows]);

  const discoverProjects = (): ProjectStub[] => {
    const projectsRoot = path.join(workspaceDir, "projects");
    if (!fs.existsSync(projectsRoot) || !fs.statSync(projectsRoot).isDirectory()) return [];
    const dirs = fs
      .readdirSync(projectsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("."))
      .map((d) => path.join(projectsRoot, d.name));
    const stubs = dirs.map((dir) => {
      const hasFF = fs.existsSync(path.join(dir, "FF_PROJECT.md")) || fs.existsSync(path.join(dir, "ff_project.md"));
      const hasProj = fs.existsSync(path.join(dir, "PROJECT.md")) || fs.existsSync(path.join(dir, "project.md"));
      return { dir, name: path.basename(dir), status: hasFF || hasProj ? ("ready" as const) : ("needs_setup" as const) };
    });
    stubs.sort((a, b) => {
      try {
        const am = fs.statSync(a.dir).mtimeMs;
        const bm = fs.statSync(b.dir).mtimeMs;
        return bm - am;
      } catch {
        return a.name.localeCompare(b.name);
      }
    });
    return stubs;
  };

  const projectRows = useMemo(() => {
    // Force recompute when we "enter" the picker or toggle filter.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    projectRefresh;
    const all = discoverProjects();
    const f = projectFilter.trim().toLowerCase();
    if (!f) return all;
    return all.filter((p) => p.name.toLowerCase().includes(f));
  }, [projectFilter, projectRefresh]);

  const commandRows = useMemo(() => {
    // Force recompute when refresh is triggered
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    commandsRefresh;
    const cmds = loadCommands(workspaceDir);
    return listCommands(cmds);
  }, [workspaceDir, commandsRefresh]);

  const agentRows = useMemo(() => {
    // Force recompute when refresh is triggered
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    agentsRefresh;
    const agents = loadAgentConfigs(workspaceDir);
    return listAgentConfigs(agents);
  }, [workspaceDir, agentsRefresh]);

  const agentTemplates = useMemo(() => {
    const templates = getAllTemplates(workspaceDir);
    return Array.from(templates.values());
  }, [workspaceDir]);

  // Models wizard state
  const [modelIndex, setModelIndex] = useState(0);
  const [modelEditingKey, setModelEditingKey] = useState<ModelKey | null>(null);
  const [modelEditValue, setModelEditValue] = useState("");

  const [ws, setWs] = useState<WebSocket | null>(null);

  const [profileRefresh, setProfileRefresh] = useState(0);

  const commitLines = useCallback(
    (immediate = false) => {
      const flush = () => {
        linesCommitTimer.current = null;
        setLinesState([...linesRef.current]);
      };
      if (immediate) {
        if (linesCommitTimer.current) {
          clearTimeout(linesCommitTimer.current);
          linesCommitTimer.current = null;
        }
        flush();
        return;
      }
      if (linesCommitTimer.current) return;
      linesCommitTimer.current = setTimeout(flush, LINE_COMMIT_DELAY);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (linesCommitTimer.current) clearTimeout(linesCommitTimer.current);
    };
  }, []);

  const pushLines = useCallback(
    (rawLines: Line | Line[], opts?: { immediate?: boolean }) => {
      const arr = Array.isArray(rawLines) ? rawLines : [rawLines];
      if (!arr.length) return;
      const entries = arr.map((line) => ({ ...line, id: ++lineSeq.current }));
      const merged = [...linesRef.current, ...entries];
      linesRef.current = merged.length > MAX_TRANSCRIPT_LINES ? merged.slice(-MAX_TRANSCRIPT_LINES) : merged;
      commitLines(opts?.immediate ?? false);
    },
    [commitLines]
  );

  const appendToLastLine = useCallback(
    (kind: Line["kind"], text: string): boolean => {
      if (!text) return false;
      if (!linesRef.current.length) return false;
      const next = [...linesRef.current];
      const last = next[next.length - 1];
      if (!last || last.kind !== kind) return false;
      last.text += text;
      linesRef.current = next;
      commitLines(false);
      return true;
    },
    [commitLines]
  );

  const clearTranscript = useCallback(() => {
    linesRef.current = [];
    commitLines(true);
  }, [commitLines]);

  useEffect(() => {
    if (scrollOffset === 0) return;
    const maxOffset = Math.max(0, lines.length - transcriptHeight);
    if (scrollOffset > maxOffset) setScrollOffset(maxOffset);
  }, [lines.length, scrollOffset, transcriptHeight]);

  const displayMode = useMemo(() => String(process.env.FF_DISPLAY_MODE || "clean").trim().toLowerCase(), []);

  const profileName = useMemo(() => {
    const preferred = String(process.env.FF_PROFILE || "").trim();
    const cfg = readConfig();
    if (preferred) return preferred;
    if (cfg.defaultProfile) return cfg.defaultProfile;
    return cfg.profiles[0]?.name || "default";
  }, []);

  const currentProfile = useMemo((): Profile | null => {
    const cfg = readConfig();
    return cfg.profiles.find((p) => p.name === profileName) || null;
  }, [profileName, profileRefresh]);

  const getModelValue = (p: Profile | null, key: ModelKey): string => {
    if (!p) return "";
    const v = (p as any)[key];
    return typeof v === "string" ? v : "";
  };

  const persistModelValue = (key: ModelKey, value: string): void => {
    const cfg = readConfig();
    const idx = cfg.profiles.findIndex((p) => p.name === profileName);
    if (idx === -1) return;
    const next = { ...(cfg.profiles[idx] as any) } as any;
    if (!value.trim()) delete next[key];
    else next[key] = value.trim();
    cfg.profiles[idx] = next as any;
    writeConfig(cfg);
    setProfileRefresh((n) => n + 1);
  };

  const cycleOperationMode = useCallback(() => {
    setOperationMode((cur) => {
      const i = OP_MODES.indexOf(cur);
      const next = OP_MODES[(i + 1) % OP_MODES.length] || "auto";
      pushLines({ kind: "system", text: `Mode: ${next}` });
      return next;
    });
  }, [pushLines]);

  const listToolsLocal = useCallback(() => {
    const schemas = loadToolSchemas();
    const rows = schemas
      .map((t) => ({
        name: String(t?.function?.name || "").trim(),
        description: String(t?.function?.description || "").trim()
      }))
      .filter((r) => r.name.length)
      .sort((a, b) => a.name.localeCompare(b.name));
    pushLines([
      { kind: "system", text: `Tools (${rows.length}):` },
      ...rows.map((r) => ({ kind: "tool" as const, text: `- ${r.name}${r.description ? ` — ${r.description}` : ""}` }))
    ]);
  }, [pushLines]);

  const sendTurn = (prompt: string, opts?: { echoUser?: boolean }) => {
    // Interrupt TTS playback when user sends new message
    if (playbackQueueRef.current) {
      playbackQueueRef.current.interrupt();
    }
    if (textBufferRef.current) {
      textBufferRef.current.flush();
    }
    setTtsSpeaking(false);

    const echoUser = opts?.echoUser !== false;
    const wrapped =
      operationMode === "planning"
        ? [
            "[FF_OPERATION_MODE=planning]",
            "Do NOT execute tools unless explicitly asked. Focus on planning, clarifying questions, and next steps.",
            "",
            prompt
          ].join("\n")
        : operationMode === "read_only"
          ? [
              "[FF_OPERATION_MODE=read_only]",
              "Avoid any filesystem writes, destructive commands, or system changes. Prefer read-only inspection and planning.",
              "",
              prompt
            ].join("\n")
          : prompt;

    if (ws) {
      setProcessing(true);
      ws.send(JSON.stringify({ type: "start_turn", input: wrapped, sessionId }));
    }
    if (echoUser) pushLines({ kind: "user", text: prompt }, { immediate: true });
    setInputValue("");
  };

  const createMissingProjectContextFiles = (projectDir: string): string[] => {
    const created: string[] = [];
    const ffProjectPath = path.join(projectDir, "FF_PROJECT.md");
    const projectPath = path.join(projectDir, "PROJECT.md");
    if (fs.existsSync(ffProjectPath) || fs.existsSync(projectPath)) return created;

    const projectName = path.basename(projectDir).replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
    const title = projectName ? projectName[0].toUpperCase() + projectName.slice(1) : "Project";
    const content = `# ${title}

## Project Overview
This is the ${title.toLowerCase()} project.

## Purpose
- [Add project purpose and goals here]

## Setup
- [Add setup instructions here]

## Key Files
- [List important files and their purposes]

## Notes
- [Add any additional notes or context]

---
*Auto-generated by FF-Terminal project initialization*
`;

    try {
      fs.writeFileSync(ffProjectPath, content, "utf8");
      created.push("FF_PROJECT.md");
    } catch {
      // ignore
    }
    return created;
  };

  const initProjectFromDir = (targetDir: string): void => {
    const abs = path.resolve(targetDir);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
      pushLines({ kind: "error", text: `init-project: not a directory: ${abs}` });
      return;
    }

    const created = createMissingProjectContextFiles(abs);
    if (created.length) pushLines({ kind: "system", text: `✓ Created: ${created.join(", ")}` });

    const candidates = ["FF_PROJECT.md", "ff_project.md", "PROJECT.md", "project.md"].map((n) => path.join(abs, n));
    const seen = new Set<string>();
    const contextFiles: string[] = [];
    for (const p of candidates) {
      if (!fs.existsSync(p) || !fs.statSync(p).isFile()) continue;
      try {
        const real = fs.realpathSync(p);
        if (seen.has(real)) continue;
        seen.add(real);
        contextFiles.push(p);
      } catch {
        if (seen.has(p)) continue;
        seen.add(p);
        contextFiles.push(p);
      }
    }

    if (!contextFiles.length) {
      pushLines([
        { kind: "system", text: `No context files found in: ${abs}` },
        { kind: "system", text: "Expected files: FF_PROJECT.md or PROJECT.md" }
      ]);
      return;
    }

    const MAX_CHARS_PER_FILE = 50_000;
    const sections: string[] = [];
    let totalChars = 0;
    for (const fp of contextFiles) {
      try {
        let content = fs.readFileSync(fp, "utf8");
        if (content.length > MAX_CHARS_PER_FILE) {
          const omitted = content.length - MAX_CHARS_PER_FILE;
          content = content.slice(0, MAX_CHARS_PER_FILE) + `\n\n[... truncated, ${omitted} chars omitted ...]`;
        }
        totalChars += content.length;
        sections.push(`### File: ${path.basename(fp)}\n\n${content}`);
      } catch {
        // ignore unreadable files
      }
    }

    if (!sections.length) {
      pushLines({ kind: "error", text: `Failed to read any context files from: ${abs}` });
      return;
    }

    const projectName = path.basename(abs);
    const fullContext = sections.join("\n\n---\n\n");
    const initPrompt = `I've initialized context for the **${projectName}** project at \`${abs}\`.

Please provide a brief summary of:
1. What project this is and what it does
2. Key guidelines and conventions to follow
3. Current status or recent work (if documented)
4. Any important notes or warnings

Be concise but comprehensive.

Project Context:
${fullContext}`;

    pushLines([
      { kind: "system", text: `✓ Loaded ${contextFiles.length} project context files (${totalChars.toLocaleString()} chars)` },
      { kind: "system", text: `Project: ${projectName} at ${abs}` }
    ]);
    sendTurn(initPrompt, { echoUser: false });
  };

  useEffect(() => {
    let stopped = false;
    let retryTimer: NodeJS.Timeout | null = null;
    let socket: WebSocket | null = null;

    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(`ws://127.0.0.1:${props.port}`);
      setWs(socket);

      socket.on("open", () => {
        setConnected(true);
        socket?.send(JSON.stringify({ type: "hello", client: "ink", version: "0.0.0" }));
      });

      socket.on("close", () => {
        setConnected(false);
        setTurnId(null);
        setProcessing(false);
        if (stopped) return;
        retryTimer = setTimeout(connect, 750);
      });

      socket.on("message", (data) => {
        console.log('[TTS DEBUG] WebSocket message received, type:', (data.toString().slice(0, 50)));
        let msg: ServerMessage | null = null;
        try {
          msg = JSON.parse(String(data)) as ServerMessage;
        } catch {
          pushLines({ kind: "system", text: String(data) });
          return;
        }

        if (msg.type === "hello") {
          setDaemonVersion(msg.daemonVersion);
          return;
        }

        if (msg.type === "turn_started") {
          setSessionId(msg.sessionId);
          setTurnId(msg.turnId);
          setProcessing(true);
          // Clear any buffered early chunks from previous turn
          if (earlyTtsChunksRef.current.length > 0) {
            console.log('[TTS DEBUG] Clearing', earlyTtsChunksRef.current.length, 'early chunks from previous turn');
          }
          earlyTtsChunksRef.current = [];
          // Reset text buffer for new turn
          if (textBufferRef.current) {
            textBufferRef.current.reset();
          }
          // Hide verbose turn markers in clean mode
          if (displayMode !== "clean") {
            pushLines({ kind: "system", text: `--- turn ${msg.turnId} ---` }, { immediate: true });
          }
          return;
        }

        if (msg.type === "chunk") {
          // Defensive: if we somehow lost the processing flag (e.g., user queued/resumed), re-enable spinner on any incoming chunk.
          if (!processing) setProcessing(true);
          const parsed = parseWireChunk(msg.chunk, displayMode);
          if (!parsed) return;

          // TTS integration: add content to text buffer for speech synthesis
          console.log('[TTS DEBUG] Chunk received, kind:', parsed.kind, 'ttsEnabled:', ttsEnabled, 'ttsServiceReady:', ttsServiceReadyRef.current, 'textBuffer exists:', !!textBufferRef.current);
          if (
            ttsEnabled &&
            ttsServiceReadyRef.current &&
            parsed.kind === "assistant" &&
            textBufferRef.current
          ) {
            console.log('[TTS DEBUG] Adding text to buffer:', parsed.text);
            textBufferRef.current.add(parsed.text);
          } else if (
            ttsEnabled &&
            parsed.kind === "assistant" &&
            (!ttsServiceReadyRef.current || !textBufferRef.current)
          ) {
            // TTS enabled but not ready yet - buffer early chunks
            console.log('[TTS DEBUG] TTS not ready, buffering early chunk:', parsed.text);
            earlyTtsChunksRef.current.push(parsed.text);
          } else {
            console.log('[TTS DEBUG] Skipping TTS - conditions not met');
          }

          if (parsed.kind === "assistant" || parsed.kind === "thinking") {
            const merged = appendToLastLine(parsed.kind, parsed.text);
            if (merged) return;
          }
          pushLines(parsed);
          return;
        }

        if (msg.type === "turn_finished") {
          // Flush TTS buffer on turn completion
          console.log('[TTS DEBUG] Turn finished, flushing buffer...');
          if (ttsEnabled && ttsServiceReadyRef.current && textBufferRef.current) {
            textBufferRef.current.flush();
            console.log('[TTS DEBUG] Buffer flushed');
          } else {
            console.log('[TTS DEBUG] Skipping flush - ttsEnabled:', ttsEnabled, 'ttsServiceReady:', ttsServiceReadyRef.current, 'buffer exists:', !!textBufferRef.current);
          }

          setTurnId(null);
          setProcessing(false);
          // Hide verbose turn end markers in clean mode
          if (displayMode !== "clean") {
            pushLines({ kind: "system", text: `--- done (${msg.ok ? "ok" : "error"}) ---` });
          }
          return;
        }

        if (msg.type === "tools") {
          const tools = Array.isArray(msg.tools) ? msg.tools.map(String).filter(Boolean) : [];
          pushLines([
            { kind: "system", text: `Tools (${tools.length}):` },
            ...tools.map((t) => ({ kind: "tool" as const, text: `- ${t}` }))
          ]);
          return;
        }
      });

      socket.on("error", (err) => {
        pushLines({ kind: "error", text: (err as any)?.message ?? String(err) });
      });
    };

    connect();

    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      try {
        socket?.close();
      } catch {
        // ignore
      }
    };
  }, [appendToLastLine, props.port, pushLines]);

  // TTS service lifecycle management
  useEffect(() => {
    console.log('[TTS DEBUG] useEffect triggered, ttsEnabled:', ttsEnabled);
    if (!ttsEnabled) return;

    (async () => {
      try {
        console.log('[TTS DEBUG] Starting TTS service...');
        // Start TTS service
        const { process: ttsProc, ready, alreadyRunning } = await startTtsService();
        ttsProcessRef.current = ttsProc;
        ttsServiceReadyRef.current = ready; // Use ref to avoid closure staleness
        console.log('[TTS DEBUG] Service started, ready:', ready, 'alreadyRunning:', alreadyRunning);

        if (!ready) {
          console.log('[TTS DEBUG] Service not ready, disabling TTS');
          pushLines({
            kind: "system",
            text: "⚠️  TTS service unavailable. Voice output disabled."
          });
          setTtsEnabled(false);
          return;
        }

        // Initialize playback queue
        console.log('[TTS DEBUG] Initializing playback queue...');
        playbackQueueRef.current = new AudioPlaybackQueue();

        // Initialize text buffer
        console.log('[TTS DEBUG] Initializing text buffer...');
        textBufferRef.current = new TextBuffer({
          onSentence: async (text: string) => {
            console.log('[TTS DEBUG] onSentence triggered with text:', text);
            try {
              console.log('[TTS DEBUG] Calling synthesize...');
              const audio = await synthesize(text, { voice: currentVoice });
              console.log('[TTS DEBUG] Synthesis successful, audio size:', audio.length);
              playbackQueueRef.current?.enqueue(audio);
              console.log('[TTS DEBUG] Audio enqueued for playback');
              setTtsSpeaking(true);
            } catch (err) {
              console.error('[TTS DEBUG] Synthesis failed:', err);
            }
          }
        });
        console.log('[TTS DEBUG] TTS fully initialized!');

        // Process any early chunks that arrived before TTS was ready
        const earlyChunks = earlyTtsChunksRef.current;
        if (earlyChunks.length > 0) {
          console.log('[TTS DEBUG] Processing', earlyChunks.length, 'early chunks...');
          const combined = earlyChunks.join('');
          textBufferRef.current.add(combined);
          earlyTtsChunksRef.current = [];
        }
      } catch (err) {
        console.error('[TTS DEBUG] Failed to initialize TTS:', err);
        pushLines({
          kind: "error",
          text: `TTS initialization failed: ${err instanceof Error ? err.message : String(err)}`
        });
        setTtsEnabled(false);
      }
    })();

    // Cleanup
    return () => {
      console.log('[TTS DEBUG] Cleaning up TTS resources...');
      playbackQueueRef.current?.interrupt();
      textBufferRef.current?.flush();
      if (ttsProcessRef.current) {
        stopTtsService(ttsProcessRef.current).catch(console.error);
      }
    };
  }, [ttsEnabled, currentVoice, pushLines]);

  const saveAgentFromForm = useCallback(
    (formData: Partial<AgentConfig>) => {
      if (!formData.id || !formData.name || !formData.description || !formData.systemPromptAddition) {
        pushLines({ kind: "error", text: "Missing required fields" });
        return;
      }

      const prompt = `Create an agent using agent_draft tool with these parameters:
- agent_id: "${formData.id}"
- name: "${formData.name}"
- description: "${formData.description}"
- systemPromptAddition: """${formData.systemPromptAddition}"""
- mode: "${formData.mode || "auto"}"
- allowedTools: ${JSON.stringify(formData.allowedTools || [])}
- deniedTools: ${JSON.stringify(formData.deniedTools || [])}
- maxTurns: ${formData.maxTurns ? JSON.stringify(formData.maxTurns) : "null"}
- tags: ${JSON.stringify(formData.tags || [])}

Then apply it with agent_apply to save the agent config.`;

      pushLines({ kind: "system", text: "Creating agent..." });
      sendTurn(prompt, { echoUser: false });
      setMode("chat");
      setAgentMenuMode("list");
    },
    [pushLines, sendTurn]
  );

  useInput((ch, key) => {
    // Shift+Tab cycles operation mode (matches Python TUI).
    if (key.tab && key.shift) {
      cycleOperationMode();
      return;
    }

    if (key.pageUp) {
      setScrollOffset((v) => v + 5);
      return;
    }
    if (key.pageDown) {
      setScrollOffset((v) => Math.max(0, v - 5));
      return;
    }
    if ((key as any).home) {
      setScrollOffset(0);
      return;
    }

    // Mounts wizard mode.
    if (mode === "mounts") {
      if (key.escape) {
        setMode("chat");
        return;
      }
      if (key.upArrow) {
        setMountsIndex((i) => (i - 1 + mountRows.length) % mountRows.length);
        return;
      }
      if (key.downArrow) {
        setMountsIndex((i) => (i + 1) % mountRows.length);
        return;
      }
      const toggle = () => {
        const row = mountRows[mountsIndex];
        if (!row) return;
        setMountEnabled(row.key, !row.enabled);
        setMountsRefresh((n) => n + 1);
        pushLines({ kind: "system", text: `Mount ${row.key} = ${!row.enabled ? "enabled" : "disabled"}` });
      };
      if (key.return || ch === " ") {
        toggle();
        return;
      }
      return;
    }

    // Init-project picker mode.
    if (mode === "init_project") {
      if (key.escape) {
        setMode("chat");
        return;
      }
      if (key.upArrow) {
        setProjectIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setProjectIndex((i) => Math.min(Math.max(0, projectRows.length - 1), i + 1));
        return;
      }
      if (key.return) {
        const selected = projectRows[projectIndex];
        if (selected) {
          setMode("chat");
          initProjectFromDir(selected.dir);
        }
        return;
      }
      if (key.backspace || key.delete) {
        setProjectFilter((v) => v.slice(0, -1));
        setProjectIndex(0);
        return;
      }
      if (ch && ch.trim()) {
        setProjectFilter((v) => v + ch);
        setProjectIndex(0);
        return;
      }
      return;
    }

    // Wizard mode.
    if (mode === "wizard") {
      if (key.escape) {
        setMode("chat");
        return;
      }
      if (key.upArrow) {
        setWizardIndex((i) => (i - 1 + WIZARD_ROWS.length) % WIZARD_ROWS.length);
        return;
      }
      if (key.downArrow) {
        setWizardIndex((i) => (i + 1) % WIZARD_ROWS.length);
        return;
      }
      if (key.return) {
        const w = WIZARD_ROWS[wizardIndex]?.id;
        if (w === "models") {
          setMode("models");
          setModelIndex(0);
          setModelEditingKey(null);
          setModelEditValue("");
          pushLines({
            kind: "system",
            text: `Model settings (profile: ${profileName}). Esc to exit, ↑/↓ to select, Enter to edit.`
          });
          return;
        }
        if (w === "mounts") {
          setMode("mounts");
          setMountsIndex(0);
          pushLines({ kind: "system", text: "Mounts: Esc to exit • ↑/↓ select • Space/Enter toggle" });
          return;
        }
        if (w === "init_project") {
          setMode("init_project");
          setProjectFilter("");
          setProjectIndex(0);
          setProjectRefresh((n) => n + 1);
          pushLines({ kind: "system", text: "Init Project: type to filter • ↑/↓ select • Enter load • Esc quit" });
          return;
        }
        if (w === "commands") {
          setMode("commands");
          setCommandsIndex(0);
          setCommandMenuMode("list");
          setCommandFormStep(0);
          setCommandFormData({});
          setCommandSkippedFields(new Set());
          setCommandEditValue("");
          pushLines({ kind: "system", text: "Commands: Esc back • ↑/↓ select • Enter view • n new command" });
          return;
        }
        if (w === "agents") {
          setMode("agents");
          setAgentsIndex(0);
          pushLines({ kind: "system", text: "Agents: Esc back • ↑/↓ select • Enter view • t template • n custom" });
          return;
        }
        if (w === "skills") {
          setMode("skills");
          pushLines({ kind: "system", text: "Skills: Esc back • n create new skill using skill_draft" });
          return;
        }
      }
      return;
    }

    // Models wizard mode (local UI, no daemon calls).
    if (mode === "models") {
      if (key.escape) {
        setMode("chat");
        setModelEditingKey(null);
        setModelEditValue("");
        return;
      }

      if (modelEditingKey) {
        if (key.return) {
          persistModelValue(modelEditingKey, modelEditValue);
          pushLines({
            kind: "system",
            text: `Saved ${modelEditingKey} for profile "${profileName}". Restart daemon (npm run dev:start) to apply changes.`
          });
          setModelEditingKey(null);
          setModelEditValue("");
          return;
        }
        if (key.backspace || key.delete) {
          setModelEditValue((v) => v.slice(0, -1));
          return;
        }
        if (ch) setModelEditValue((v) => v + ch);
        return;
      }

      if (key.upArrow) {
        setModelIndex((i) => (i - 1 + MODEL_ROWS.length) % MODEL_ROWS.length);
        return;
      }
      if (key.downArrow) {
        setModelIndex((i) => (i + 1) % MODEL_ROWS.length);
        return;
      }
      if (key.return) {
        const k = MODEL_ROWS[modelIndex]?.key || "model";
        setModelEditingKey(k);
        setModelEditValue(getModelValue(currentProfile, k));
        return;
      }
      return;
    }

    // Commands wizard mode
    // Commands wizard - main menu (list view)
    if (mode === "commands" && commandMenuMode === "list") {
      if (key.escape) {
        setMode("chat");
        return;
      }
      if (key.upArrow) {
        setCommandsIndex((i) => (i - 1 + commandRows.length) % commandRows.length);
        return;
      }
      if (key.downArrow) {
        setCommandsIndex((i) => (i + 1) % commandRows.length);
        return;
      }
      if (key.return) {
        const cmd = commandRows[commandsIndex];
        if (cmd) {
          pushLines([
            { kind: "system", text: `Command: /${cmd.slug}` },
            { kind: "system", text: `Description: ${cmd.description || "(no description)"}` },
            { kind: "system", text: `Template preview: ${cmd.template.slice(0, 100)}${cmd.template.length > 100 ? "..." : ""}` }
          ]);
        }
        return;
      }
      if (ch === "n") {
        setCommandMenuMode("form");
        setCommandFormStep(0);
        setCommandFormData({});
        setCommandSkippedFields(new Set());
        setCommandEditValue("");
        return;
      }
      return;
    }

    // Commands wizard - form entry
    if (mode === "commands" && commandMenuMode === "form") {
      const requiredFields = ["command_slug", "description", "template"];
      const requiredSteps = [0, 1, 2];
      const fieldKeys = ["command_slug", "description", "template", "tags"];

      if (key.escape) {
        setCommandMenuMode("list");
        setCommandFormStep(0);
        setCommandFormData({});
        setCommandSkippedFields(new Set());
        setCommandEditValue("");
        return;
      }

      if (commandFormStep < 4) {
        if (key.return) {
          const currentFieldKey = fieldKeys[commandFormStep];
          const value = commandEditValue.trim();
          const isRequired = requiredSteps.includes(commandFormStep);

          // Validate required fields
          if (isRequired && !value) {
            pushLines({
              kind: "system",
              text: `Required field cannot be empty. Please enter a value.`
            });
            return;
          }

          // If empty (skipping optional field), mark as skipped
          if (!value && !isRequired) {
            setCommandSkippedFields((prev) => new Set([...prev, currentFieldKey]));
          } else {
            // Parse comma-separated fields for tags
            if (currentFieldKey === "tags") {
              const newFormData = { ...commandFormData };
              newFormData.tags = value.split(",").map((s) => s.trim()).filter(Boolean);
              setCommandFormData(newFormData);
            } else {
              setCommandFormData((prev) => ({
                ...prev,
                [currentFieldKey]: value
              }));
            }
          }

          setCommandFormStep((s) => s + 1);
          setCommandEditValue("");
          return;
        }

        if (key.backspace || key.delete) {
          setCommandEditValue((v) => v.slice(0, -1));
          return;
        }

        if (ch) {
          setCommandEditValue((v) => v + ch);
          return;
        }
      }

      // Step 4 - Preview & Save
      if (commandFormStep === 4) {
        if (key.return) {
          // Create the command via LLM if skipped fields, otherwise directly
          if (commandSkippedFields.size > 0) {
            const skippedList = Array.from(commandSkippedFields).join(", ");
            const llmPrompt = `I created a command with these details:
- command_slug: "${commandFormData.command_slug}"
- description: "${commandFormData.description}"
- template: "${commandFormData.template}"

I skipped these optional fields: ${skippedList}

Please generate reasonable values for the skipped fields and return ONLY a valid JSON object like:
{
  "tags": ["tag1", "tag2"]
}

Do NOT add any markdown formatting or code fences. Return ONLY the JSON object.`;

            sendTurn(llmPrompt, { echoUser: false });
            setMode("chat");
            setCommandMenuMode("list");
            setCommandFormStep(0);
            setCommandFormData({});
            setCommandSkippedFields(new Set());
            setCommandEditValue("");
          } else {
            // All fields provided, create directly via command_draft + command_apply
            const llmPrompt = `Use the command_draft tool to create a new command with these parameters:
- command_slug: "${commandFormData.command_slug}"
- description: "${commandFormData.description}"
- template: "${commandFormData.template}"
${commandFormData.tags ? `- tags: ${JSON.stringify(commandFormData.tags)}` : ""}

After the draft is created, use command_apply to apply it and save the command.`;

            sendTurn(llmPrompt, { echoUser: false });
            setMode("chat");
            setCommandMenuMode("list");
            setCommandFormStep(0);
            setCommandFormData({});
            setCommandSkippedFields(new Set());
            setCommandEditValue("");
          }
          return;
        }

        if (ch === "e") {
          setCommandFormStep(0);
          setCommandEditValue("");
          return;
        }

        if (key.escape) {
          setCommandMenuMode("list");
          setCommandFormStep(0);
          setCommandFormData({});
          setCommandSkippedFields(new Set());
          setCommandEditValue("");
          return;
        }
      }
      return;
    }

    // Agents wizard - main menu (list view)
    if (mode === "agents" && agentMenuMode === "list") {
      if (key.escape) {
        setMode("chat");
        setAgentMenuMode("list");
        return;
      }
      if (key.upArrow) {
        setAgentsIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setAgentsIndex((i) => Math.min(agentRows.length - 1, i + 1));
        return;
      }
      if (key.return) {
        const agent = agentRows[agentsIndex];
        if (agent) {
          pushLines([
            { kind: "system", text: `Agent: ${agent.name}` },
            { kind: "system", text: `Description: ${agent.description}` },
            { kind: "system", text: `Mode: ${agent.mode || "auto"}` },
            { kind: "system", text: `Max turns: ${agent.maxTurns || "∞"}` }
          ]);
        }
        return;
      }
      if (ch === "n") {
        setAgentMenuMode("creation_method");
        setAgentCreationMethodIndex(0);
        return;
      }
      return;
    }

    // Creation method selection menu
    if (mode === "agents" && agentMenuMode === "creation_method") {
      if (key.escape) {
        setAgentMenuMode("list");
        return;
      }
      if (key.upArrow) {
        setAgentCreationMethodIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setAgentCreationMethodIndex((i) => Math.min(2, i + 1));
        return;
      }
      if (key.return) {
        if (agentCreationMethodIndex === 0) {
          // Create from template
          setAgentMenuMode("template_select");
          setAgentTemplateIndex(0);
        } else if (agentCreationMethodIndex === 1) {
          // Create from scratch
          setAgentMenuMode("form");
          setAgentFormStep(0);
          setAgentFormData({
            id: "",
            name: "",
            description: "",
            mode: "auto",
            systemPromptAddition: ""
          });
          setAgentEditValue("");
        } else if (agentCreationMethodIndex === 2) {
          // AI-assisted
          setAgentMenuMode("ai_description");
          setAgentEditValue("");
        }
        return;
      }
      return;
    }

    // Template selection menu
    if (mode === "agents" && agentMenuMode === "template_select") {
      if (key.escape) {
        setAgentMenuMode("creation_method");
        return;
      }
      if (key.upArrow) {
        setAgentTemplateIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setAgentTemplateIndex((i) => Math.min(agentTemplates.length - 1, i + 1));
        return;
      }
      if (key.return) {
        const template = agentTemplates[agentTemplateIndex];
        if (template) {
          setAgentFormData(template.config);
          setAgentFormStep(0);
          setAgentMenuMode("form");
          setAgentEditValue("");
        }
        return;
      }
      return;
    }

    // Manual form mode - text input
    if (mode === "agents" && agentMenuMode === "form") {
      const requiredSteps = [0, 1, 2, 3, 4]; // Steps 0-4 are required
      const fieldKeys = ["id", "name", "description", "mode", "systemPromptAddition", "allowedTools", "deniedTools", "maxTurns", "tags"];

      if (key.escape) {
        setAgentMenuMode("creation_method");
        setAgentFormStep(0);
        setAgentFormData({});
        setAgentEditValue("");
        return;
      }

      // Steps 0-8 are input steps, step 9 is preview
      if (agentFormStep < 9) {
        if (key.return) {
          const value = agentEditValue.trim();
          const isRequired = requiredSteps.includes(agentFormStep);

          // Validate required fields
          if (isRequired && !value) {
            pushLines({ kind: "system", text: "This field is required." });
            return;
          }

          let newFormData = { ...agentFormData };
          const opModes = ["auto", "confirm", "read_only", "planning"];
          const currentFieldKey = fieldKeys[agentFormStep];

          switch (agentFormStep) {
            case 0: // agent_id
              if (value && !/^[a-z0-9_-]{2,64}$/.test(value)) {
                pushLines({ kind: "system", text: "Invalid agent ID. Must be 2-64 chars of a-z, 0-9, _, -" });
                return;
              }
              newFormData.id = value;
              break;
            case 1: // name
              newFormData.name = value;
              break;
            case 2: // description
              newFormData.description = value;
              break;
            case 3: // mode
              const selectedMode = value.toLowerCase() as any;
              if (value && !opModes.includes(selectedMode)) {
                pushLines({ kind: "system", text: "Invalid mode. Choose: auto, confirm, read_only, or planning" });
                return;
              }
              newFormData.mode = selectedMode || "auto";
              break;
            case 4: // systemPromptAddition
              newFormData.systemPromptAddition = value;
              break;
            case 5: // allowedTools (optional)
              if (value) {
                newFormData.allowedTools = value.split(",").map((s) => s.trim()).filter(Boolean);
              }
              break;
            case 6: // deniedTools (optional)
              if (value) {
                newFormData.deniedTools = value.split(",").map((s) => s.trim()).filter(Boolean);
              }
              break;
            case 7: // maxTurns (optional)
              if (value) {
                const num = parseInt(value, 10);
                if (!isNaN(num) && num > 0) {
                  newFormData.maxTurns = num;
                }
              }
              break;
            case 8: // tags (optional)
              if (value) {
                newFormData.tags = value.split(",").map((s) => s.trim()).filter(Boolean);
              }
              break;
          }

          setAgentFormData(newFormData);
          setAgentFormStep((s) => s + 1);
          setAgentEditValue("");
          return;
        }

        if (key.backspace || key.delete) {
          setAgentEditValue((v) => v.slice(0, -1));
          return;
        }

        if (ch) {
          setAgentEditValue((v) => v + ch);
          return;
        }
      }

      // Step 9 - Preview & Save
      if (agentFormStep === 9) {
        if (key.return) {
          saveAgentFromForm(agentFormData);
          setAgentMenuMode("list");
          setAgentFormStep(0);
          setAgentFormData({});
          setAgentEditValue("");
          return;
        }

        if (ch === "e") {
          setAgentFormStep(0);
          setAgentEditValue("");
          return;
        }

        if (key.escape) {
          setAgentMenuMode("creation_method");
          setAgentFormStep(0);
          setAgentFormData({});
          setAgentEditValue("");
          return;
        }
      }

      return;
    }

    // AI description input
    if (mode === "agents" && agentMenuMode === "ai_description") {
      if (key.escape) {
        setAgentMenuMode("creation_method");
        setAgentEditValue("");
        return;
      }
      if (key.return) {
        const description = agentEditValue.trim();
        if (!description) {
          pushLines({ kind: "system", text: "Description cannot be empty." });
          return;
        }
        const aiPrompt = `Create a specialized agent using agent_draft tool based on this description:

"${description}"

Generate appropriate values for:
- agent_id (unique identifier, lowercase, 2-64 chars of a-z, 0-9, _, -)
- name
- description
- systemPromptAddition (detailed instructions for the agent)
- mode (one of: auto, confirm, read_only, planning)
- allowedTools (array of tool names, or empty array for all tools)
- deniedTools (array of tool names to deny, or empty array)
- tags (array of tags)

Call agent_draft with these parameters. Show me the preview but DO NOT call agent_apply yet. Wait for my confirmation.`;

        pushLines({ kind: "system", text: "Creating agent from description..." });
        sendTurn(aiPrompt, { echoUser: false });
        setMode("chat");
        setAgentMenuMode("list");
        setAgentEditValue("");
        return;
      }
      if (key.backspace || key.delete) {
        setAgentEditValue((v) => v.slice(0, -1));
        return;
      }
      if (ch) {
        setAgentEditValue((v) => v + ch);
        return;
      }
      return;
    }

    // Skills wizard - main menu
    if (mode === "skills" && skillMenuMode === "list") {
      if (key.escape) {
        setMode("chat");
        return;
      }
      if (ch === "n") {
        setSkillMenuMode("form");
        setSkillFormStep(0);
        setSkillFormData({});
        setSkillSkippedFields(new Set());
        setSkillEditValue("");
        return;
      }
      return;
    }

    // Skills form - interactive field entry
    if (mode === "skills" && skillMenuMode === "form") {
      if (key.escape) {
        setSkillMenuMode("list");
        setSkillFormStep(0);
        setSkillFormData({});
        setSkillSkippedFields(new Set());
        setSkillEditValue("");
        return;
      }
      if (key.return) {
        const value = skillEditValue.trim();
        const formSteps = ["skill_slug", "name", "summary", "instructions", "triggers", "tags", "recommended_tools"];
        const requiredSteps = ["skill_slug", "name", "summary", "instructions"];
        const currentFieldKey = formSteps[skillFormStep];

        // Validate required fields
        if (!value && requiredSteps.includes(currentFieldKey)) {
          pushLines({ kind: "system", text: "This field is required." });
          return;
        }

        let newFormData = { ...skillFormData };

        // If empty (skipping optional field), mark as skipped
        if (!value && !requiredSteps.includes(currentFieldKey)) {
          setSkillSkippedFields((prev) => new Set([...prev, currentFieldKey]));
        } else {
          // Validate skill_slug format
          if (currentFieldKey === "skill_slug" && !/^[a-z0-9_-]{2,64}$/.test(value)) {
            pushLines({ kind: "system", text: "Invalid skill ID. Must be 2-64 chars of a-z, 0-9, _, -" });
            return;
          }

          // Parse comma-separated fields
          if (currentFieldKey === "triggers" || currentFieldKey === "tags" || currentFieldKey === "recommended_tools") {
            newFormData[currentFieldKey] = value
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean);
          } else {
            newFormData[currentFieldKey] = value;
          }
        }

        setSkillFormData(newFormData);

        // Move to next step or show preview
        if (skillFormStep < formSteps.length - 1) {
          setSkillFormStep((s) => s + 1);
          setSkillEditValue("");
        } else {
          // All steps done, show preview
          setSkillMenuMode("preview");
        }
        return;
      }
      if (key.backspace || key.delete) {
        setSkillEditValue((v) => v.slice(0, -1));
        return;
      }
      if (ch) {
        setSkillEditValue((v) => v + ch);
        return;
      }
      return;
    }

    // Skills preview - show and confirm
    if (mode === "skills" && skillMenuMode === "preview") {
      if (key.escape) {
        setSkillMenuMode("list");
        setSkillFormStep(0);
        setSkillFormData({});
        setSkillSkippedFields(new Set());
        setSkillEditValue("");
        return;
      }
      if (key.return) {
        // If there are skipped fields, ask LLM to fill them in
        if (skillSkippedFields.size > 0) {
          const skippedList = Array.from(skillSkippedFields).join(", ");
          const llmPrompt = `I created a skill with these details:
- skill_slug: "${skillFormData.skill_slug}"
- name: "${skillFormData.name}"
- summary: "${skillFormData.summary}"
- instructions: """${skillFormData.instructions}"""

I skipped these optional fields: ${skippedList}

Please generate reasonable values for the skipped fields and return a JSON object with:
{
  "triggers": ["array", "of", "triggers"],
  "tags": ["array", "of", "tags"],
  "recommended_tools": ["array", "of", "tool", "names"]
}

Only include the fields I skipped. Return ONLY valid JSON, no explanation.`;

          pushLines({ kind: "system", text: "Generating values for skipped fields..." });
          sendTurn(llmPrompt, { echoUser: false });
        } else {
          // All fields provided, create skill directly
          const skillPrompt = `Create a skill using skill_draft and skill_apply tools with these details:
- skill_slug: "${skillFormData.skill_slug}"
- name: "${skillFormData.name}"
- summary: "${skillFormData.summary}"
- instructions: """${skillFormData.instructions}"""
- triggers: ${JSON.stringify(skillFormData.triggers || [])}
- tags: ${JSON.stringify(skillFormData.tags || [])}
- recommended_tools: ${JSON.stringify(skillFormData.recommended_tools || [])}

Use skill_draft first to create the draft, then skill_apply to create the final skill.`;

          pushLines({ kind: "system", text: "Creating skill..." });
          sendTurn(skillPrompt, { echoUser: false });
        }
        setMode("chat");
        setSkillMenuMode("list");
        return;
      }
      if (ch === "e") {
        // Edit mode - go back to form
        setSkillMenuMode("form");
        setSkillFormStep(0);
        setSkillEditValue("");
        return;
      }
      return;
    }

    const openWizardMenu = () => {
      setMode("wizard");
      setWizardIndex(0);
      pushLines({ kind: "system", text: "Wizards: Esc to exit • ↑/↓ to select • Enter to open" });
    };

    const showHelp = () => {
      pushLines([
        { kind: "system", text: "Commands:" },
        { kind: "system", text: "  /help            Show this help" },
        { kind: "system", text: "  /tools           List available tools" },
        { kind: "system", text: "  /agents          List available agent roles/models" },
        { kind: "system", text: "  /mounts          Show mounts status (read-only)" },
        { kind: "system", text: "" },
        { kind: "system", text: "Wizards:" },
        { kind: "system", text: "  /wizard          Open wizard menu (models, mounts, init-project, commands, agents, skills)" },
        { kind: "system", text: "  /wizard models   Open models wizard" },
        { kind: "system", text: "  /wizard mounts   Open mounts wizard (read-only)" },
        { kind: "system", text: "  /wizard init-project  Open project initialization picker" },
        { kind: "system", text: "  /wizard commands Open custom commands manager" },
        { kind: "system", text: "  /wizard agents   Open agent configuration wizard" },
        { kind: "system", text: "  /wizard skills   Open skills wizard (create reusable skills)" },
        { kind: "system", text: "  /models          Shortcut for /wizard models" },
        { kind: "system", text: "  /commands        Open custom commands manager" },
        { kind: "system", text: "  /command SLUG [args]  Execute custom command with arguments" },
        { kind: "system", text: "  /agents          Open agent configuration" },
        { kind: "system", text: "  /skills          Open skills wizard" },
        { kind: "system", text: "" },
        { kind: "system", text: "Settings:" },
        { kind: "system", text: "  /mode [auto|confirm|read_only|planning]  Set operation mode" },
        { kind: "system", text: "  /planning        Alias for /mode planning" },
        { kind: "system", text: "" },
        { kind: "system", text: "Project:" },
        { kind: "system", text: "  /init            Run initialization analysis" },
        { kind: "system", text: "  /init-project [path]  Initialize from a project directory (picker if omitted)" },
        { kind: "system", text: "" },
        { kind: "system", text: "Other:" },
        { kind: "system", text: "  /clear           Clear transcript" },
        { kind: "system", text: "  /doctor          Check workspace health and fix issues" },
        { kind: "system", text: "  /theme (/colors) Print color-role samples" },
        { kind: "system", text: "  /quit (/exit)    Exit" },
        { kind: "system", text: "  //text           Send a literal prompt starting with '/'" },
        { kind: "system", text: "" },
            { kind: "system", text: "Shortcuts:" },
            { kind: "system", text: "  Shift+Tab        Cycle operation mode" },
            { kind: "system", text: "  Ctrl+T           Toggle thinking visibility" },
            { kind: "system", text: "  Ctrl+D           Toggle todo panel" },
            { kind: "system", text: "  Ctrl+E           Toggle tool details" },
            { kind: "system", text: "  PageUp/PageDown  Scroll transcript" },
            { kind: "system", text: "  Home             Jump to bottom" }
          ]);
    };

    const showAgents = () => {
      const provider = String(process.env.FF_PROVIDER || currentProfile?.provider || "unknown");
      const mainModel = String(process.env.FF_MODEL || currentProfile?.model || "").trim() || "(unset)";
      const subagentModel =
        String(process.env.FF_SUBAGENT_MODEL || (currentProfile as any)?.subagentModel || "").trim() || "(inherit main)";
      const oracleModel = String(process.env.FF_ORACLE_MODEL || "deepseek/deepseek-v3.2").trim();
      const hasOpenRouter = Boolean(String(process.env.OPENROUTER_API_KEY || "").trim());

      pushLines([
        { kind: "system", text: "Agents:" },
        { kind: "system", text: `- main: provider=${provider} model=${mainModel}` },
        { kind: "system", text: `- subagent: model=${subagentModel}` },
        { kind: "system", text: `- oracle: ${hasOpenRouter ? "enabled" : "missing OPENROUTER_API_KEY"} model=${oracleModel}` }
      ]);
    };

    const showMounts = () => {
      const cfg = readMountsConfig();
      pushLines([
        { kind: "system", text: "Mounts (read-only):" },
        { kind: "system", text: `- claude: ${cfg.mounts.claude ? "enabled" : "disabled"} (reads ~/.claude/skills + <repo>/.claude/skills)` },
        { kind: "system", text: `- factory: ${cfg.mounts.factory ? "enabled" : "disabled"} (reads ~/.factory/skills)` }
      ]);
    };

    if (key.ctrl && ch === "c") {
      const now = Date.now();
      const timeSinceLastCtrlC = now - ctrlCPressTime.current;

      if (timeSinceLastCtrlC < 1000) {
        // Second Ctrl+C within 1 second - exit program
        pushLines({ kind: "system", text: "Exiting..." });
        process.exit(0);
      } else {
        // First Ctrl+C - cancel turn or show exit hint
        if (processing && turnId && ws) {
          // Cancel the current turn
          ws.send(JSON.stringify({ type: "cancel_turn", turnId }));
          pushLines({ kind: "system", text: "Turn cancelled. Press Ctrl+C again to exit." });
        } else {
          // Not processing - show exit hint
          pushLines({ kind: "system", text: "Press Ctrl+C again to exit." });
        }
        ctrlCPressTime.current = now;
      }
      return;
    }

    if (key.ctrl && ch === "t") {
      setShowThinking(prev => {
        const next = !prev;
        const thinkingLines = lines.filter(l => l.kind === "thinking");
        pushLines({
          kind: "system",
          text: `Thinking ${next ? "shown" : "hidden"} (${thinkingLines.length} chunks)`
        });
        return next;
      });
      return;
    }

    if (key.ctrl && ch === "d") {
      setShowTodoPanel(prev => {
        const next = !prev;
        pushLines({
          kind: "system",
          text: `Todo panel ${next ? "shown" : "hidden"}`
        });
        return next;
      });
      return;
    }

    if (key.ctrl && ch === "e") {
      setShowToolDetails(prev => {
        const next = !prev;
        pushLines({
          kind: "system",
          text: `Tool details ${next ? "expanded" : "collapsed"}`
        });
        return next;
      });
      return;
    }

    if (key.ctrl && ch === "v") {
      // TTS toggle (only if TTS is enabled via flag)
      if (process.env.FF_TTS_ENABLED !== "true") {
        pushLines({
          kind: "system",
          text: "⚠️  TTS not enabled. Start with --tts flag to use voice output."
        });
        return;
      }

      setTtsEnabled(prev => {
        const next = !prev;
        pushLines({
          kind: "system",
          text: `🔊 Voice output ${next ? "enabled" : "disabled"} (${currentVoice})`
        });

        // Interrupt playback if disabling
        if (!next && playbackQueueRef.current) {
          playbackQueueRef.current.interrupt();
          setTtsSpeaking(false);
        }

        return next;
      });
      return;
    }

    if (key.return) {
      const currentInput = inputStore.current.value;
      let trimmed = currentInput.trim();
      if (trimmed.length) {
        // Check if waiting for doctor confirmation
        if (doctorWaitingForConfirm) {
          const response = trimmed.toLowerCase();
          if (response === "y" || response === "yes") {
            setDoctorWaitingForConfirm(false);
            setDoctorRunning(true);
            pushLines({ kind: "system", text: "Fixing workspace issues..." });
            setInputValue("");

            (async () => {
              try {
                const result = await validateWorkspace(workspaceDir);
                if (result.issues.length > 0) {
                  const plan = planMigration(workspaceDir, result.issues);
                  const migrationResult = await executeMigration(plan, { backup: true });

                  const resultLines: Line[] = [
                    { kind: "system", text: migrationResult.summary }
                  ];

                  if (migrationResult.failed.length > 0) {
                    resultLines.push({
                      kind: "error",
                      text: `Failed operations: ${migrationResult.failed.map((f) => f.error).join(", ")}`
                    });
                  } else {
                    resultLines.push({ kind: "system", text: "✓ All issues fixed successfully!" });
                  }

                  pushLines(resultLines);
                }
              } catch (err) {
                pushLines({
                  kind: "error",
                  text: `Fix error: ${err instanceof Error ? err.message : String(err)}`
                });
              } finally {
                setDoctorRunning(false);
              }
            })();
            return;
          } else if (response === "n" || response === "no") {
            setDoctorWaitingForConfirm(false);
            pushLines({ kind: "system", text: "Fix cancelled." });
            setInputValue("");
            return;
          } else {
            pushLines({ kind: "system", text: "Please answer 'y' or 'n'" });
            setInputValue("");
            return;
          }
        }

        // Allow users to send a literal prompt starting with "/" via "//...".
        if (trimmed.startsWith("//")) {
          trimmed = trimmed.slice(1);
        } else if (trimmed.startsWith("/")) {
          const [cmdRaw, ...argsRaw] = trimmed.slice(1).split(/\s+/).filter(Boolean);
          const command = String(cmdRaw || "")
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, "");
          const args = argsRaw.map((s) => String(s || "").trim()).filter(Boolean);
          const arg0 = String(args[0] || "")
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, "");

          if (!command || command === "help") {
            showHelp();
            setInputValue("");
            return;
          }

          if (command === "tools") {
            listToolsLocal();
            setInputValue("");
            return;
          }

          if (command === "agents") {
            setMode("agents");
            setAgentMenuMode("list");
            setAgentsIndex(0);
            setAgentsRefresh((n) => n + 1);
            setInputValue("");
            return;
          }

          if (command === "mounts") {
            showMounts();
            setInputValue("");
            return;
          }

          if (command === "clear") {
            clearTranscript();
            setInputValue("");
            return;
          }

          if (command === "commands") {
            setMode("commands");
            setCommandsIndex(0);
            setCommandsRefresh((n) => n + 1);
            pushLines({ kind: "system", text: "Commands: Esc to exit • ↑/↓ to select • Enter to view • n to create new" });
            setInputValue("");
            return;
          }

          if (command === "command") {
            // /command is just an alias to enter commands wizard
            setMode("commands");
            setCommandsIndex(0);
            setCommandsRefresh((n) => n + 1);
            pushLines({ kind: "system", text: "Commands: Esc to exit • ↑/↓ to select • Enter to view • n to create new" });
            setInputValue("");
            return;
          }

          if (command === "skills") {
            setMode("skills");
            setSkillMenuMode("list");
            setSkillFormStep(0);
            setSkillFormData({});
            setSkillSkippedFields(new Set());
            setSkillEditValue("");
            setInputValue("");
            return;
          }

          if (command === "quit" || command === "exit") {
            exit();
            return;
          }

          if (command === "wizard" || command === "wizards") {
            if (arg0 === "models") {
              setMode("models");
              setModelIndex(0);
              setModelEditingKey(null);
              setModelEditValue("");
              pushLines({
                kind: "system",
                text: `Model settings (profile: ${profileName}). Esc to exit, ↑/↓ to select, Enter to edit.`
              });
            } else if (arg0 === "mounts") {
              setMode("mounts");
              setMountsIndex(0);
              pushLines({ kind: "system", text: "Mounts: Esc to exit • ↑/↓ select • Space/Enter toggle • q quit" });
            } else if (arg0 === "init-project" || arg0 === "init_project" || arg0 === "project") {
              setMode("init_project");
              setProjectFilter("");
              setProjectIndex(0);
              setProjectRefresh((n) => n + 1);
              pushLines({ kind: "system", text: "Init Project: type to filter • ↑/↓ select • Enter load • Esc quit" });
            } else {
              openWizardMenu();
            }
            setInputValue("");
            return;
          }

          if (command === "models") {
            setMode("models");
            setModelIndex(0);
            setModelEditingKey(null);
            setModelEditValue("");
            pushLines({
              kind: "system",
              text: `Model settings (profile: ${profileName}). Esc to exit, ↑/↓ to select, Enter to edit.`
            });
            setInputValue("");
            return;
          }

          if (command === "init") {
            pushLines({ kind: "system", text: "Running init…" });
            sendTurn(
              [
                "Initialize this FF-Terminal session.",
                "1) Briefly summarize the repo context you can infer.",
                "2) List 3-7 recommended next commands or actions.",
                "3) If any required config is missing, ask for it.",
                "Keep it concise."
              ].join("\n"),
              { echoUser: false }
            );
            setInputValue("");
            return;
          }

          if (command === "init-project" || command === "init_project") {
            const rawPath = argsRaw.join(" ").trim();
            if (!rawPath) {
              setMode("init_project");
              setProjectFilter("");
              setProjectIndex(0);
              setProjectRefresh((n) => n + 1);
              pushLines({ kind: "system", text: "Init Project: type to filter • ↑/↓ select • Enter load • Esc quit" });
              setInputValue("");
              return;
            }
            const resolved = path.resolve(rawPath.replace(/^~(?=$|\/)/, process.env.HOME || ""));
            initProjectFromDir(resolved);
            setInputValue("");
            return;
          }

          if (command === "planning") {
            setOperationMode("planning");
            pushLines({ kind: "system", text: "Mode: planning" });
            setInputValue("");
            return;
          }

          if (command === "mode") {
            if (!arg0) {
              pushLines({ kind: "system", text: `Mode: ${operationMode}` });
              setInputValue("");
              return;
            }
            if ((OP_MODES as string[]).includes(arg0)) {
              setOperationMode(arg0 as OperationMode);
              pushLines({ kind: "system", text: `Mode: ${arg0}` });
              setInputValue("");
              return;
            }
            pushLines({ kind: "error", text: `Invalid mode: ${arg0} (use auto|confirm|read_only|planning)` });
            setInputValue("");
            return;
          }

          if (command === "theme" || command === "colors") {
            pushLines([
              { kind: "system", text: "Theme preview (semantic roles → Ink color tokens):" },
              { kind: "system", text: "system/meta (gray): connected (daemon 0.0.0)" },
              { kind: "user", text: "user (cyanBright+bold): hello from user input" },
              { kind: "assistant", text: "assistant (whiteBright+bold): hello from assistant response" },
              { kind: "thinking", text: "thinking (magenta): thinking: planning next step..." },
              { kind: "tool", text: "tool (yellow): ▶ example_tool" },
              { kind: "tool", text: "tool (yellow): ■ example_tool" },
              { kind: "error", text: "error (red): error: example failure message" },
              { kind: "system", text: "spinner (yellow): see footer for [|] while a turn is processing" }
            ]);
            setInputValue("");
            setProcessing(true);
            setTimeout(() => setProcessing(false), 1200);
            return;
          }

          if (command === "doctor") {
            if (doctorRunning) {
              pushLines({ kind: "system", text: "Doctor is already running..." });
              setInputValue("");
              return;
            }

            setDoctorRunning(true);
            pushLines({ kind: "system", text: "Scanning workspace health..." });

            (async () => {
              try {
                const result = await validateWorkspace(workspaceDir);
                const report = generateReport(result);
                pushLines({ kind: "system", text: report });

                if (result.issues.length > 0) {
                  pushLines({
                    kind: "system",
                    text: "Fix issues now? (y/n)"
                  });
                  setDoctorWaitingForConfirm(true);
                } else {
                  setDoctorWaitingForConfirm(false);
                }
              } catch (err) {
                pushLines({
                  kind: "error",
                  text: `Doctor error: ${err instanceof Error ? err.message : String(err)}`
                });
                setDoctorWaitingForConfirm(false);
              } finally {
                setDoctorRunning(false);
              }
            })();

            setInputValue("");
            return;
          }

          // Check for custom commands
          const customCommands = loadCommands(workspaceDir);
          const customCmd = getCommand(customCommands, command);

          if (customCmd) {
            // Parse command with arguments
            const { substituted } = parseCommand(customCmd.template, argsRaw);

            pushLines({ kind: "system", text: `Executing /${customCmd.slug}…` });
            sendTurn(substituted);
            setInputValue("");
            return;
          }

          pushLines({ kind: "error", text: `Unknown command: /${command} (type /help)` });
          setInputValue("");
          return;
        }

        sendTurn(trimmed);
      }
      return;
    }

    if (key.backspace || key.delete) {
      updateInputValue((v) => v.slice(0, -1));
      return;
    }

    if (ch) updateInputValue((v) => v + ch);
  });

  return (
    <Box flexDirection="column" gap={1}>
      <MainView
        displayMode={displayMode}
        stdoutWidth={stdoutWidth}
        connected={connected}
        daemonVersion={daemonVersion}
        mode={mode}
        wizardIndex={wizardIndex}
        mountRows={mountRows}
        mountsIndex={mountsIndex}
        workspaceDir={workspaceDir}
        projectFilter={projectFilter}
        projectRows={projectRows}
        projectIndex={projectIndex}
        modelIndex={modelIndex}
        modelEditingKey={modelEditingKey}
        modelEditValue={modelEditValue}
        currentProfile={currentProfile}
        profileName={profileName}
        commandRows={commandRows}
        commandsIndex={commandsIndex}
        agentRows={agentRows}
        agentsIndex={agentsIndex}
        agentTemplates={agentTemplates}
        agentMenuMode={agentMenuMode}
        agentCreationMethodIndex={agentCreationMethodIndex}
        agentTemplateIndex={agentTemplateIndex}
        agentFormStep={agentFormStep}
        agentFormData={agentFormData}
        agentEditValue={agentEditValue}
        skillMenuMode={skillMenuMode}
        skillFormStep={skillFormStep}
        skillFormData={skillFormData}
        skillSkippedFields={skillSkippedFields}
        skillEditValue={skillEditValue}
        commandMenuMode={commandMenuMode}
        commandFormStep={commandFormStep}
        commandFormData={commandFormData}
        commandSkippedFields={commandSkippedFields}
        commandEditValue={commandEditValue}
      />
      <TodoPanel
        sessionId={sessionId}
        workspaceDir={workspaceDir}
        visible={showTodoPanel}
      />
      <TodoSummary
        sessionId={sessionId}
        workspaceDir={workspaceDir}
        visible={mode === "chat" && !showTodoPanel}
      />
      <Transcript
        lines={lines}
        showThinking={showThinking}
        showToolDetails={showToolDetails}
        scrollOffset={scrollOffset}
        visibleCount={transcriptHeight}
      />
      {mode === "chat" ? (
        <ChatPrompt
          inputStore={inputStore.current}
          operationMode={operationMode}
          processing={processing}
          showThinking={showThinking}
          showTodoPanel={showTodoPanel}
          showToolDetails={showToolDetails}
          thinkingCount={lines.filter(l => l.kind === "thinking").length}
          ttsEnabled={ttsEnabled}
          currentVoice={currentVoice}
        />
      ) : null}
    </Box>
  );
}

export function startInkUi(params?: { port?: number }): void {
  render(<App port={params?.port ?? DEFAULT_PORT} />, { exitOnCtrlC: false });
}

const argv1 = process.argv[1] || "";
const isMain =
  argv1.endsWith("/app.tsx") ||
  argv1.endsWith("\\app.tsx") ||
  (argv1 ? import.meta.url === pathToFileURL(argv1).href : false);

if (isMain) startInkUi();
