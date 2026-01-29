import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { render, Box, Text, useApp, useInput, useStdout } from "ink";
import WebSocket from "ws";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { ChildProcess } from "node:child_process";
import { readConfig, writeConfig } from "../runtime/profiles/storage.js";
import type { Profile } from "../runtime/profiles/types.js";
import type { ExecutionPlan } from "../runtime/planning/types.js";
import { loadToolSchemas } from "../runtime/tools/toolSchemas.js";
import { readMountsConfig, setMountEnabled, addExtraDirs } from "../runtime/config/mounts.js";
import { findRepoRoot } from "../runtime/config/repoRoot.js";
import { resolveWorkspaceDir, defaultConfigPath } from "../runtime/config/paths.js";
import { resolveConfig } from "../runtime/config/loadConfig.js";
import { loadCommands, listCommands, getCommand } from "../runtime/commands/loader.js";
import { loadAgentConfigs, listAgentConfigs, getAllTemplates } from "../runtime/agents/loader.js";
import { parseCommand } from "../runtime/commands/parser.js";
import { listSkillStubs } from "../runtime/tools/implementations/skills.js";
import type { Command } from "../runtime/commands/types.js";
import type { AgentConfig, AgentTemplate } from "../runtime/agents/types.js";
import type { SkillStub } from "../runtime/tools/implementations/skills.js";
import {
  validateWorkspace,
  generateReport,
  formatDiscoveryReport,
  countUnintegratedResources,
  getUniqueSources,
  type DiscoveryResult
} from "../runtime/workspace/doctor.js";
import { planMigration, executeMigration } from "../runtime/workspace/migration.js";
import { isValidSessionId as isValidSessionIdFormat } from "../shared/ids.js";
import { resolveMainSessionId, resolveSessionMode } from "../runtime/session/sessionPolicy.js";
import { getTheme, getCurrentTheme, color, type ThemeName } from "./colorTheme.js";
import { startTtsService, stopTtsService, TextBuffer, synthesize, AudioPlaybackQueue } from "./tts/index.js";

type ServerMessage =
  | { type: "hello"; daemonVersion: string }
  | { type: "turn_started"; sessionId: string; turnId: string }
  | { type: "chunk"; turnId: string; seq: number; chunk: string }
  | { type: "turn_finished"; turnId: string; ok: boolean; error?: string }
  | { type: "tools"; tools: string[] }
  | { type: "sessions_list"; sessions: any[] }
  | { type: "session_patched"; ok: boolean; sessionId?: string; sessionKey?: string; overrides?: Record<string, string | null>; error?: string }
  | { type: "todo_update"; todos: Todo[] }
  | { type: "subagent_start"; agentId: string; task: string }
  | { type: "subagent_progress"; agentId: string; action: string; file?: string; toolCount: number; tokens: number }
  | { type: "subagent_complete"; agentId: string; status: "done" | "error"; error?: string };

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
  activeForm: string;
  status: "pending" | "in_progress" | "completed";
  priority: "high" | "medium" | "low";
  completedAt?: number;
};

type AutonomyLogInfo = {
  name: string;
  path: string;
  mtimeMs: number;
  size: number;
  lastEvent?: string;
  lastTs?: string;
  loopsRun?: number;
  promptFile?: string;
  tasksFile?: string;
  oracleMode?: string;
};

function parseWireChunk(chunk: string, displayMode: string = "clean"): Line | null | { type: "provider_info"; provider: string; model: string } {
  // Hide verbose metadata in clean mode
  if (displayMode === "clean") {
    if (chunk === "task_completed") return null;
    if (chunk === "Starting turn...") return null;
    if (chunk.startsWith("Provider:") && chunk.includes("Model:")) {
      // Extract provider and model instead of filtering
      const match = chunk.match(/^Provider:\s*(\S+)\s*\|\s*Model:\s*(.+)$/);
      if (match) {
        return { type: "provider_info", provider: match[1], model: match[2] };
      }
      return null;
    }
    if (chunk.startsWith("completion_validation:")) return null;
  }

  if (chunk === "task_completed") return { kind: "system", text: "task_completed" };
  if (chunk.startsWith("content:")) return { kind: "assistant", text: chunk.slice("content:".length) };
  if (chunk.startsWith("thinking:")) return { kind: "thinking", text: chunk.slice("thinking:".length) };
  if (chunk.startsWith("error:")) return { kind: "error", text: chunk.slice("error:".length) };
  if (chunk.startsWith("update:")) return { kind: "system", text: chunk.slice("update:".length).trim() };

  if (chunk.startsWith("tool_start:")) {
    const rest = chunk.slice("tool_start:".length);
    const [toolName, ...contextParts] = rest.split("|");
    const contextMsg = contextParts.join("|").trim();

    if (contextMsg) {
      // Clean mode: show contextual message with the tool context
      return { kind: "tool", text: contextMsg };
    } else {
      // Fallback: show traditional format
      return { kind: "tool", text: `>> ${toolName.trim()}` };
    }
  }

  if (chunk.startsWith("tool_end:")) {
    const rest = chunk.slice("tool_end:".length);
    const [toolName, duration, status, ...previewParts] = rest.split("|");
    const preview = previewParts.join("|").trim();

    if (duration && status) {
      // Clean mode: show result with status and duration
      const label = status === "ok" ? "OK" : "ERR";
      let text = `${label} `;

      if (preview && status === "ok") {
        // Smart previews are already concise, show them in full
        text += `${toolName.trim()}: ${preview}`;
      } else if (status === "error") {
        // Failed tool
        text += `${toolName.trim()} failed`;
        if (preview) text += `: ${preview.slice(0, 200)}`;
      } else {
        // No preview available, just show completion
        text += `${toolName.trim()} completed in ${duration}`;
      }

      return { kind: "tool", text };
    } else {
      // Fallback: show traditional format
      return { kind: "tool", text: `<< ${toolName.trim()}` };
    }
  }

  return { kind: "system", text: chunk };
}

function isProviderInfo(value: unknown): value is { type: "provider_info"; provider: string; model: string } {
  return typeof value === "object" && value !== null && "type" in value && (value as Record<string, unknown>).type === "provider_info";
}

function isLine(value: unknown): value is Line {
  return typeof value === "object" && value !== null && "kind" in value;
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

const Banner = memo(function Banner(props: { displayMode: string; width: number; themeName: ThemeName }) {
  const theme = getTheme(props.themeName);

  if (props.displayMode === "verbose") {
    if (props.width < 60) {
      return (
        <Box flexDirection="column">
          <Text color={theme.bannerSecondary} bold>
            FARM
          </Text>
          <Text color={theme.bannerSecondary} bold>
            FRIEND
          </Text>
          <Text color={theme.bannerPrimary} bold>
            TERMINAL v3.0
          </Text>
          <Text color={theme.system}>Ultra-Autonomous AI Terminal Interface</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        {FARMFRIEND_ASCII_ART.map((line, i) => {
          if (!line) return <Text key={i}> </Text>;
          // Approximate the Python aurora gradient (leafy green -> sky teal) with theme colors.
          const t = i / Math.max(1, FARMFRIEND_ASCII_ART.length - 1);
          const lineColor = t < 0.5 ? theme.bannerSecondary : theme.bannerPrimary;
          return (
            <Text key={i} color={lineColor} bold>
              {line}
            </Text>
          );
        })}
        <Text> </Text>
        <Text color={theme.system}>Ultra-Autonomous AI Terminal Interface</Text>
      </Box>
    );
  }

  // Clean mode (default): match Python clean display which prints the compact FF-Terminal box logo.
  if (props.displayMode === "clean") {
    if (props.width < 46) {
      return (
        <Box flexDirection="column">
          <Text color={theme.bannerPrimary} bold>
            FF-Terminal v3.0
          </Text>
          <Text color={theme.system}>Ultra-Autonomous AI Terminal</Text>
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
          <Text key={i} color={theme.bannerPrimary} bold>
            {line}
          </Text>
        ))}
      </Box>
    );
  }

  return null;
});

const Spinner = memo(function Spinner(props: { active: boolean; context?: string; themeName: ThemeName }) {
  const [i, setI] = useState(0);
  const theme = getTheme(props.themeName);
  // ASCII spinner to maximize compatibility across terminal fonts.
  const frames = useMemo(() => ["|", "/", "-", "\\"], []);

  useEffect(() => {
    if (!props.active) return;
    const t = setInterval(() => setI((n) => (n + 1) % frames.length), 90);
    return () => clearInterval(t);
  }, [props.active, frames.length]);

  if (!props.active) return null;
  return (
    <Text color={theme.spinner}>
      [{frames[i]}] {props.context || "Processing..."}
    </Text>
  );
});

const ChatPrompt = memo(function ChatPrompt(props: {
  inputStore: InputStore;
  operationMode: OperationMode;
  processing: boolean;
  showThinking: boolean;
  showToolDetails: boolean;
  thinkingCount: number;
  themeName: ThemeName;
  ttsEnabled?: boolean;
  currentVoice?: string;
}) {
  const theme = getTheme(props.themeName);

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
  const toolsText = props.showToolDetails ? "expanded" : "collapsed";
  const voiceStatus = process.env.FF_TTS_ENABLED === "true"
    ? (props.ttsEnabled ? `voice:on (${props.currentVoice || "af_heart"})` : "voice:off")
    : "";

  return (
    <>
      <Text>› {value}</Text>
      <Box gap={1}>
        <Spinner active={props.processing} themeName={props.themeName} />
        <Text color={theme.system}>
          Enter to send • Ctrl+C to cancel • Shift+Tab: mode={props.operationMode} • Ctrl+T: thinking {thinkingText} • Ctrl+E: tools {toolsText} • Ctrl+O: agents {voiceStatus && `• Ctrl+V: ${voiceStatus}`} • /help
        </Text>
      </Box>
    </>
  );
});

/**
 * InlineTodoStatus - Displays tasks inline with compact symbols
 * Appears directly after transcript in chat mode
 * No borders, no panels - just clean inline status
 * Features:
 * - Max 15 tasks visible (prioritized: in_progress > pending > completed)
 * - Within each status, sorts by priority (high > medium > low)
 * - Completed tasks auto-hide after 30 seconds
 * - Priority indicators shown as icons (! for high, nothing for medium/low)
 * - Shows activeForm (present continuous) for in_progress tasks
 */
