import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { render, Box, Text, useApp, useInput, useStdout } from "ink";
import WebSocket from "ws";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { readConfig, writeConfig } from "../runtime/profiles/storage.js";
import type { Profile } from "../runtime/profiles/types.js";
import { loadToolSchemas } from "../runtime/tools/toolSchemas.js";
import { readMountsConfig, setMountEnabled } from "../runtime/config/mounts.js";
import { findRepoRoot } from "../runtime/config/repoRoot.js";
import { defaultWorkspaceDir } from "../runtime/config/paths.js";
import { loadCommands, listCommands, getCommand } from "../runtime/commands/loader.js";
import { loadAgentConfigs, listAgentConfigs, getAllTemplates } from "../runtime/agents/loader.js";
import { parseCommand } from "../runtime/commands/parser.js";
import type { Command } from "../runtime/commands/types.js";
import type { AgentConfig, AgentTemplate } from "../runtime/agents/types.js";

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

function parseWireChunk(chunk: string, displayMode: string = "clean"): Line | null {
  // Hide verbose metadata in clean mode
  if (displayMode === "clean") {
    if (chunk === "task_completed") return null;
    if (chunk === "Starting turn...") return null;
    if (chunk.startsWith("Provider:") && chunk.includes("Model:")) return null;
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
  return (
    <>
      <Text>› {value}</Text>
      <Box gap={1}>
        <Spinner active={props.processing} />
        <Text color="gray">
          Enter to send • Ctrl+C to cancel • Shift+Tab: mode={props.operationMode} • /help
        </Text>
      </Box>
    </>
  );
});

