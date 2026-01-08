import readline from "node:readline";
import path from "node:path";
import { ToolRegistry } from "../runtime/tools/registry.js";
import { registerAllTools } from "../runtime/registerDefaultTools.js";
import { runAgentTurn } from "../runtime/agentLoop.js";
import { withToolContext } from "../runtime/tools/context.js";
import { newId } from "../shared/ids.js";
import { loadSession } from "../runtime/session/sessionStore.js";
import type { ConversationMessage } from "../runtime/session/sessionStore.js";
import { clearToolPolicies } from "../runtime/hooks/builtin/skillAllowedToolsHook.js";

const PROTOCOL_VERSION = "0.1";
const MAX_HISTORY_MESSAGES = 200;
const MAX_HISTORY_CHARS = 20000;

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: any;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: any;
  error?: { code: number; message: string; data?: any };
};

type SessionState = {
  sessionId: string;
  controller: AbortController | null;
  toolQueue: Array<{ id: string; name: string }>;
};

function truncateConversation(conversation: ConversationMessage[]): {
  conversation: ConversationMessage[];
  truncated: boolean;
  total: number;
} {
  const total = conversation.length;
  if (total === 0) return { conversation: [], truncated: false, total };

  let chars = 0;
  let count = 0;
  let start = total - 1;

  for (let i = total - 1; i >= 0; i -= 1) {
    const msg = conversation[i];
    const len = typeof msg?.content === "string" ? msg.content.length : 0;
    if (count >= MAX_HISTORY_MESSAGES) break;
    if (count > 0 && chars + len > MAX_HISTORY_CHARS) break;
    chars += len;
    count += 1;
    start = i;
  }

  const slice = conversation.slice(start);
  return { conversation: slice, truncated: slice.length !== total, total };
}