const InlineTodoStatus = memo(function InlineTodoStatus(props: {
  todos: Todo[];
  themeName: ThemeName;
}) {
  const { todos } = props;
  const theme = getTheme(props.themeName);

  if (todos.length === 0) return null;

  const MAX_VISIBLE = 15;
  const COMPLETED_HIDE_DELAY_MS = 30000; // 30 seconds
  const now = Date.now();

  // Priority order for sorting (high = 0, medium = 1, low = 2)
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  // Prioritize display: in_progress > pending > completed
  // Within each status, sort by priority (high > medium > low)
  const inProgress = todos
    .filter(t => t.status === "in_progress")
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  const pending = todos
    .filter(t => t.status === "pending")
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Filter completed: hide if older than 30s
  const allCompleted = todos.filter(t => t.status === "completed");
  const completed = allCompleted
    .filter(t => {
      if (!t.completedAt) return true; // Show if no timestamp (shouldn't happen but be safe)
      return (now - t.completedAt) < COMPLETED_HIDE_DELAY_MS;
    })
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const hiddenCompletedCount = allCompleted.length - completed.length;

  // Take up to MAX_VISIBLE tasks
  const displayTodos = [
    ...inProgress,
    ...pending,
    ...completed
  ].slice(0, MAX_VISIBLE);

  if (displayTodos.length === 0) return null;

  const totalCount = todos.length;
  const completedCount = completed.length;
  const pendingCount = pending.length;
  const inProgressCount = inProgress.length;

  // Status colors
  const statusColors = {
    completed: theme.todoCompleted,
    in_progress: theme.todoInProgress,
    pending: theme.todoPending
  };

  // Priority colors (override status color for visibility)
  const priorityColors = {
    high: theme.todoHighPriority,
    medium: undefined, // Use status color
    low: theme.todoLowPriority
  };

  // Priority icon for high priority tasks
  const priorityIcon = (priority: "high" | "medium" | "low") =>
    priority === "high" ? "!" : "";

  // Build summary line based on what's visible
  let summaryText = `Tasks (${inProgressCount} active, ${pendingCount} pending`;
  if (completedCount > 0) {
    summaryText += `, ${completedCount} done`;
  }
  if (hiddenCompletedCount > 0) {
    summaryText += ` | ${hiddenCompletedCount} auto-hidden`;
  }
  summaryText += ")";

  return (
    <Box flexDirection="column" marginY={1}>
      <Text color={theme.todoSummary}>{summaryText}</Text>

      {displayTodos.map(t => {
        const symbol = t.status === "completed" ? "x" : t.status === "in_progress" ? ">" : "-";
        const statusColor = statusColors[t.status];
        const priColor = priorityColors[t.priority];
        const lineColor = priColor || statusColor;
        const priIcon = priorityIcon(t.priority);
        // Show activeForm when in_progress, content otherwise
        const displayText = t.status === "in_progress" ? t.activeForm : t.content;
        return (
          <Text key={t.id} color={lineColor}>
            {"  "}{symbol} {priIcon} {displayText}
            {t.priority === "high" ? " [HIGH]" : ""}
          </Text>
        );
      })}

      {displayTodos.length > MAX_VISIBLE ? (
        <Text color={theme.todoPending} dimColor>
          {"  "}... {displayTodos.length - MAX_VISIBLE} more tasks not shown
        </Text>
      ) : null}
    </Box>
  );
});

/**
 * SubagentSwarm - Displays running subagents with real-time progress
 * Shows agent IDs, tasks, tool counts, token usage, and current actions
 * Expandable/collapsible with Ctrl+O
 */
type SubagentState = {
  id: string;
  displayId: number;
  task: string;
  status: "running" | "done" | "error";
  currentAction?: string;
  currentFile?: string;
  toolCount: number;
  tokens: number;
  startedAt: number;
  updatedAt: number;
};

const SubagentSwarm = memo(function SubagentSwarm(props: {
  agents: SubagentState[];
  expanded: boolean;
  themeName: ThemeName;
}) {
  const { agents, expanded } = props;
  const theme = getTheme(props.themeName);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (agents.length === 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [agents.length]);

  if (agents.length === 0) return null;

  const orderedAgents = [...agents].sort((a, b) => a.displayId - b.displayId);
  const runningCount = agents.filter(a => a.status === "running").length;
  const doneCount = agents.filter(a => a.status === "done").length;
  const errorCount = agents.filter(a => a.status === "error").length;
  const totalTools = agents.reduce((sum, a) => sum + a.toolCount, 0);
  const totalTokens = agents.reduce((sum, a) => sum + a.tokens, 0);

  const formatAge = (ms: number): string => {
    const sec = Math.max(0, Math.floor(ms / 1000));
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${min}m${rem}s`;
  };

  return (
    <Box flexDirection="column" marginY={1}>
      <Text color={theme.subagentSummary}>
        Running {runningCount} agents
        {doneCount > 0 && <Text color={theme.subagentDone}> ({doneCount} complete)</Text>}
        {errorCount > 0 && <Text color={theme.subagentError}> ({errorCount} error)</Text>}
        <Text color={theme.subagentMeta}> | {totalTools} tools | {(totalTokens / 1000).toFixed(1)}k tokens</Text>
        <Text dimColor> (ctrl+o to {expanded ? "collapse" : "expand"})</Text>
      </Text>

      {expanded && orderedAgents.map((agent, idx) => {
        const prefix = idx === orderedAgents.length - 1 ? "`-" : "|-";
        const statusColor = agent.status === "done" ? theme.subagentDone : agent.status === "error" ? theme.subagentError : theme.subagentRunning;
        const statusLabel = agent.status === "done" ? "DONE" : agent.status === "error" ? "ERR" : "RUN";
        const age = formatAge(now - agent.updatedAt);
        const normalizedAction = agent.currentAction ? agent.currentAction.replace(/\s+/g, " ").trim() : "";
        const actionText = normalizedAction.length > 140
          ? `${normalizedAction.slice(0, 140)}...`
          : normalizedAction || undefined;

        return (
          <Box key={agent.id} flexDirection="column" marginLeft={1}>
            <Text>
              <Text color={theme.subagentMeta}>{prefix}</Text>
              <Text color={statusColor}> [{statusLabel}] Agent {agent.displayId}</Text>
              <Text>: {agent.task}</Text>
              <Text color={theme.subagentMeta}> | {agent.toolCount} tools | {(agent.tokens / 1000).toFixed(1)}k tokens | last {age}</Text>
            </Text>

            {actionText && agent.status !== "done" && (
              <Box marginLeft={3}>
                <Text color={theme.subagentMeta}>|- </Text>
                <Text color={theme.subagentAction}>{actionText}</Text>
                {agent.currentFile && <Text color={theme.subagentMeta}>: {agent.currentFile}</Text>}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
});

const TOOL_NAME_PATTERNS = [
  /^>>\s*([A-Za-z0-9_-]+)/,
  /^<<\s*([A-Za-z0-9_-]+)/,
  /^OK\s+([A-Za-z0-9_-]+)/,
  /^ERR\s+([A-Za-z0-9_-]+)/,
  /^Tool:\s*([A-Za-z0-9_-]+)/i
];

function extractToolName(text: string): string | null {
  for (const rx of TOOL_NAME_PATTERNS) {
    const match = text.match(rx);
    if (match && match[1]) return match[1];
  }
  return null;
}

// Cache for tool group summaries to avoid redundant string processing
// LRU cache with max size of 1000 entries to prevent memory leaks
const MAX_CACHE_SIZE = 1000;
const toolSummaryCache = new Map<string, string>();

function summarizeToolGroup(lines: LineEntry[]): string {
  // Create cache key from line IDs
  const cacheKey = lines.map(l => l.id).join(',');

  if (toolSummaryCache.has(cacheKey)) {
    // Move to end (most recently used) for LRU
    const value = toolSummaryCache.get(cacheKey)!;
    toolSummaryCache.delete(cacheKey);
    toolSummaryCache.set(cacheKey, value);
    return value;
  }

  const names = new Set<string>();
  let failureCount = 0;

  for (const line of lines) {
    const text = line.text.trim();
    const name = extractToolName(text);
    if (name) names.add(name);

    // Count failures (marked with "ERR" or containing "failed")
    if (text.startsWith("ERR") || text.toLowerCase().includes("failed")) {
      failureCount++;
    }
  }

  const unique = Array.from(names);
  let result: string;

  if (unique.length) {
    const shown = unique.slice(0, 3).join(", ");
    const more = unique.length > 3 ? ` +${unique.length - 3}` : "";
    const failedText = failureCount > 0 ? ` (${failureCount} failed)` : "";
    result = `Tool details collapsed · ${unique.length} ran${failedText} (${shown}${more}) · Ctrl+E to expand`;
  } else {
    result = `Tool details collapsed · ${lines.length} events · Ctrl+E to expand`;
  }

  // LRU eviction: if cache is full, delete oldest entry (first in Map)
  if (toolSummaryCache.size >= MAX_CACHE_SIZE) {
    const firstKey = toolSummaryCache.keys().next().value;
    if (firstKey !== undefined) {
      toolSummaryCache.delete(firstKey);
    }
  }

  toolSummaryCache.set(cacheKey, result);
  return result;
}

const Transcript = memo(function Transcript(props: {
  lines: LineEntry[];
  showThinking: boolean;
  showToolDetails: boolean;
  scrollOffset: number;
  visibleCount: number;
  themeName: ThemeName;
}) {
  const theme = getTheme(props.themeName);

  // OPTIMIZE 1: Memoize filtering
  const filteredLines = useMemo(() => {
    return props.showThinking
      ? props.lines
      : props.lines.filter(l => l.kind !== "thinking");
  }, [props.lines, props.showThinking]);

  // OPTIMIZE 2: Memoize rendered lines (tool grouping)
  const rendered = useMemo((): LineEntry[] => {
    const result: LineEntry[] = [];
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
          result.push(...group);
        } else {
          result.push({
            id: group[group.length - 1]?.id ?? line.id,
            kind: "tool",
            text: summarizeToolGroup(group)
          });
        }
        prevKind = "tool";
        continue;
      }

      if (line.kind === "assistant" && prevKind !== "assistant") {
        result.push({ id: line.id * 1000 + 1, kind: "system", text: "Assistant" } as LineEntry);
      }
      result.push(line);
      prevKind = line.kind;
      i += 1;
    }
    return result;
  }, [filteredLines, props.showToolDetails]);

  // OPTIMIZE 3: Memoize windowing calculations
  const windowingData = useMemo(() => {
    const visibleCount = Math.max(8, props.visibleCount);
    const maxOffset = Math.max(0, rendered.length - visibleCount);
    const offset = Math.min(Math.max(0, props.scrollOffset), maxOffset);
    const start = Math.max(0, rendered.length - visibleCount - offset);
    const windowed = rendered.slice(start, start + visibleCount);

    return { visibleCount, maxOffset, offset, start, windowed };
  }, [rendered, props.scrollOffset, props.visibleCount]);

  // OPTIMIZE 4: Memoize scroll indicator
  const scrollIndicator = useMemo(() => {
    if (windowingData.offset === 0) return null;
    const lineNumber = windowingData.start + 1;
    const totalLines = rendered.length;
    return `↑ Scrolled · Lines ${lineNumber}-${Math.min(windowingData.start + windowingData.visibleCount, totalLines)} of ${totalLines} · Press Home to jump to bottom`;
  }, [windowingData.offset, windowingData.start, windowingData.visibleCount, rendered.length]);

  // Helper to truncate long lines
  const truncateText = (text: string, maxLength = 2000): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "... (truncated)";
  };

  return (
    <Box flexDirection="column">
      {windowingData.windowed.map((l) => {
        const displayText = l.kind === "user" ? `› ${l.text}` : l.text;
        const shouldTruncate = l.kind === "tool" && !props.showToolDetails;
        const truncated = shouldTruncate ? truncateText(displayText) : displayText;

        return (
          <Text
            key={l.id}
            color={
              l.kind === "user"
                ? theme.user
                : l.kind === "assistant"
                  ? theme.assistant
                  : l.kind === "thinking"
                    ? theme.thinking
                    : l.kind === "tool"
                      ? theme.tool
                      : l.kind === "error"
                        ? theme.error
                        : theme.system
            }
            bold={l.kind === "user" || l.kind === "assistant"}
            dimColor={false}
          >
            {truncated}
          </Text>
        );
      })}
      {scrollIndicator && (
        <Text color={theme.system} dimColor>
          {scrollIndicator}
        </Text>
      )}
    </Box>
  );
});