const Transcript = memo(function Transcript(props: { lines: LineEntry[] }) {
  return (
    <Box flexDirection="column">
      {props.lines.slice(-40).map((l, i) => (
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
  agentCreationMode: "none" | "template" | "manual" | "ai";
  agentTemplateIndex: number;
  agentFormStep: number;
  agentFormData: Partial<AgentConfig>;
  agentEditingField: string | null;
  agentEditValue: string;
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
    agentCreationMode,
    agentTemplateIndex,
    agentFormStep,
    agentFormData,
    agentEditingField,
    agentEditValue
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

  const commandsPanel = mode === "commands" ? (
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
          <Text color="yellow">No custom commands yet. Create your first command with /wizard commands → n</Text>
        )}
      </Box>
      {commandRows.length > 0 && (
        <Text dimColor>{commandRows[commandsIndex]?.template?.slice(0, 60)}...</Text>
      )}
    </Box>
  ) : null;

  const agentsPanel = mode === "agents" ? (() => {
    let helpText = "";
    let title = "Agents Manager";
    let content: React.ReactNode = null;

    if (agentCreationMode === "none") {
      helpText = "Esc: back • ↑/↓: select • Enter: view • t: template • n: custom (f=form, a=AI)";
      content = (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="cyanBright">Configured Agents:</Text>
          {agentRows.length ? (
            agentRows.slice(Math.max(0, agentsIndex - 8), agentsIndex + 12).map((agent, idx) => {
              const absoluteIndex = Math.max(0, agentsIndex - 8) + idx;
              const selected = absoluteIndex === agentsIndex;
              return (
                <Text key={agent.id} color={selected ? "cyan" : "white"} dimColor={!selected}>
                  {selected ? "› " : "  "}
                  {agent.name} {agent.description && `— ${agent.description}`}
                </Text>
              );
            })
          ) : (
            <Text dimColor>(none configured yet)</Text>
          )}
          <Box marginTop={1}>
            <Text bold color="cyanBright">Templates:</Text>
          </Box>
          {agentTemplates.slice(0, 3).map((template) => (
            <Text key={template.id} dimColor>
              • {template.name}
            </Text>
          ))}
        </Box>
      );
    } else if (agentCreationMode === "template") {
      title = "Template Selection";
      helpText = "Esc: back • ↑/↓: select template • Enter: use";
      content = (
        <Box flexDirection="column" marginTop={1}>
          {agentTemplates.map((template, idx) => {
            const selected = idx === agentTemplateIndex;
            return (
              <Box key={template.id} flexDirection="column">
                <Text color={selected ? "cyan" : "white"} dimColor={!selected}>
                  {selected ? "› " : "  "}
                  <Text bold>{template.name}</Text>
                </Text>
                {selected && <Text dimColor>  {template.description}</Text>}
              </Box>
            );
          })}
        </Box>
      );
    } else if (agentCreationMode === "manual") {
      title = `Agent Form (Step ${agentFormStep + 1}/5)`;
      helpText = "Enter value, then press Enter • Esc to cancel";
      content = (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Current input: {agentEditValue}</Text>
          {agentFormStep === 0 && <Text dimColor>Enter Agent ID (lowercase alphanumeric, 2-64 chars)</Text>}
          {agentFormStep === 1 && <Text dimColor>Enter Agent Name (display name)</Text>}
          {agentFormStep === 2 && <Text dimColor>Enter Description (one-line summary)</Text>}
          {agentFormStep === 3 && <Text dimColor>Enter Mode (auto/confirm/read_only/planning)</Text>}
          {agentFormStep === 4 && <Text dimColor>Enter System Prompt Addition (agent instructions)</Text>}
        </Box>
      );
    } else if (agentCreationMode === "ai") {
      title = "AI-Assisted Agent Creation";
      helpText = "Describe the agent you want (Enter to create, Esc to cancel)";
      content = (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Description:</Text>
          <Text>{agentEditValue}</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Text>{title}</Text>
        <Text dimColor>{helpText}</Text>
        {content}
      </Box>
    );
  })() : null;

  const skillsPanel = mode === "skills" ? (
    <Box flexDirection="column">
      <Text>Skills Manager</Text>
      <Text dimColor>Esc: back • n: create new skill using skill_draft</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text color="cyan">Skills use the existing skill_draft and skill_apply tools</Text>
        <Text dimColor>Press 'n' to launch the skill creation workflow</Text>
        <Text dimColor>Skills are stored in: ff-terminal-workspace/skills/</Text>
      </Box>
    </Box>
  ) : null;

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
  const [agentCreationMode, setAgentCreationMode] = useState<"none" | "template" | "manual" | "ai">("none");
  const [agentTemplateIndex, setAgentTemplateIndex] = useState(0);
  const [agentFormStep, setAgentFormStep] = useState(0);
  const [agentFormData, setAgentFormData] = useState<Partial<AgentConfig>>({});
  const [agentEditingField, setAgentEditingField] = useState<string | null>(null);
  const [agentEditValue, setAgentEditValue] = useState("");

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
    return String(process.env.FF_WORKSPACE_DIR || defaultWorkspaceDir(repoRoot)).trim() || defaultWorkspaceDir(repoRoot);
  }, []);

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
          // Hide verbose turn markers in clean mode
          if (displayMode !== "clean") {
            pushLines({ kind: "system", text: `--- turn ${msg.turnId} ---` }, { immediate: true });
          }
          return;
        }

        if (msg.type === "chunk") {
          const parsed = parseWireChunk(msg.chunk, displayMode);
          if (!parsed) return;
          if (parsed.kind === "assistant" || parsed.kind === "thinking") {
            const merged = appendToLastLine(parsed.kind, parsed.text);
            if (merged) return;
          }
          pushLines(parsed);
          return;
        }

        if (msg.type === "turn_finished") {
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
      setAgentCreationMode("none");
    },
    [pushLines, sendTurn]
  );

  useInput((ch, key) => {
    // Shift+Tab cycles operation mode (matches Python TUI).
    if (key.tab && key.shift) {
      cycleOperationMode();
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
    if (mode === "commands") {
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
        pushLines({
          kind: "system",
          text: "To create a new command, manually add a .md file to ff-terminal-workspace/commands/ with this format:\n\n---\ndescription: \"Command description\"\n---\n\nCommand prompt template with $1, $2 for args"
        });
        return;
      }
      return;
    }

    // Agents wizard mode - list/view agents
    if (mode === "agents" && agentCreationMode === "none") {
      if (key.escape) {
        setMode("chat");
        return;
      }
      if (key.upArrow) {
        setAgentsIndex((i) => (i - 1 + agentRows.length) % agentRows.length);
        return;
      }
      if (key.downArrow) {
        setAgentsIndex((i) => (i + 1) % agentRows.length);
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
      if (ch === "t") {
        // Start template selection mode
        setAgentCreationMode("template");
        setAgentTemplateIndex(0);
        pushLines({ kind: "system", text: "Template Selection: ↑/↓ select • Enter use • Esc back" });
        return;
      }
      if (ch === "n") {
        // Show menu for form or AI mode
        pushLines({
          kind: "system",
          text: "Create agent: Press 'f' for interactive form, 'a' for AI-assisted (describe what you want)"
        });
        return;
      }
      return;
    }

    // Agents template selection mode
    if (mode === "agents" && agentCreationMode === "template") {
      if (key.escape) {
        setAgentCreationMode("none");
        return;
      }
      if (key.upArrow) {
        setAgentTemplateIndex((i) => (i - 1 + agentTemplates.length) % agentTemplates.length);
        return;
      }
      if (key.downArrow) {
        setAgentTemplateIndex((i) => (i + 1) % agentTemplates.length);
        return;
      }
      if (key.return) {
        const template = agentTemplates[agentTemplateIndex];
        if (template) {
          // Initialize form data with template config
          setAgentFormData(template.config);
          setAgentFormStep(0);
          setAgentCreationMode("manual");
          pushLines({ kind: "system", text: `Using template: ${template.name}. Customize fields or press 's' to save.` });
        }
        return;
      }
      return;
    }

    // Agents AI mode - collect description
    if (mode === "agents" && agentCreationMode === "ai") {
      if (key.escape) {
        setAgentCreationMode("none");
        setAgentEditValue("");
        pushLines({ kind: "system", text: "Cancelled. Back to agent list." });
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
        setAgentCreationMode("none");
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

    // Check for 'f' or 'a' to start form/AI mode from agents list
    if (mode === "agents" && agentCreationMode === "none") {
      if (ch === "f") {
        // Start manual form mode
        setAgentCreationMode("manual");
        setAgentFormStep(0);
        setAgentFormData({
          id: "",
          name: "",
          description: "",
          mode: "auto",
          systemPromptAddition: "",
          allowedTools: undefined,
          deniedTools: undefined,
          maxTurns: undefined,
          tags: undefined
        });
        setAgentEditValue("");
        pushLines({ kind: "system", text: "Agent Form: Step 1/5 - Enter Agent ID (lowercase, 2-64 chars, a-z0-9_-)" });
        return;
      }
      if (ch === "a") {
        // Start AI mode
        setAgentCreationMode("ai");
        setAgentEditValue("");
        pushLines({ kind: "system", text: "Describe the agent you want to create (press Enter when done, Esc to cancel):" });
        return;
      }
    }

    // Agents manual form mode
    if (mode === "agents" && agentCreationMode === "manual") {
      if (key.escape) {
        setAgentCreationMode("none");
        setAgentFormStep(0);
        setAgentFormData({});
        setAgentEditValue("");
        pushLines({ kind: "system", text: "Cancelled form. Back to agent list." });
        return;
      }
      if (key.return) {
        const value = agentEditValue.trim();
        if (!value && agentFormStep < 4) {
          // Steps 0-4 are required
          pushLines({ kind: "system", text: "This field is required." });
          return;
        }

        // Validate and save form step
        let newFormData = { ...agentFormData };
        const opModes = ["auto", "confirm", "read_only", "planning"];

        switch (agentFormStep) {
          case 0: // agent_id
            if (!/^[a-z0-9_-]{2,64}$/.test(value)) {
              pushLines({ kind: "system", text: "Invalid agent ID. Must be 2-64 chars of a-z, 0-9, _, -" });
              return;
            }
            newFormData.id = value;
            setAgentFormStep(1);
            pushLines({ kind: "system", text: "Step 2/5 - Enter Agent Name (display name)" });
            break;
          case 1: // name
            newFormData.name = value;
            setAgentFormStep(2);
            pushLines({ kind: "system", text: "Step 3/5 - Enter Description (one-line summary)" });
            break;
          case 2: // description
            newFormData.description = value;
            setAgentFormStep(3);
            pushLines({
              kind: "system",
              text: "Step 4/5 - Choose Mode (auto/confirm/read_only/planning, default: auto)"
            });
            break;
          case 3: // mode
            const selectedMode = value.toLowerCase() as any;
            if (value && !opModes.includes(selectedMode)) {
              pushLines({ kind: "system", text: "Invalid mode. Choose: auto, confirm, read_only, or planning" });
              return;
            }
            newFormData.mode = selectedMode || "auto";
            setAgentFormStep(4);
            pushLines({ kind: "system", text: "Step 5/5 - Enter System Prompt Addition (instructions for the agent)" });
            break;
          case 4: // systemPromptAddition
            newFormData.systemPromptAddition = value;
            setAgentFormStep(5);
            // Save the agent config and create draft
            saveAgentFromForm(newFormData);
            setAgentCreationMode("none");
            return;
        }
        setAgentFormData(newFormData);
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

    // Skills wizard mode
    if (mode === "skills") {
      if (key.escape) {
        setMode("chat");
        return;
      }
      if (ch === "n") {
        const skillPrompt = `Create a new skill using the skill_draft tool. Provide:
- skill_slug: Unique identifier (lowercase, 2-64 chars, alphanumeric + hyphen/underscore)
- name: Display name for the skill
- summary: One-line description
- instructions: Detailed instructions for when this skill is activated
- Optional: triggers (list), tags (list), recommended_tools (list)

After creating the draft, I can apply it with skill_apply to make it active.`;

        pushLines({ kind: "system", text: "Creating new skill with skill_draft..." });
        sendTurn(skillPrompt, { echoUser: false });
        setMode("chat");
        return;
      }
      pushLines({ kind: "system", text: "Press 'n' to create a new skill, or Esc to go back" });
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
        { kind: "system", text: "  /theme (/colors) Print color-role samples" },
        { kind: "system", text: "  /quit (/exit)    Exit" },
        { kind: "system", text: "  //text           Send a literal prompt starting with '/'" },
        { kind: "system", text: "" },
        { kind: "system", text: "Shortcuts:" },
        { kind: "system", text: "  Shift+Tab        Cycle operation mode" }
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
      if (turnId && ws) ws.send(JSON.stringify({ type: "cancel_turn", turnId }));
      return;
    }

    if (key.return) {
      const currentInput = inputStore.current.value;
      let trimmed = currentInput.trim();
      if (trimmed.length) {
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
            setAgentsIndex(0);
            setAgentsRefresh((n) => n + 1);
            pushLines({ kind: "system", text: "Agents: Esc to exit • ↑/↓ to select • Enter to view • t to view templates • n to create new" });
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
            pushLines({ kind: "system", text: "Skills: Press 'n' to create a new skill • Esc to exit" });
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
        agentCreationMode={agentCreationMode}
        agentTemplateIndex={agentTemplateIndex}
        agentFormStep={agentFormStep}
        agentFormData={agentFormData}
        agentEditingField={agentEditingField}
        agentEditValue={agentEditValue}
      />
      <Transcript lines={lines} />
      {mode === "chat" ? (
        <ChatPrompt inputStore={inputStore.current} operationMode={operationMode} processing={processing} />
      ) : null}
    </Box>
  );
}

export function startInkUi(params?: { port?: number }): void {
  render(<App port={params?.port ?? DEFAULT_PORT} />);
}

const argv1 = process.argv[1] || "";
const isMain =
  argv1.endsWith("/app.tsx") ||
  argv1.endsWith("\\app.tsx") ||
  (argv1 ? import.meta.url === pathToFileURL(argv1).href : false);

if (isMain) startInkUi();