function send(obj: JsonRpcResponse | { jsonrpc: "2.0"; method: string; params?: any }): void {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function errorResponse(id: JsonRpcId, code: number, message: string, data?: any): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

function okResponse(id: JsonRpcId, result: any): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function toTextContent(text: string): { type: "text"; text: string } {
  return { type: "text", text };
}

function promptToText(prompt: any): string {
  if (!prompt) return "";
  if (typeof prompt === "string") return prompt;
  if (Array.isArray(prompt)) {
    const parts: string[] = [];
    for (const block of prompt) {
      if (!block) continue;
      if (block.type === "text" && typeof block.text === "string") {
        parts.push(block.text);
        continue;
      }
      if (block.type === "resource") {
        const uri = block.resource?.uri || block.uri || "";
        const text = block.resource?.text || block.text || "";
        if (text) parts.push(`[Resource: ${uri || "embedded"}]\n${text}`);
        else if (uri) parts.push(`[Resource: ${uri}]`);
      }
      if (block.type === "resource_link") {
        const uri = block.uri || block.resource?.uri || "";
        if (uri) parts.push(`[Resource: ${uri}]`);
      }
    }
    return parts.join("\n\n").trim();
  }
  if (typeof prompt === "object" && Array.isArray(prompt.content)) {
    return promptToText(prompt.content);
  }
  return String(prompt || "");
}

function toolKind(toolName: string): string {
  const n = toolName.toLowerCase();
  if (n.startsWith("read") || n === "read_file") return "read";
  if (n.startsWith("write") || n.startsWith("edit") || n.endsWith("edit") || n.includes("apply")) return "edit";
  if (n.includes("delete") || n.includes("remove") || n.includes("cleanup")) return "delete";
  if (n.includes("move") || n.includes("rename")) return "move";
  if (n.includes("grep") || n.includes("search") || n.includes("glob")) return "search";
  if (n.includes("run") || n.includes("execute") || n.includes("command")) return "execute";
  if (n.includes("think")) return "think";
  if (n.includes("tavily") || n.includes("browse") || n.includes("fetch")) return "fetch";
  return "other";
}

export async function startAcpServer(params: { repoRoot: string; workspaceDir: string }): Promise<void> {
  const registry = new ToolRegistry();
  registerAllTools(registry, { workspaceDir: params.workspaceDir });

  const sessions = new Map<string, SessionState>();
  const sessionDir = path.join(params.workspaceDir, "sessions");

  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

  const sendUpdate = (sessionId: string, update: any): void => {
    send({ jsonrpc: "2.0", method: "session/update", params: { sessionId, update } });
  };

  const handleToolStart = (session: SessionState, toolName: string, title: string): void => {
    const toolCallId = newId("tool");
    session.toolQueue.push({ id: toolCallId, name: toolName });
    sendUpdate(session.sessionId, {
      sessionUpdate: "tool_call",
      toolCallId,
      title: title || toolName,
      kind: toolKind(toolName),
      status: "in_progress"
    });
  };

  const handleToolEnd = (session: SessionState, toolName: string, ok: boolean, preview: string): void => {
    const entry = session.toolQueue.shift();
    const toolCallId = entry?.id || newId("tool");
    sendUpdate(session.sessionId, {
      sessionUpdate: "tool_call_update",
      toolCallId,
      status: ok ? "completed" : "failed",
      title: toolName,
      ...(preview
        ? {
            content: [toTextContent(preview)]
          }
        : {})
    });
  };

  const handleStatusMessage = (session: SessionState, message: string): void => {
    if (message.startsWith("tool_start:")) {
      const rest = message.slice("tool_start:".length);
      const [toolName, ...ctxParts] = rest.split("|");
      const title = ctxParts.join("|").trim();
      handleToolStart(session, toolName.trim(), title);
      return;
    }
    if (message.startsWith("tool_end:")) {
      const rest = message.slice("tool_end:".length);
      const [toolName, _duration, status, ...previewParts] = rest.split("|");
      const preview = previewParts.join("|").trim();
      handleToolEnd(session, toolName.trim(), status === "ok", preview);
      return;
    }
    if (message.startsWith("update:")) {
      const text = message.slice("update:".length).trim();
      if (text) {
        sendUpdate(session.sessionId, { sessionUpdate: "agent_message_chunk", content: [toTextContent(text)] });
      }
      return;
    }
  };

  for await (const line of rl) {
    if (!line.trim()) continue;
    let msg: JsonRpcRequest | null = null;
    try {
      msg = JSON.parse(line);
    } catch {
      send(errorResponse(null, -32700, "Parse error"));
      continue;
    }

    if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
      send(errorResponse(msg?.id ?? null, -32600, "Invalid Request"));
      continue;
    }

    const { method, id } = msg;

    if (method === "initialize") {
      send(
        okResponse(id ?? null, {
          agentCapabilities: {
            loadSession: true,
            mcpCapabilities: { http: false, sse: false },
            promptCapabilities: { audio: false, image: false, embeddedContext: true },
            sessionCapabilities: {}
          },
          agentInfo: { name: "ff-terminal", version: PROTOCOL_VERSION },
          authMethods: []
        })
      );
      continue;
    }

    if (method === "session/new") {
      const sessionId = newId("session");
      sessions.set(sessionId, { sessionId, controller: null, toolQueue: [] });
      send(okResponse(id ?? null, { sessionId, modes: [] }));
      continue;
    }

    if (method === "session/load") {
      const sessionId = String(msg.params?.sessionId || "").trim();
      if (!sessionId) {
        send(errorResponse(id ?? null, -32602, "Missing sessionId"));
        continue;
      }
      const existing = loadSession(sessionId, sessionDir);
      if (!existing) {
        send(errorResponse(id ?? null, -32001, `Session not found: ${sessionId}`));
        continue;
      }
      if (!sessions.has(sessionId)) sessions.set(sessionId, { sessionId, controller: null, toolQueue: [] });
      const history = truncateConversation(existing.conversation || []);
      send(
        okResponse(id ?? null, {
          modes: [],
          conversation: history.conversation,
          history_truncated: history.truncated,
          history_total: history.total
        })
      );
      continue;
    }

    if (method === "session/cancel") {
      const sessionId = String(msg.params?.sessionId || "").trim();
      const session = sessions.get(sessionId);
      if (session?.controller) session.controller.abort();
      if (session) {
        session.controller = null;
        session.toolQueue = [];
      }
      clearToolPolicies(sessionId);
      send(okResponse(id ?? null, {}));
      continue;
    }

    if (method === "session/prompt") {
      const sessionId = String(msg.params?.sessionId || "").trim();
      if (!sessionId) {
        send(errorResponse(id ?? null, -32602, "Missing sessionId"));
        continue;
      }
      const prompt = msg.params?.prompt;
      const userInput = promptToText(prompt);
      if (!userInput) {
        send(errorResponse(id ?? null, -32602, "Missing prompt content"));
        continue;
      }

      let session = sessions.get(sessionId);
      if (!session) {
        session = { sessionId, controller: null, toolQueue: [] };
        sessions.set(sessionId, session);
      }

      if (session.controller && !session.controller.signal.aborted) {
        session.controller.abort();
        sendUpdate(sessionId, {
          sessionUpdate: "agent_message_chunk",
          content: [toTextContent("Previous run cancelled by new prompt.")]
        });
      }

      const controller = new AbortController();
      session.controller = controller;
      session.toolQueue = [];

      let stopReason = "end_turn";

      try {
        await withToolContext(
          { sessionId, workspaceDir: params.workspaceDir, repoRoot: params.repoRoot },
          async () => {
            for await (const chunk of runAgentTurn({
              userInput,
              registry,
              sessionId,
              repoRoot: params.repoRoot,
              signal: controller.signal
            })) {
              if (chunk.kind === "content") {
                sendUpdate(sessionId, { sessionUpdate: "agent_message_chunk", content: [toTextContent(chunk.delta)] });
              } else if (chunk.kind === "thinking") {
                sendUpdate(sessionId, { sessionUpdate: "agent_thought_chunk", content: [toTextContent(chunk.delta)] });
              } else if (chunk.kind === "error") {
                sendUpdate(sessionId, { sessionUpdate: "agent_message_chunk", content: [toTextContent(chunk.message)] });
              } else if (chunk.kind === "status") {
                handleStatusMessage(session, chunk.message);
              } else if (chunk.kind === "task_completed") {
                break;
              }
            }
          }
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendUpdate(sessionId, { sessionUpdate: "agent_message_chunk", content: [toTextContent(`Error: ${message}`)] });
        stopReason = controller.signal.aborted ? "cancelled" : "end_turn";
      } finally {
        if (controller.signal.aborted) stopReason = "cancelled";
        session.controller = null;
      }

      send(okResponse(id ?? null, { stopReason }));
      continue;
    }

    send(errorResponse(id ?? null, -32601, `Method not found: ${method}`));
  }
}