const isValidSessionId = (sessionId: string): boolean => {
  if (!sessionId || sessionId.length === 0) return false;
  return /^[a-zA-Z0-9_-]+$/.test(sessionId);
};

// TodoPanel removed - replaced with inline task status

const PlanPanel = memo(function PlanPanel(props: {
  sessionId: string | null;
  workspaceDir: string;
  visible: boolean;
  themeName: ThemeName;
}) {
  const theme = getTheme(props.themeName);
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastModified, setLastModified] = useState<number>(0);

  useEffect(() => {
    if (!props.visible || !props.sessionId) return;
    if (!isValidSessionId(props.sessionId)) {
      setError("Invalid session ID format");
      return;
    }

    const planPath = path.join(
      props.workspaceDir,
      "sessions",
      "plans",
      `${props.sessionId}.json`
    );

    try {
      if (!fs.existsSync(planPath)) {
        setPlan(null);
        setError(null);
        return;
      }

      const content = fs.readFileSync(planPath, "utf8");
      const store = JSON.parse(content);
      const activePlan = store.plans.find((p: ExecutionPlan) => p.id === store.activePlanId);
      setPlan(activePlan || null);
      setError(null);

      const stat = fs.statSync(planPath);
      setLastModified(stat.mtimeMs);
    } catch (err) {
      setError(`Failed to load plan: ${(err as Error).message}`);
      setPlan(null);
    }
  }, [props.visible, props.sessionId, props.workspaceDir, lastModified]);

  useEffect(() => {
    if (!props.visible || !props.sessionId) return;
    if (!isValidSessionId(props.sessionId)) return;

    const planPath = path.join(
      props.workspaceDir,
      "sessions",
      "plans",
      `${props.sessionId}.json`
    );

    const interval = setInterval(() => {
      try {
        if (fs.existsSync(planPath)) {
          const stat = fs.statSync(planPath);
          if (stat.mtimeMs !== lastModified) {
            setLastModified(stat.mtimeMs);
          }
        }
      } catch {
        // Ignore refresh errors
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [props.visible, props.sessionId, props.workspaceDir, lastModified]);

  if (!props.visible) return null;

  if (error) {
    return (
      <Box flexDirection="column" borderStyle="single" borderColor="red">
        <Text color={theme.notificationError}>Plan Panel - Error</Text>
        <Text dimColor>{error}</Text>
      </Box>
    );
  }

  if (!plan) {
    return (
      <Box flexDirection="column" borderStyle="single" borderColor="gray">
        <Text color={theme.notificationWarning}>Plan Panel</Text>
        <Text color={theme.planProgress}>No active plan for this session.</Text>
      </Box>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return "x";
      case "in_progress": return ">";
      case "blocked": return "!";
      default: return " ";
    }
  };

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={theme.planObjective}>
      <Text color={theme.planObjective} bold>
        Plan: {plan.objective}
      </Text>
      <Text dimColor>
        Progress: {plan.completedSteps}/{plan.totalSteps} steps
      </Text>
      {plan.steps.map((step) => (
        <Box key={step.id} flexDirection="column" marginLeft={1}>
          <Text>
            {getStatusIcon(step.status)} Step {step.id}: {step.description}
          </Text>
          {step.status === "blocked" && step.lastError && (
            <Box marginLeft={2}>
              <Text color={theme.planBlocked}>
                {"->"} BLOCKED: {step.lastError.slice(0, 60)}
              </Text>
            </Box>
          )}
        </Box>
      ))}
      <Box marginTop={1}>
        <Text color={theme.planProgress}>
          Press Ctrl+P to hide • Auto-refreshes every 4s
        </Text>
      </Box>
    </Box>
  );
});

// TodoSummary removed - replaced with inline task status

type Mode = "chat" | "help" | "models" | "mounts" | "init_project" | "wizard" | "commands" | "agents" | "skills" | "logs";
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

type WizardId = "models" | "mounts" | "init_project" | "commands" | "agents" | "skills" | "logs";
type WizardRow = { id: WizardId; label: string; help: string };
const WIZARD_ROWS: WizardRow[] = [
  { id: "models", label: "Models", help: "Edit model overrides for this profile" },
  { id: "mounts", label: "Mounts", help: "Enable read-only mounts for external skills" },
  { id: "init_project", label: "Init Project", help: "Load FF_PROJECT.md / PROJECT.md from a project directory" },
  { id: "commands", label: "Commands", help: "Create and manage custom slash commands" },
  { id: "agents", label: "Agents", help: "Configure specialized agent personas" },
  { id: "skills", label: "Skills", help: "Create and manage reusable skills" },
  { id: "logs", label: "Autonomy Logs", help: "View autonomy loop run logs" }
];

type OperationMode = "auto" | "confirm" | "read_only" | "planning";
const OP_MODES: OperationMode[] = ["auto", "confirm", "read_only", "planning"];
const MAX_TRANSCRIPT_LINES = Number(process.env.FF_MAX_TRANSCRIPT_LINES) || 400;
const LINE_COMMIT_DELAY_STREAMING = 50;  // Faster during active streaming
const LINE_COMMIT_DELAY_IDLE = 120;      // Original delay for idle state

type ProjectStub = { dir: string; name: string; status: "ready" | "needs_setup" };
type HelpRow = { command: string; description: string };
type SkillRow = SkillStub & { displaySlug: string };

const HELP_ROWS: HelpRow[] = [
  { command: "/help", description: "Show this panel" },
  { command: "/tools", description: "List available tools" },
  { command: "/agents", description: "Open agent configuration wizard" },
  { command: "/mounts", description: "Show mounts status (read-only)" },
  { command: "/wizard", description: "Open wizard menu (models, mounts, init-project, commands, agents, skills)" },
  { command: "/wizard models", description: "Open models wizard" },
  { command: "/wizard mounts", description: "Open mounts wizard (read-only)" },
  { command: "/wizard init-project", description: "Open project initialization picker" },
  { command: "/wizard commands", description: "Open custom commands manager" },
  { command: "/wizard agents", description: "Open agent configuration wizard" },
  { command: "/wizard skills", description: "Open skills wizard (create reusable skills)" },
  { command: "/wizard logs", description: "Open autonomy logs view" },
  { command: "/models", description: "Shortcut for /wizard models" },
  { command: "/commands", description: "Open custom commands manager" },
  { command: "/command", description: "Alias for /commands" },
  { command: "/<custom> [args]", description: "Run a custom command by slug (e.g., /review $1)" },
  { command: "/skills", description: "Open skills wizard" },
  { command: "/logs", description: "Open autonomy logs view" },
  { command: "/mode [auto|confirm|read_only|planning]", description: "Set operation mode" },
  { command: "/planning", description: "Alias for /mode planning" },
  { command: "/init", description: "Run initialization analysis" },
  { command: "/init-project [path]", description: "Initialize from a project directory (picker if omitted)" },
  { command: "/session [info|reset|mode|list|model]", description: "Inspect or manage session (persistent main mode)" },
  { command: "/compact", description: "Summarize older history for the current session" },
  { command: "/status", description: "Show session + workspace status" },
  { command: "/system", description: "Show the assembled system prompt (debug)" },
  { command: "/clear", description: "Clear transcript" },
  { command: "/doctor", description: "Check workspace health and fix issues" },
  { command: "/theme (/colors)", description: "Print color-role samples" },
  { command: "/quit (/exit)", description: "Exit" },
  { command: "//text", description: "Send a literal prompt starting with '/'" }
];

const HELP_SHORTCUTS: HelpRow[] = [
  { command: "Shift+Tab", description: "Cycle operation mode" },
  { command: "Ctrl+T", description: "Toggle thinking visibility" },
  { command: "Ctrl+P", description: "Toggle plan panel" },
  { command: "Ctrl+E", description: "Toggle tool details" },
  { command: "Ctrl+O", description: "Toggle subagent swarm" },
  { command: "PageUp/PageDown", description: "Scroll transcript" },
  { command: "Home", description: "Jump to bottom" }
];

const formatBytes = (size: number): string => {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let value = size;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const readFileTail = (filePath: string, maxBytes = 20000): string => {
  try {
    const stat = fs.statSync(filePath);
    const size = stat.size;
    const start = Math.max(0, size - maxBytes);
    const length = size - start;
    const buffer = Buffer.alloc(length);
    const fd = fs.openSync(filePath, "r");
    try {
      fs.readSync(fd, buffer, 0, length, start);
    } finally {
      fs.closeSync(fd);
    }
    return buffer.toString("utf8");
  } catch {
    return "";
  }
};

const readLogTailLines = (filePath: string, maxLines = 12): string[] => {
  const tail = readFileTail(filePath, 20000);
  const lines = tail.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  return lines.slice(-maxLines);
};

const summarizeAutonomyLog = (filePath: string): Partial<AutonomyLogInfo> => {
  const tail = readFileTail(filePath, 20000);
  const lines = tail.split(/\r?\n/).filter(Boolean);
  let lastEvent: string | undefined;
  let lastTs: string | undefined;
  let loopsRun: number | undefined;
  let promptFile: string | undefined;
  let tasksFile: string | undefined;
  let oracleMode: string | undefined;

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry?.event) {
        lastEvent = String(entry.event);
        lastTs = entry.ts ? String(entry.ts) : lastTs;
      }
      if (entry?.event === "autonomy_loop_complete") {
        if (Number.isFinite(entry.loops_run)) loopsRun = entry.loops_run;
        if (entry.prompt_file) promptFile = String(entry.prompt_file);
        if (entry.tasks_file) tasksFile = String(entry.tasks_file);
      }
      if (entry?.event === "autonomy_loop_start" && !oracleMode && entry.oracle_mode) {
        oracleMode = String(entry.oracle_mode);
      }
    } catch {
      // ignore parse failures from partial tails
    }
  }

  return { lastEvent, lastTs, loopsRun, promptFile, tasksFile, oracleMode };
};

const listAutonomyLogs = (workspaceDir: string): AutonomyLogInfo[] => {
  const logsDir = path.join(workspaceDir, "logs", "autonomy");
  if (!fs.existsSync(logsDir)) return [];
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(logsDir).filter((f) => f.endsWith(".jsonl"));
  } catch {
    return [];
  }

  const rows: AutonomyLogInfo[] = [];
  for (const name of entries) {
    const filePath = path.join(logsDir, name);
    try {
      const stat = fs.statSync(filePath);
      const summary = summarizeAutonomyLog(filePath);
      rows.push({
        name,
        path: filePath,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        ...summary
      });
    } catch {
      // ignore stat errors
    }
  }
  rows.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return rows;
};

const wrapText = (text: string, width: number): string[] => {
  if (width <= 0) return [text];
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      if (word.length <= width) {
        current = word;
        continue;
      }
      let remaining = word;
      while (remaining.length > width) {
        lines.push(remaining.slice(0, width));
        remaining = remaining.slice(width);
      }
      current = remaining;
      continue;
    }
    if (current.length + 1 + word.length <= width) {
      current += ` ${word}`;
      continue;
    }
    lines.push(current);
    if (word.length <= width) {
      current = word;
      continue;
    }
    let remaining = word;
    while (remaining.length > width) {
      lines.push(remaining.slice(0, width));
      remaining = remaining.slice(width);
    }
    current = remaining;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
};

const buildHelpTable = (rows: HelpRow[], cmdWidth: number, descWidth: number): string[] => {
  const pad = (text: string, width: number) => text.padEnd(width);
  const border = `+${"-".repeat(cmdWidth + 2)}+${"-".repeat(descWidth + 2)}+`;
  const divider = `+${"=".repeat(cmdWidth + 2)}+${"=".repeat(descWidth + 2)}+`;
  const lines: string[] = [
    border,
    `| ${pad("Command", cmdWidth)} | ${pad("Description", descWidth)} |`,
    divider
  ];

  for (const row of rows) {
    const cmdLines = wrapText(row.command, cmdWidth);
    const descLines = wrapText(row.description, descWidth);
    const rowHeight = Math.max(cmdLines.length, descLines.length);
    for (let i = 0; i < rowHeight; i += 1) {
      const cmd = pad(cmdLines[i] || "", cmdWidth);
      const desc = pad(descLines[i] || "", descWidth);
      lines.push(`| ${cmd} | ${desc} |`);
    }
  }

  lines.push(border);
  return lines;
};

type MainViewProps = {
  displayMode: string;
  stdoutWidth: number;
  connected: boolean;
  daemonVersion: string | null;
  currentProvider: string | null;
  currentModel: string | null;
  sessionId: string | null;
  sessionMode: "main" | "last" | "new";
  mainSessionId: string;
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
  skillRows: SkillRow[];
  skillsIndex: number;
  logRows: AutonomyLogInfo[];
  logsIndex: number;
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
  commandMenuMode: "list" | "creation_method" | "form" | "preview" | "ai_description";
  commandCreationMethodIndex: number;
  commandFormStep: number;
  commandFormData: Record<string, any>;
  commandSkippedFields: Set<string>;
  commandEditValue: string;
  themeName: ThemeName;
};

const MainView = memo(function MainView(props: MainViewProps) {
  const theme = getTheme(props.themeName);
  const {
    displayMode,
    stdoutWidth,
    connected,
    daemonVersion,
    currentProvider,
    currentModel,
    sessionId,
    sessionMode,
    mainSessionId,
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
    skillRows,
    skillsIndex,
    logRows,
    logsIndex,
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
    commandCreationMethodIndex,
    commandFormStep,
    commandFormData,
    commandSkippedFields,
    commandEditValue
  } = props;

  const wizardPanel = mode === "wizard" ? (
    <Box flexDirection="column">
      <Text>
        Wizards for profile: <Text color={theme.notificationWarning}>{profileName}</Text>
      </Text>
      <Text dimColor>Esc: back • ↑/↓: select • Enter: open</Text>
      <Box flexDirection="column" marginTop={1}>
        {WIZARD_ROWS.map((row, idx) => {
          const selected = idx === wizardIndex;
          return (
            <Text key={row.id} color={selected ? theme.selected : theme.unselected} dimColor={!selected}>
              {selected ? "› " : "  "}
              {row.label}
            </Text>
          );
        })}
      </Box>
      <Text dimColor>{WIZARD_ROWS[wizardIndex]?.help}</Text>
    </Box>
  ) : null;

  const helpPanel = mode === "help" ? (() => {
    const maxWidth = Math.max(40, Math.min(stdoutWidth, 120));
    const cmdWidth = Math.max(18, Math.min(42, Math.floor((maxWidth - 7) * 0.42)));
    const descWidth = Math.max(20, maxWidth - cmdWidth - 7);
    const commandLines = buildHelpTable(HELP_ROWS, cmdWidth, descWidth);
    const shortcutLines = buildHelpTable(HELP_SHORTCUTS, cmdWidth, descWidth);

    return (
      <Box flexDirection="column">
        <Text>Help</Text>
        <Text dimColor>Esc: back</Text>
        <Box flexDirection="column" marginTop={1}>
          {commandLines.map((line, idx) => (
            <Text key={`help-cmd-${idx}`}>{line}</Text>
          ))}
        </Box>
        <Box flexDirection="column" marginTop={1}>
          <Text>Shortcuts</Text>
          {shortcutLines.map((line, idx) => (
            <Text key={`help-shortcut-${idx}`}>{line}</Text>
          ))}
        </Box>
      </Box>
    );
  })() : null;

  const mountsPanel = mode === "mounts" ? (
    <Box flexDirection="column">
      <Text>Mounts (read-only)</Text>
      <Text dimColor>Esc: back • ↑/↓: select • Space/Enter: toggle</Text>
      <Box flexDirection="column" marginTop={1}>
        {mountRows.map((row, idx) => {
          const selected = idx === mountsIndex;
          const mark = row.enabled ? "[x]" : "[ ]";
          return (
            <Text key={row.key} color={selected ? theme.selected : theme.unselected} dimColor={!selected}>
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
              const statusColor = p.status === "ready" ? theme.statusReady : theme.statusNeedsSetup;
              return (
                <Text key={p.dir} color={selected ? theme.selected : theme.unselected} dimColor={!selected}>
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
          <Text color={theme.notificationWarning}>No projects found under ff-terminal-workspace/projects/</Text>
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
        Models for profile: <Text color={theme.notificationWarning}>{profileName}</Text>
      </Text>
      <Text dimColor>Esc: back • ↑/↓: select • Enter: edit</Text>
      <Box flexDirection="column" marginTop={1}>
        {MODEL_ROWS.map((row, idx) => {
          const selected = idx === modelIndex && !modelEditingKey;
          const value = (currentProfile ? (currentProfile as any)[row.key] : "") as string;
          const display = value ? value : row.key === "subagentModel" ? "(inherit main)" : "(blank)";
          return (
            <Text key={row.key} color={selected ? theme.selected : theme.unselected} dimColor={!selected}>
              {selected ? "› " : "  "}
              {row.label}: {display}
            </Text>
          );
        })}
      </Box>
      {modelEditingKey ? (
        <Box flexDirection="column" marginTop={1}>
          <Text>
            Editing <Text color={theme.selected}>{modelEditingKey}</Text> — {MODEL_ROWS.find((r) => r.key === modelEditingKey)?.help || ""}
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

    // Creation method selection menu
    if (commandMenuMode === "creation_method") {
      const creationMethods = [
        { label: "Create from scratch", description: "Manual form entry" },
        { label: "AI-assisted creation", description: "Describe what you want" }
      ];

      return (
        <Box flexDirection="column">
          <Text>Create New Command</Text>
          <Text dimColor>↑/↓: select • Enter: choose • Esc: back</Text>
          <Box flexDirection="column" marginTop={1}>
            {creationMethods.map((method, idx) => {
              const selected = idx === commandCreationMethodIndex;
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

    // AI description input
    if (commandMenuMode === "ai_description") {
      return (
        <Box flexDirection="column">
          <Text>AI-Assisted Command Creation</Text>
          <Text dimColor>Describe what you want • Enter when done • Esc: cancel</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>Description:</Text>
            <Text>{commandEditValue || "(type here)"}</Text>
          </Box>
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
      const selectedSkill = skillRows[skillsIndex];
      return (
        <Box flexDirection="column">
          <Text>Skills Manager</Text>
          <Text dimColor>Esc: back • ↑/↓: select • Enter: view • n: create new</Text>
          <Box flexDirection="column" marginTop={1}>
            {skillRows.length ? (
              skillRows.slice(Math.max(0, skillsIndex - 8), skillsIndex + 12).map((skill, idx) => {
                const absoluteIndex = Math.max(0, skillsIndex - 8) + idx;
                const selected = absoluteIndex === skillsIndex;
                const summary = skill.summary || skill.description || skill.name || "";
                const source = skill.source || "workspace";
                return (
                  <Text key={`${skill.displaySlug}-${skill.source}-${absoluteIndex}`} color={selected ? theme.selected : theme.unselected} dimColor={!selected}>
                    {selected ? "› " : "  "}
                    /{skill.displaySlug}
                    {summary ? ` — ${summary}` : ""}
                    {source ? ` [${source}]` : ""}
                  </Text>
                );
              })
            ) : (
              <Text color="yellow">No skills found. Press 'n' to create one</Text>
            )}
          </Box>
          {selectedSkill ? (
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>Source: {selectedSkill.source} • Kind: {selectedSkill.kind}</Text>
              <Text dimColor>Path: {selectedSkill.path}</Text>
              <Text dimColor>Tags: {selectedSkill.tags?.join(", ") || "(none)"}</Text>
              <Text dimColor>Triggers: {selectedSkill.triggers?.join(", ") || "(none)"}</Text>
            </Box>
          ) : (
            <Box flexDirection="column" marginTop={1}>
              <Text dimColor>Skills are stored in: {path.join(workspaceDir, "skills")}</Text>
              <Text dimColor>Create reusable AI capabilities with custom instructions</Text>
            </Box>
          )}
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

  const logsPanel = mode === "logs" ? (() => {
    const selectedLog = logRows[logsIndex];
    return (
      <Box flexDirection="column">
        <Text>Autonomy Logs</Text>
        <Text dimColor>Esc: back • ↑/↓: select • r: refresh • t: tail</Text>
        <Box flexDirection="column" marginTop={1}>
          {logRows.length ? (
            logRows.slice(Math.max(0, logsIndex - 8), logsIndex + 12).map((log, idx) => {
              const absoluteIndex = Math.max(0, logsIndex - 8) + idx;
              const selected = absoluteIndex === logsIndex;
              const eventLabel = log.lastEvent ? ` — ${log.lastEvent}` : "";
              const loopsLabel = Number.isFinite(log.loopsRun) ? ` (loops ${log.loopsRun})` : "";
              return (
                <Text key={log.name} color={selected ? theme.selected : theme.unselected} dimColor={!selected}>
                  {selected ? "› " : "  "}
                  {log.name}
                  {eventLabel}
                  {loopsLabel}
                </Text>
              );
            })
          ) : (
            <Text color={theme.notificationWarning}>No autonomy logs found in logs/autonomy/</Text>
          )}
        </Box>
        {selectedLog ? (
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>File: {selectedLog.path}</Text>
            <Text dimColor>Size: {formatBytes(selectedLog.size)}</Text>
            <Text dimColor>Last event: {selectedLog.lastEvent || "(unknown)"} {selectedLog.lastTs ? `@ ${selectedLog.lastTs}` : ""}</Text>
            <Text dimColor>Loops: {Number.isFinite(selectedLog.loopsRun) ? selectedLog.loopsRun : "(n/a)"}</Text>
            <Text dimColor>Oracle: {selectedLog.oracleMode || "(n/a)"}</Text>
            <Text dimColor>Prompt: {selectedLog.promptFile || "(n/a)"}</Text>
            <Text dimColor>Tasks: {selectedLog.tasksFile || "(n/a)"}</Text>
          </Box>
        ) : null}
      </Box>
    );
  })() : null;

  const sessionDisplayId = sessionId || (sessionMode === "main" ? mainSessionId : null);
  const sessionModeLabel = sessionMode === "main" ? "persistent" : sessionMode;
  const sessionLine = `Session: ${sessionDisplayId || "pending"} (${sessionModeLabel})`;

  return (
    <>
      <Banner displayMode={displayMode} width={stdoutWidth} themeName={props.themeName} />
      <Text color={theme.system}>
        {connected ? (currentProvider && currentModel
          ? `${currentProvider}/${currentModel}`
          : "connected")
          : "connecting..."}
        {daemonVersion ? ` (daemon ${daemonVersion})` : ""}
      </Text>
      <Text color={theme.system}>{sessionLine}</Text>
      {wizardPanel}
      {helpPanel}
      {mountsPanel}
      {initProjectPanel}
      {modelsPanel}
      {commandsPanel}
      {agentsPanel}
      {skillsPanel}
      {logsPanel}
    </>
  );
});

function App(props: { port: number }) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const stdoutWidth = stdout?.columns ?? 80;
  const [connected, setConnected] = useState(false);
  const [daemonVersion, setDaemonVersion] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [currentTodos, setCurrentTodos] = useState<Todo[]>([]);
  const [runningSubagents, setRunningSubagents] = useState<Map<string, SubagentState>>(new Map());
  const [subagentsExpanded, setSubagentsExpanded] = useState(true);
  const subagentCounterRef = useRef(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turnId, setTurnId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lines, setLinesState] = useState<LineEntry[]>([]);
  const [mode, setMode] = useState<Mode>("chat");
  const linesRef = useRef<LineEntry[]>([]);
  const lineSeq = useRef(0);
  const linesCommitTimer = useRef<NodeJS.Timeout | null>(null);
  const ctrlCPressTime = useRef<number>(0);
  const lastManualScrollTime = useRef<number>(0);
  const lastStreamTime = useRef<number>(0);
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
  const [skillsRefresh, setSkillsRefresh] = useState(0);
  const [skillsIndex, setSkillsIndex] = useState(0);
  const [logsRefresh, setLogsRefresh] = useState(0);
  const [logsIndex, setLogsIndex] = useState(0);
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

  const [commandMenuMode, setCommandMenuMode] = useState<"list" | "creation_method" | "form" | "preview" | "ai_description">("list");
  const [commandCreationMethodIndex, setCommandCreationMethodIndex] = useState(0);
  const [commandFormStep, setCommandFormStep] = useState(0);
  const [commandFormData, setCommandFormData] = useState<Record<string, any>>({});
  const [commandSkippedFields, setCommandSkippedFields] = useState<Set<string>>(new Set());
  const [commandEditValue, setCommandEditValue] = useState("");

  const [showThinking, setShowThinking] = useState(true);
  const [showPlanPanel, setShowPlanPanel] = useState(false);
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
  const [doctorWaitingForIntegration, setDoctorWaitingForIntegration] = useState(false);
  const [doctorDiscoveries, setDoctorDiscoveries] = useState<DiscoveryResult | null>(null);

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

  const repoRoot = useMemo(() => findRepoRoot(), []);
  const runtimeCfg = useMemo(() => resolveConfig({ repoRoot }), [repoRoot]);
  const workspaceDir = useMemo(() => {
    const workspaceFromEnv = process.env.FF_WORKSPACE_DIR;
    return resolveWorkspaceDir((runtimeCfg as any).workspace_dir ?? workspaceFromEnv ?? undefined);
  }, [runtimeCfg]);
  const sessionMode = useMemo(() => resolveSessionMode(runtimeCfg), [runtimeCfg]);
  const mainSessionId = useMemo(() => resolveMainSessionId(runtimeCfg), [runtimeCfg]);
  const sessionIdOverride = useMemo(() => {
    const raw = String(process.env.FF_SESSION_ID || "").trim();
    return raw.length ? raw : null;
  }, []);

  // Load last active session on mount
  useEffect(() => {
    try {
      if (sessionIdOverride && isValidSessionIdFormat(sessionIdOverride)) {
        setSessionId(sessionIdOverride);
        return;
      }
      const lastSessionPath = path.join(workspaceDir, ".last-session-id");
      if (fs.existsSync(lastSessionPath)) {
        const id = fs.readFileSync(lastSessionPath, "utf8").trim();
        if (isValidSessionIdFormat(id)) {
          setSessionId(id);
        }
      }
    } catch {
      // Ignore errors - will get sessionId from daemon
    }
  }, [sessionIdOverride, workspaceDir]);

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

  const skillRows = useMemo(() => {
    // Force recompute when refresh is triggered
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    skillsRefresh;
    const stubs = listSkillStubs({ workspaceDir, repoRoot });
    const rows: SkillRow[] = stubs.map((skill) => {
      let displaySlug = String(skill.slug || "").trim();
      if (!displaySlug) {
        if (skill.kind === "markdown_commands") {
          displaySlug = path.basename(skill.path, path.extname(skill.path));
        } else {
          displaySlug = path.basename(path.dirname(skill.path));
        }
      }
      return { ...skill, displaySlug };
    });
    rows.sort((a, b) => {
      const sourceCmp = String(a.source).localeCompare(String(b.source));
      if (sourceCmp !== 0) return sourceCmp;
      return a.displaySlug.localeCompare(b.displaySlug);
    });
    return rows;
  }, [workspaceDir, repoRoot, skillsRefresh]);

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

  const logRows = useMemo(() => {
    // Force recompute when refresh is triggered
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    logsRefresh;
    return listAutonomyLogs(workspaceDir);
  }, [workspaceDir, logsRefresh]);

  useEffect(() => {
    if (logRows.length === 0 && logsIndex !== 0) {
      setLogsIndex(0);
      return;
    }
    if (logRows.length > 0 && logsIndex >= logRows.length) {
      setLogsIndex(logRows.length - 1);
    }
  }, [logRows.length, logsIndex]);

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

      // Use shorter delay during active streaming
      const now = Date.now();
      const timeSinceLastStream = now - lastStreamTime.current;
      const delay = timeSinceLastStream < 1000
        ? LINE_COMMIT_DELAY_STREAMING
        : LINE_COMMIT_DELAY_IDLE;

      lastStreamTime.current = now;
      linesCommitTimer.current = setTimeout(flush, delay);
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
      linesRef.current =
        MAX_TRANSCRIPT_LINES > 0 && merged.length > MAX_TRANSCRIPT_LINES
          ? merged.slice(-MAX_TRANSCRIPT_LINES)
          : merged;
      commitLines(opts?.immediate ?? false);
    },
    [commitLines]
  );

  useEffect(() => {
    try {
      const bootstrapPath = path.join(workspaceDir, "BOOTSTRAP.md");
      if (fs.existsSync(bootstrapPath)) {
        const content = fs.readFileSync(bootstrapPath, "utf8").trim();
        if (content) {
          pushLines({
            kind: "system",
            text: "Onboarding detected: BOOTSTRAP.md is present. Ask one question at a time and fill IDENTITY.md, USER.md, and SOUL.md."
          });
        }
      }
    } catch {
      // ignore
    }
  }, [pushLines, workspaceDir]);

  const pushWrappedSystemLines = useCallback(
    (rows: Array<{ label: string; value?: string | number | null }>) => {
      const maxWidth = Math.max(50, Math.min(stdoutWidth, 140));
      const out: Line[] = [];
      for (const row of rows) {
        const label = row.label.trim();
        const prefix = label ? `${label}: ` : "";
        const rawValue =
          row.value === undefined || row.value === null || String(row.value).length === 0
            ? "(none)"
            : String(row.value);
        const wrapWidth = Math.max(20, maxWidth - prefix.length);
        const logicalLines = rawValue.split(/\r?\n/);
        if (!logicalLines.length) {
          out.push({ kind: "system", text: prefix + rawValue });
          continue;
        }
        logicalLines.forEach((line, lineIndex) => {
          const chunks = wrapText(line, wrapWidth);
          if (!chunks.length) {
            const pad = lineIndex === 0 ? prefix : " ".repeat(prefix.length);
            out.push({ kind: "system", text: pad });
            return;
          }
          chunks.forEach((chunk, chunkIndex) => {
            const pad = lineIndex === 0 && chunkIndex === 0 ? prefix : " ".repeat(prefix.length);
            out.push({ kind: "system", text: pad + chunk });
          });
        });
      }
      if (out.length) pushLines(out);
    },
    [pushLines, stdoutWidth]
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

  // Effect 1: Clamp scroll offset to valid range
  useEffect(() => {
    const maxOffset = Math.max(0, lines.length - transcriptHeight);
    if (scrollOffset > maxOffset) {
      setScrollOffset(maxOffset);
    }
  }, [lines.length, scrollOffset, transcriptHeight]);

  // Effect 2: Auto-scroll logic (only runs when lines.length changes)
  useEffect(() => {
    // Only auto-scroll if user hasn't manually scrolled recently
    if (scrollOffset === 0) return; // Already at bottom

    const now = Date.now();
    const timeSinceManualScroll = now - lastManualScrollTime.current;

    if (timeSinceManualScroll > 3000) {
      setScrollOffset(0);
    }
  }, [lines.length]); // Only trigger on new content, not scrollOffset changes

  // Hide cursor during processing to reduce flashing
  useEffect(() => {
    if (processing && stdout) {
      stdout.write('\x1B[?25l'); // Hide cursor
      return () => {
        stdout.write('\x1B[?25h'); // Show cursor on cleanup
      };
    }
  }, [processing, stdout]);

  const displayMode = useMemo(() => String(process.env.FF_DISPLAY_MODE || "clean").trim().toLowerCase(), []);

  const themeName = useMemo(() => getCurrentTheme(), []);

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

  const showSessionInfo = useCallback(() => {
    const sessionCfg = (runtimeCfg as any).session || {};
    const sessionDisplayId = sessionId || (sessionMode === "main" ? mainSessionId : null);
    const sessionPath = sessionDisplayId
      ? path.join(workspaceDir, "sessions", `${sessionDisplayId}.json`)
      : null;
    let statsSummary = "";
    let overridesSummary = "";
    if (sessionPath && fs.existsSync(sessionPath)) {
      try {
        const raw = fs.readFileSync(sessionPath, "utf8");
        const parsed = JSON.parse(raw);
        const totalMessages = Number(parsed?.stats?.totalMessages ?? parsed?.conversation?.length ?? 0);
        const lastActiveAt = String(parsed?.stats?.lastActiveAt || parsed?.updated_at || "");
        statsSummary = `messages=${totalMessages}${lastActiveAt ? `, lastActive=${lastActiveAt}` : ""}`;
        const overrides = parsed?.meta?.overrides || {};
        const overrideParts = [];
        if (overrides.model) overrideParts.push(`model=${overrides.model}`);
        if (overrides.thinkingLevel) overrideParts.push(`thinking=${overrides.thinkingLevel}`);
        if (overrides.verboseLevel) overrideParts.push(`verbose=${overrides.verboseLevel}`);
        if (overrides.reasoningLevel) overrideParts.push(`reasoning=${overrides.reasoningLevel}`);
        if (overrideParts.length) overridesSummary = overrideParts.join(", ");
      } catch {
        // ignore
      }
    }
    pushLines([
      { kind: "system", text: `Session mode: ${sessionMode}` },
      { kind: "system", text: `Main session ID: ${mainSessionId}` },
      { kind: "system", text: `Current session: ${sessionDisplayId || "(pending)"}` },
      { kind: "system", text: `Idle minutes: ${Number(sessionCfg.idleMinutes ?? 0)}` },
      { kind: "system", text: `Auto-summarize: ${Boolean(sessionCfg.autoSummarize)}` },
      { kind: "system", text: `Max history tokens: ${Number(sessionCfg.maxHistoryTokens ?? 0) || "(default)"}` },
      ...(statsSummary ? [{ kind: "system" as const, text: `Session stats: ${statsSummary}` }] : []),
      ...(overridesSummary ? [{ kind: "system" as const, text: `Session overrides: ${overridesSummary}` }] : [])
    ]);
  }, [mainSessionId, pushLines, runtimeCfg, sessionId, sessionMode, workspaceDir]);

  const listSessionsLocal = useCallback(() => {
    const sessionsDir = path.join(workspaceDir, "sessions");
    if (!fs.existsSync(sessionsDir)) {
      pushLines({ kind: "system", text: "No sessions directory found." });
      return;
    }
    const entries = fs
      .readdirSync(sessionsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => ({
        id: entry.name.replace(/\.json$/, ""),
        path: path.join(sessionsDir, entry.name)
      }));
    if (!entries.length) {
      pushLines({ kind: "system", text: "No session files found." });
      return;
    }
    const rows = entries
      .map((entry) => {
        let updatedAt = "";
        let count = 0;
        try {
          const raw = fs.readFileSync(entry.path, "utf8");
          const parsed = JSON.parse(raw);
          updatedAt = String(parsed?.stats?.lastActiveAt || parsed?.updated_at || "");
          count = Number(parsed?.stats?.totalMessages ?? parsed?.conversation?.length ?? 0);
        } catch {
          // ignore
        }
        return { id: entry.id, updatedAt, count };
      })
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    pushLines([
      { kind: "system", text: `Sessions (${rows.length}):` },
      ...rows.map((r) => ({
        kind: "tool" as const,
        text: `- ${r.id}${r.count ? ` (${r.count} msgs)` : ""}${r.updatedAt ? ` • ${r.updatedAt}` : ""}`
      }))
    ]);
  }, [pushLines, workspaceDir]);

  const requestSessionsList = useCallback(() => {
    if (!ws || !connected) {
      listSessionsLocal();
      return;
    }
    ws.send(JSON.stringify({ type: "list_sessions", limit: 200 }));
    pushLines({ kind: "system", text: "Fetching sessions from daemon..." });
  }, [connected, listSessionsLocal, pushLines, ws]);

  const patchSessionOverrides = useCallback((overrides: Record<string, string | null>) => {
    if (!ws || !connected) {
      pushLines({ kind: "error", text: "Not connected to daemon. Start ff-terminal to update session overrides." });
      return;
    }
    const sessionDisplayId = sessionId || (sessionMode === "main" ? mainSessionId : null);
    ws.send(JSON.stringify({
      type: "patch_session",
      sessionId: sessionDisplayId || undefined,
      sessionKey: sessionDisplayId ? undefined : (sessionMode === "main" ? "main" : undefined),
      overrides
    }));
  }, [connected, mainSessionId, pushLines, sessionId, sessionMode, ws]);

  const updateSessionMode = useCallback((nextMode: string) => {
    const normalized = nextMode.trim().toLowerCase();
    if (!["main", "last", "new"].includes(normalized)) {
      pushLines({ kind: "error", text: "Session mode must be: main, last, or new" });
      return;
    }
    const configPath = (process.env.FF_CONFIG_PATH || "").trim() || defaultConfigPath();
    let rawConfig: Record<string, any> = {};
    try {
      if (fs.existsSync(configPath)) {
        rawConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      }
    } catch {
      rawConfig = {};
    }
    rawConfig.session_mode = normalized;
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(rawConfig, null, 2) + "\n", "utf8");
    pushLines([
      { kind: "system", text: `Session mode updated to "${normalized}" in ${configPath}` },
      { kind: "system", text: "Restart the daemon to apply the new mode." }
    ]);
  }, [pushLines]);

  const sendTurn = async (prompt: string, opts?: { echoUser?: boolean }) => {
    // Interrupt TTS playback when user sends new message
    if (playbackQueueRef.current) {
      playbackQueueRef.current.interrupt();
    }
    if (textBufferRef.current) {
      await textBufferRef.current.flush();
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
    if (created.length) pushLines({ kind: "system", text: `Created: ${created.join(", ")}` });

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
      { kind: "system", text: `Loaded ${contextFiles.length} project context files (${totalChars.toLocaleString()} chars)` },
      { kind: "system", text: `Project: ${projectName} at ${abs}` }
    ]);
    sendTurn(initPrompt, { echoUser: false });
  };

  useEffect(() => {
    let stopped = false;
    let retryTimer: NodeJS.Timeout | null = null;
    let socket: WebSocket | null = null;
    let retryCount = 0;

    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(`ws://127.0.0.1:${props.port}`);
      setWs(socket);

      socket.on("open", () => {
        setConnected(true);
        retryCount = 0; // Reset retry count on successful connection
        socket?.send(JSON.stringify({ type: "hello", client: "ink", version: "0.0.0" }));
      });

      socket.on("close", () => {
        setConnected(false);
        setTurnId(null);
        setProcessing(false);
        if (stopped) return;

        // Exponential backoff: 750ms, 1.5s, 3s, 6s, max 10s
        const delay = Math.min(750 * Math.pow(2, retryCount), 10000);
        retryCount++;

        pushLines({ kind: "system", text: `Connection lost. Reconnecting in ${Math.round(delay / 1000)}s...` });
        retryTimer = setTimeout(connect, delay);
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

        if (msg.type === "sessions_list") {
          const rows = Array.isArray(msg.sessions) ? msg.sessions : [];
          if (!rows.length) {
            pushLines({ kind: "system", text: "No sessions found." });
            return;
          }
          pushLines([
            { kind: "system", text: `Sessions (${rows.length}):` },
            ...rows.map((r: any) => ({
              kind: "tool" as const,
              text: `- ${r.sessionId}${r.sessionKey ? ` [${r.sessionKey}]` : ""}${r.totalMessages ? ` (${r.totalMessages} msgs)` : ""}${r.updatedAt ? ` • ${r.updatedAt}` : ""}`
            }))
          ]);
          return;
        }

        if (msg.type === "session_patched") {
          if (msg.ok) {
            const overrideSummary = msg.overrides
              ? Object.entries(msg.overrides)
                  .filter(([, v]) => v)
                  .map(([k, v]) => `${k}=${v}`)
                  .join(", ")
              : "";
            pushLines({
              kind: "system",
              text: `Session updated${msg.sessionId ? ` (${msg.sessionId})` : ""}${overrideSummary ? `: ${overrideSummary}` : ""}`
            });
          } else {
            pushLines({ kind: "error", text: `Session update failed: ${msg.error || "unknown error"}` });
          }
          return;
        }

        if (msg.type === "turn_started") {
          setSessionId(msg.sessionId);
          setTurnId(msg.turnId);
          setProcessing(true);
          // Clear any buffered early chunks from previous turn
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
          // Handle provider/model info
          if (isProviderInfo(parsed)) {
            setCurrentProvider(parsed.provider);
            setCurrentModel(parsed.model);
            return;
          }
          // Handle Line type with explicit type guard
          if (!isLine(parsed)) return;
          const line = parsed;
          // TTS integration: add content to text buffer for speech synthesis
          if (
            ttsEnabled &&
            ttsServiceReadyRef.current &&
            line.kind === "assistant" &&
            textBufferRef.current
          ) {
            textBufferRef.current.add(line.text);
          } else if (
            ttsEnabled &&
            line.kind === "assistant" &&
            (!ttsServiceReadyRef.current || !textBufferRef.current)
          ) {
            // TTS enabled but not ready yet - buffer early chunks
            earlyTtsChunksRef.current.push(line.text);
          }

          if (line.kind === "assistant" || line.kind === "thinking") {
            const merged = appendToLastLine(line.kind, line.text);
            if (merged) return;
          }
          pushLines(line);
          return;
        }

        if (msg.type === "turn_finished") {
          // Flush TTS buffer on turn completion
          if (ttsEnabled && ttsServiceReadyRef.current && textBufferRef.current) {
            // Fire-and-forget - don't await in sync callback
            textBufferRef.current.flush().catch(err => {
              console.error('[TTS] Flush error:', err);
            });
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

        if (msg.type === "todo_update") {
          setCurrentTodos(msg.todos);
          return;
        }

        if (msg.type === "subagent_start") {
          setRunningSubagents(prev => {
            const updated = new Map(prev);
            const now = Date.now();
            updated.set(msg.agentId, {
              id: msg.agentId,
              displayId: subagentCounterRef.current++,
              task: msg.task,
              status: "running",
              currentAction: "Starting...",
              toolCount: 0,
              tokens: 0,
              startedAt: now,
              updatedAt: now
            });
            return updated;
          });
          return;
        }

        if (msg.type === "subagent_progress") {
          setRunningSubagents(prev => {
            const updated = new Map(prev);
            const agent = updated.get(msg.agentId);
            if (agent) {
              updated.set(msg.agentId, {
                ...agent,
                currentAction: msg.action,
                currentFile: msg.file,
                toolCount: msg.toolCount,
                tokens: msg.tokens,
                updatedAt: Date.now()
              });
            }
            return updated;
          });
          return;
        }

        if (msg.type === "subagent_complete") {
          setRunningSubagents(prev => {
            const updated = new Map(prev);
            const agent = updated.get(msg.agentId);
            if (agent) {
              updated.set(msg.agentId, {
                ...agent,
                status: msg.status,
                currentAction: msg.status === "done" ? "Done" : msg.error || "Error",
                updatedAt: Date.now()
              });
            }
            return updated;
          });
          // Keep completed agents visible for a short period, then remove
          setTimeout(() => {
            setRunningSubagents(prev => {
              const updated = new Map(prev);
              updated.delete(msg.agentId);
              return updated;
            });
          }, 20000);
          return;
        }
      });

      socket.on("error", (err) => {
        const errorMsg = (err as any)?.message ?? String(err);
        pushLines({ kind: "error", text: `WebSocket error: ${errorMsg}` });

        // Trigger reconnect on error
        setConnected(false);
        if (stopped) return;

        const delay = Math.min(750 * Math.pow(2, retryCount), 10000);
        retryCount++;

        pushLines({ kind: "system", text: `Reconnecting in ${Math.round(delay / 1000)}s...` });
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(connect, delay);
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
    if (!ttsEnabled) return;

    (async () => {
      try {
        const { process: ttsProc, ready, alreadyRunning } = await startTtsService();
        ttsProcessRef.current = ttsProc;
        ttsServiceReadyRef.current = ready;

        if (!ready) {
          pushLines({
            kind: "system",
            text: "⚠️  TTS service unavailable. Voice output disabled."
          });
          setTtsEnabled(false);
          return;
        }

        playbackQueueRef.current = new AudioPlaybackQueue();

        textBufferRef.current = new TextBuffer({
          onSentence: async (text: string) => {
            try {
              const audio = await synthesize(text, { voice: currentVoice });
              playbackQueueRef.current?.enqueue(audio);
              setTtsSpeaking(true);
            } catch (err) {
              console.error('[TTS] Synthesis failed:', err);
            }
          },
          isPlaying: () => playbackQueueRef.current?.isPlaying() ?? false
        });

        // Process any early chunks that arrived before TTS was ready
        const earlyChunks = earlyTtsChunksRef.current;
        if (earlyChunks.length > 0) {
          const combined = earlyChunks.join('');
          textBufferRef.current.add(combined);
          earlyTtsChunksRef.current = [];
        }
      } catch (err) {
        console.error('[TTS] Failed to initialize TTS:', err);
        pushLines({
          kind: "error",
          text: `TTS initialization failed: ${err instanceof Error ? err.message : String(err)}`
        });
        setTtsEnabled(false);
      }
    })();

    // Cleanup
    return () => {
      playbackQueueRef.current?.interrupt();
      // Fire-and-forget flush in cleanup
      if (textBufferRef.current) {
        textBufferRef.current.flush().catch(console.error);
      }
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
      lastManualScrollTime.current = Date.now();
      setScrollOffset((v) => Math.max(0, v - 5));
      return;
    }
    if (key.pageDown) {
      lastManualScrollTime.current = Date.now();
      setScrollOffset((v) => v + 5);
      return;
    }
    if ((key as any).home) {
      lastManualScrollTime.current = Date.now();
      setScrollOffset(0);
      return;
    }

    if (mode === "help") {
      if (key.escape) {
        setMode("chat");
      }
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
          setSkillsIndex(0);
          setSkillsRefresh((n) => n + 1);
          pushLines({ kind: "system", text: "Skills: Esc back • n create new skill using skill_draft" });
          return;
        }
        if (w === "logs") {
          setMode("logs");
          setLogsIndex(0);
          setLogsRefresh((n) => n + 1);
          pushLines({ kind: "system", text: "Autonomy Logs: Esc back • ↑/↓ select • r refresh • t tail" });
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
          pushWrappedSystemLines([
            { label: "Command", value: `/${cmd.slug}` },
            { label: "Description", value: cmd.description || "(no description)" },
            { label: "Template", value: cmd.template }
          ]);
        }
        return;
      }
      if (ch === "n") {
        setCommandMenuMode("creation_method");
        setCommandCreationMethodIndex(0);
        setCommandFormStep(0);
        setCommandFormData({});
        setCommandSkippedFields(new Set());
        setCommandEditValue("");
        return;
      }
      return;
    }

    // Commands wizard - creation method selection
    if (mode === "commands" && commandMenuMode === "creation_method") {
      if (key.escape) {
        setCommandMenuMode("list");
        return;
      }
      if (key.upArrow) {
        setCommandCreationMethodIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (key.downArrow) {
        setCommandCreationMethodIndex((i) => Math.min(1, i + 1));
        return;
      }
      if (key.return) {
        if (commandCreationMethodIndex === 0) {
          // Create from scratch
          setCommandMenuMode("form");
          setCommandFormStep(0);
          setCommandFormData({});
          setCommandSkippedFields(new Set());
          setCommandEditValue("");
        } else if (commandCreationMethodIndex === 1) {
          // AI-assisted
          setCommandMenuMode("ai_description");
          setCommandEditValue("");
        }
        return;
      }
      return;
    }

    // Commands wizard - AI description input
    if (mode === "commands" && commandMenuMode === "ai_description") {
      if (key.escape) {
        setCommandMenuMode("creation_method");
        setCommandEditValue("");
        return;
      }
      if (key.return) {
        const description = commandEditValue.trim();
        if (!description) {
          pushLines({ kind: "system", text: "Description cannot be empty." });
          return;
        }
        const aiPrompt = `Create a custom slash command using command_draft tool based on this description:

"${description}"

IMPORTANT: This creates a SLASH COMMAND (like /review or /cleanup), NOT a tool. The template should be MARKDOWN INSTRUCTIONS that tell the agent what to do when the user types the slash command.

Generate appropriate values for:
- command_slug: unique kebab-case identifier (e.g., "review-code", "cleanup-workspace")
- description: one-line description shown in /help
- template: MARKDOWN INSTRUCTIONS that will guide the agent (see example below)
- tags: array of relevant tags for categorization

EXAMPLE TEMPLATE FORMAT (markdown with clear sections and instructions):
\`\`\`markdown
# [Task Name]

You are helping the user with [describe what this command does].

## 🎯 OBJECTIVE
[Clear statement of what this command accomplishes]

## 📋 INSTRUCTIONS

1. **[First Step Name]**
   - [Detailed instruction]
   - [What to check or verify]

2. **[Second Step Name]**
   - [Detailed instruction]
   - [Expected outcome]

3. **[Third Step Name]**
   - [Detailed instruction]
   - [Best practices]

${description.includes('$1') || description.includes('argument') || description.includes('focus') ? '\n## 🔍 FOCUS AREA\n$1 (user provided argument)\n' : ''}
## ✅ SUCCESS CRITERIA
- [What defines successful completion]
- [Quality standards to meet]

---
Be thorough, accurate, and helpful.
\`\`\`

The template should be natural language instructions/prompts, NOT JSON or tool specs.

Call command_draft with these parameters. Show me the preview but DO NOT call command_apply yet. Wait for my confirmation.`;

        pushLines({ kind: "system", text: "Creating command from description..." });
        sendTurn(aiPrompt, { echoUser: false });
        setMode("chat");
        setCommandMenuMode("list");
        setCommandFormStep(0);
        setCommandFormData({});
        setCommandSkippedFields(new Set());
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
      return;
    }

    // Commands wizard - form entry
    if (mode === "commands" && commandMenuMode === "form") {
      const requiredFields = ["command_slug", "description", "template"];
      const requiredSteps = [0, 1, 2];
      const fieldKeys = ["command_slug", "description", "template", "tags"];

      if (key.escape) {
        setCommandMenuMode("creation_method");
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
          pushWrappedSystemLines([
            { label: "Agent", value: agent.name || "(unnamed)" },
            { label: "Description", value: agent.description || "(no description)" },
            { label: "Mode", value: agent.mode || "auto" },
            { label: "Max turns", value: agent.maxTurns ?? "∞" }
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
      if (key.upArrow) {
        if (skillRows.length) {
          setSkillsIndex((i) => (i - 1 + skillRows.length) % skillRows.length);
        }
        return;
      }
      if (key.downArrow) {
        if (skillRows.length) {
          setSkillsIndex((i) => (i + 1) % skillRows.length);
        }
        return;
      }
      if (key.return) {
        const skill = skillRows[skillsIndex];
        if (skill) {
          pushWrappedSystemLines([
            { label: "Skill", value: `/${skill.displaySlug}` },
            { label: "Name", value: skill.name || "(none)" },
            { label: "Summary", value: skill.summary || skill.description || "(none)" },
            { label: "Source", value: `${skill.source} (${skill.kind})` },
            { label: "Path", value: skill.path },
            { label: "Tags", value: skill.tags?.join(", ") || "(none)" },
            { label: "Triggers", value: skill.triggers?.join(", ") || "(none)" }
          ]);
        }
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

    if (mode === "logs") {
      if (key.escape) {
        setMode("chat");
        return;
      }
      if (key.upArrow) {
        if (logRows.length) {
          setLogsIndex((i) => Math.max(0, i - 1));
        }
        return;
      }
      if (key.downArrow) {
        if (logRows.length) {
          setLogsIndex((i) => Math.min(logRows.length - 1, i + 1));
        }
        return;
      }
      if (ch === "r") {
        setLogsRefresh((n) => n + 1);
        return;
      }
      if (ch === "t") {
        const log = logRows[logsIndex];
        if (log) {
          const tailLines = readLogTailLines(log.path, 10);
          pushLines([
            { kind: "system", text: `Log tail: ${log.name}` },
            ...tailLines.map((line): Line => ({ kind: "system", text: line }))
          ]);
        }
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
      setMode("help");
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

      if (timeSinceLastCtrlC < 5000) {
        // Second Ctrl+C within 5 seconds - exit program
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

    // Ctrl+D handler removed - inline todos now

    if (key.ctrl && ch === "p") {
      setShowPlanPanel(prev => {
        const next = !prev;
        pushLines({
          kind: "system",
          text: `Plan panel ${next ? "shown" : "hidden"}`
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

    if (key.ctrl && ch === "o") {
      setSubagentsExpanded(prev => {
        const next = !prev;
        const count = runningSubagents.size;
        if (count > 0) {
          pushLines({
            kind: "system",
            text: `Subagent swarm ${next ? "expanded" : "collapsed"} (${count} agents)`
          });
        }
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
        // Check if waiting for doctor integration confirmation
        if (doctorWaitingForIntegration && doctorDiscoveries) {
          const response = trimmed.toLowerCase();
          if (response === "y" || response === "yes") {
            setDoctorWaitingForIntegration(false);
            pushLines({ kind: "system", text: "Integrating external resources..." });

            const sources = getUniqueSources(doctorDiscoveries);

            // Add skill directories
            if (sources.skillDirs.length > 0) {
              addExtraDirs("skills", sources.skillDirs);
              for (const dir of sources.skillDirs) {
                pushLines({ kind: "system", text: `  Added skills: ${dir}` });
              }
            }

            // Add command directories
            if (sources.commandDirs.length > 0) {
              addExtraDirs("commands", sources.commandDirs);
              for (const dir of sources.commandDirs) {
                pushLines({ kind: "system", text: `  Added commands: ${dir}` });
              }
            }

            // Add agent directories
            if (sources.agentDirs.length > 0) {
              addExtraDirs("agents", sources.agentDirs);
              for (const dir of sources.agentDirs) {
                pushLines({ kind: "system", text: `  Added agents: ${dir}` });
              }
            }

            pushLines({ kind: "system", text: "Integration complete. Resources will be available on next load." });
            setDoctorDiscoveries(null);
            setInputValue("");
            return;
          } else if (response === "n" || response === "no") {
            setDoctorWaitingForIntegration(false);
            setDoctorDiscoveries(null);
            pushLines({ kind: "system", text: "Integration skipped." });
            setInputValue("");
            return;
          } else {
            pushLines({ kind: "system", text: "Please answer 'y' or 'n'" });
            setInputValue("");
            return;
          }
        }

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
                    resultLines.push({ kind: "system", text: "All issues fixed successfully." });
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
            setSkillsIndex(0);
            setSkillsRefresh((n) => n + 1);
            setInputValue("");
            return;
          }

          if (command === "logs") {
            setMode("logs");
            setLogsIndex(0);
            setLogsRefresh((n) => n + 1);
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
            } else if (arg0 === "logs") {
              setMode("logs");
              setLogsIndex(0);
              setLogsRefresh((n) => n + 1);
              pushLines({ kind: "system", text: "Autonomy Logs: Esc back • ↑/↓ select • r refresh • t tail" });
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

          if (command === "status") {
            showSessionInfo();
            if (!connected) {
              pushLines({ kind: "system", text: "Daemon not connected. Start ff-terminal to query live sessions." });
            }
            setInputValue("");
            return;
          }

          if (command === "system") {
            if (!connected) {
              pushLines({ kind: "error", text: "Daemon not connected. Start ff-terminal to fetch the system prompt." });
              setInputValue("");
              return;
            }
            sendTurn("/system", { echoUser: false });
            setInputValue("");
            return;
          }

          if (command === "compact") {
            pushLines({ kind: "system", text: "Compacting session…" });
            sendTurn(
              [
                "Use the reset_session tool now.",
                "action: summarize",
                sessionId ? `sessionId: ${sessionId}` : ""
              ].filter(Boolean).join("\n"),
              { echoUser: false }
            );
            setInputValue("");
            return;
          }

          if (command === "session") {
            if (!arg0 || arg0 === "info") {
              showSessionInfo();
              setInputValue("");
              return;
            }
            if (arg0 === "list") {
              requestSessionsList();
              setInputValue("");
              return;
            }
            if (arg0 === "mode") {
              const nextMode = String(args[1] || "").trim();
              if (!nextMode) {
                pushLines({ kind: "system", text: `Session mode: ${sessionMode}` });
                setInputValue("");
                return;
              }
              updateSessionMode(nextMode);
              setInputValue("");
              return;
            }
            if (arg0 === "model") {
              const nextModel = String(args[1] || "").trim();
              if (!nextModel) {
                showSessionInfo();
                setInputValue("");
                return;
              }
              if (["clear", "unset", "default"].includes(nextModel.toLowerCase())) {
                patchSessionOverrides({ model: null });
                pushLines({ kind: "system", text: "Cleared session model override." });
                setInputValue("");
                return;
              }
              patchSessionOverrides({ model: nextModel });
              pushLines({ kind: "system", text: `Session model override set to "${nextModel}".` });
              setInputValue("");
              return;
            }
            if (arg0 === "reset") {
              const action = String(args[1] || "archive").trim().toLowerCase();
              if (!["archive", "clear", "summarize"].includes(action)) {
                pushLines({ kind: "error", text: "Reset action must be: archive, clear, summarize" });
                setInputValue("");
                return;
              }
              pushLines({ kind: "system", text: `Resetting session (${action})…` });
              sendTurn(
                [
                  "Use the reset_session tool now.",
                  `action: ${action}`,
                  sessionId ? `sessionId: ${sessionId}` : ""
                ].filter(Boolean).join("\n"),
                { echoUser: false }
              );
              setInputValue("");
              return;
            }
            pushLines({ kind: "error", text: "Usage: /session [info|list|mode <main|last|new>|model <name|clear>|reset <archive|clear|summarize>]" });
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
            const theme = getTheme();
            pushLines([
              { kind: "system", text: `Current theme: ${themeName.toUpperCase()}` },
              { kind: "system", text: "Set theme with FF_THEME environment (default|highContrast|muted)" },
              { kind: "system", text: "" },
              { kind: "system", text: "Theme preview (semantic roles -> Ink color tokens):" },
              { kind: "system", text: "system/meta (gray): connected (daemon 0.0.0)" },
              { kind: "user", text: "user (cyanBright+bold): hello from user input" },
              { kind: "assistant", text: "assistant (whiteBright+bold): hello from assistant response" },
              { kind: "thinking", text: "thinking (magenta): thinking: planning next step..." },
              { kind: "tool", text: "tool (yellow): >> example_tool" },
              { kind: "tool", text: "tool (yellow): << example_tool" },
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
                const result = await validateWorkspace(workspaceDir, repoRoot || undefined);
                const report = generateReport(result);
                pushLines({ kind: "system", text: report });

                // Show discovery results
                if (result.discoveries) {
                  const discoveryReport = formatDiscoveryReport(result.discoveries);
                  pushLines({ kind: "system", text: discoveryReport });

                  // Count unintegrated external resources
                  const counts = countUnintegratedResources(result.discoveries);
                  if (counts.unique > 0) {
                    const dupeNote = counts.total > counts.unique
                      ? ` (${counts.total - counts.unique} duplicates will be skipped)`
                      : "";
                    const breakdown = [
                      counts.skills > 0 ? `${counts.skills} skills` : "",
                      counts.commands > 0 ? `${counts.commands} commands` : "",
                      counts.agents > 0 ? `${counts.agents} agents` : ""
                    ].filter(Boolean).join(", ");
                    pushLines({
                      kind: "system",
                      text: `\nIntegrate ${counts.unique} unique resources (${breakdown})${dupeNote}? (y/n)`
                    });
                    setDoctorDiscoveries(result.discoveries);
                    setDoctorWaitingForIntegration(true);
                    return;
                  }
                }

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
                setDoctorWaitingForIntegration(false);
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

  const isChatMode = mode === "chat";
  const transcriptVisibleCount = useMemo(() => {
    if (isChatMode) return transcriptHeight;
    const reduced = Math.floor(transcriptHeight / 4);
    return Math.max(4, Math.min(10, reduced));
  }, [isChatMode, transcriptHeight]);

  return (
    <Box flexDirection="column" gap={1}>
      <MainView
        displayMode={displayMode}
        stdoutWidth={stdoutWidth}
        connected={connected}
        daemonVersion={daemonVersion}
        currentProvider={currentProvider}
        currentModel={currentModel}
        sessionId={sessionId}
        sessionMode={sessionMode}
        mainSessionId={mainSessionId}
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
        skillRows={skillRows}
        skillsIndex={skillsIndex}
        logRows={logRows}
        logsIndex={logsIndex}
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
        commandCreationMethodIndex={commandCreationMethodIndex}
        commandFormStep={commandFormStep}
        commandFormData={commandFormData}
        commandSkippedFields={commandSkippedFields}
        commandEditValue={commandEditValue}
        themeName={themeName}
      />
      {isChatMode ? (
        <PlanPanel
          sessionId={sessionId}
          workspaceDir={workspaceDir}
          visible={showPlanPanel}
          themeName={themeName}
        />
      ) : null}
      <Transcript
        lines={lines}
        showThinking={showThinking}
        showToolDetails={showToolDetails}
        scrollOffset={scrollOffset}
        visibleCount={transcriptVisibleCount}
        themeName={themeName}
      />
      {isChatMode && currentTodos.length > 0 ? (
        <InlineTodoStatus todos={currentTodos} themeName={themeName} />
      ) : null}
      {isChatMode && runningSubagents.size > 0 ? (
        <SubagentSwarm
          agents={Array.from(runningSubagents.values())}
          expanded={subagentsExpanded}
          themeName={themeName}
        />
      ) : null}
      {isChatMode ? (
        <ChatPrompt
          inputStore={inputStore.current}
          operationMode={operationMode}
          processing={processing}
          showThinking={showThinking}
          showToolDetails={showToolDetails}
          thinkingCount={lines.filter(l => l.kind === "thinking").length}
          themeName={themeName}
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
