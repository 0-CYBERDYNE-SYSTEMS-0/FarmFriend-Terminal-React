import http from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { resolveConfig, type RuntimeConfig } from "../runtime/config/loadConfig.js";
import { resolveWorkspaceDir } from "../runtime/config/paths.js";
import { findRepoRoot } from "../runtime/config/repoRoot.js";
import { ensureCanonicalStructure } from "../runtime/workspace/migration.js";
import { resolveSessionMode, resolveMainSessionId } from "../runtime/session/sessionPolicy.js";
import { resolveGatewayAuthConfig, resolveGatewayBind, resolveGatewayPort, resolveGatewayTailscaleMode } from "./config.js";
import { resolveGatewayAuth } from "./auth.js";
import { createGatewayMethods } from "./server-methods/index.js";
import { validateRequestFrame } from "./protocol/index.js";
import { rawDataToString, safeJsonParse } from "./utils.js";
import { GatewayBridgeManager } from "./bridgeManager.js";
import { WhatsAppBridge } from "./bridges/whatsappBridge.js";
import { IMessageBridge } from "./bridges/imessageBridge.js";
import { TelegramBridge } from "./bridges/telegramBridge.js";
import { drainAnnounceback } from "../runtime/announceback/queue.js";
import type { GatewayMethodResult, GatewayServerContext } from "./server-shared.js";
import type { RequestFrame, ResponseFrame, EventFrame } from "./protocol/index.js";
import { createBridgeSubscriptionManager } from "./bridgeSubscriptions.js";

export type GatewayServerOptions = {
  repoRoot?: string;
  workspaceDir?: string;
  port?: number;
  bind?: string;
};

const DEFAULT_TICK_INTERVAL_MS = 30_000;

function send(ws: WebSocket, msg: ResponseFrame | EventFrame): void {
  ws.send(JSON.stringify(msg));
}

function errorResult(code: string, message: string, details?: unknown): GatewayMethodResult {
  return { ok: false, error: { code, message, details } };
}

export async function runGatewayServer(opts: GatewayServerOptions = {}): Promise<void> {
  const repoRoot = opts.repoRoot ?? findRepoRoot();
  const runtimeCfg = resolveConfig({ repoRoot });
  const workspaceDir = opts.workspaceDir ?? resolveWorkspaceDir(
    (runtimeCfg as any).workspace_dir ?? process.env.FF_WORKSPACE_DIR ?? undefined,
    { repoRoot }
  );
  ensureCanonicalStructure(workspaceDir);

  const port = opts.port ?? resolveGatewayPort(runtimeCfg);
  const bind = opts.bind ?? resolveGatewayBind(runtimeCfg);

  const bridgeManager = new GatewayBridgeManager({ workspaceDir });
  const registry = await import("../runtime/tools/registry.js").then((m) => new m.ToolRegistry());
  const { registerAllTools } = await import("../runtime/registerDefaultTools.js");
  registerAllTools(registry, { workspaceDir });

  const buildBridges = (cfg: RuntimeConfig) => {
    const sessionMode = resolveSessionMode(cfg);
    const mainSessionId = resolveMainSessionId(cfg);
    return [
      new WhatsAppBridge({
        config: (cfg as any).whatsapp,
        registry,
        workspaceDir,
        repoRoot,
        sessionMode,
        mainSessionId
      }),
      new IMessageBridge({
        config: (cfg as any).imessage,
        registry,
        workspaceDir,
        repoRoot
      }),
      new TelegramBridge({
        config: (cfg as any).telegram,
        registry,
        workspaceDir,
        repoRoot
      })
    ];
  };

  const bridges = buildBridges(runtimeCfg as RuntimeConfig);
  for (const bridge of bridges) bridgeManager.register(bridge);
  await bridgeManager.start();

  let announceProcessing = false;
  setInterval(async () => {
    if (announceProcessing) return;
    announceProcessing = true;
    try {
      const events = drainAnnounceback(workspaceDir, "gateway", 50);
      if (events.length === 0) return;
      for (const event of events) {
        const target = event.target;
        if (target.kind !== "gateway") continue;
        if (target.provider === "telegram") {
          const bridge = bridgeManager.list().find((b) => b instanceof TelegramBridge) as TelegramBridge | undefined;
          if (!bridge) continue;
          try {
            await bridge.sendOutboundMessage(target.chatId, event.message);
          } catch {
            // ignore delivery errors
          }
        } else if (target.provider === "whatsapp") {
          const bridge = bridgeManager.list().find((b) => b instanceof WhatsAppBridge) as WhatsAppBridge | undefined;
          if (!bridge) continue;
          try {
            await bridge.sendOutboundMessage(target.chatId, event.message);
          } catch {
            // ignore delivery errors
          }
        }
      }
    } finally {
      announceProcessing = false;
    }
  }, 2000);

  const auth = resolveGatewayAuth({
    authConfig: resolveGatewayAuthConfig(runtimeCfg),
    tailscaleMode: resolveGatewayTailscaleMode(runtimeCfg)
  });

  const subscriptions = createBridgeSubscriptionManager();
  const ctx: GatewayServerContext = {
    repoRoot,
    workspaceDir,
    cfg: runtimeCfg as RuntimeConfig,
    auth,
    bridgeManager,
    registry,
    subscriptions,
    startTime: Date.now(),
    connections: new Map(),
    buildBridges
  };

  const methods = createGatewayMethods();

  const telegramWebhookPath = String((runtimeCfg as any).telegram?.webhook?.path || "/telegram/webhook").trim() || "/telegram/webhook";

  const server = http.createServer((req, res) => {
    const method = req.method || "GET";
    const url = req.url || "/";
    const parsedUrl = new URL(url, "http://localhost");
    if (method === "POST" && parsedUrl.pathname === telegramWebhookPath) {
      const secret = String((runtimeCfg as any).telegram?.webhook?.secret_token || "").trim();
      const header = String(req.headers["x-telegram-bot-api-secret-token"] || "");
      if (secret && header !== secret) {
        res.writeHead(401, { "Content-Type": "text/plain" });
        res.end("unauthorized");
        return;
      }
      let body = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", async () => {
        const telegramBridge = bridges.find((b) => b instanceof TelegramBridge) as TelegramBridge | undefined;
        if (!telegramBridge) {
          res.writeHead(503, { "Content-Type": "text/plain" });
          res.end("telegram bridge unavailable");
          return;
        }
        let update: any;
        try {
          update = JSON.parse(body || "{}");
        } catch {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("invalid json");
          return;
        }
        try {
          await telegramBridge.handleWebhookUpdate(update);
        } catch {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("error");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("ok");
      });
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  });
  const wss = new WebSocketServer({ server });

  let seq = 0;
  const broadcastEvent = (event: string, payload: unknown) => {
    const frame: EventFrame = { type: "evt", event, seq: seq++, payload };
    for (const [, conn] of ctx.connections) {
      if ((conn as any).ws && (conn as any).ws.readyState === WebSocket.OPEN) {
        send((conn as any).ws, frame);
      }
    }
  };

  const tickTimer = setInterval(() => {
    broadcastEvent("tick", { ts: Date.now() });
  }, DEFAULT_TICK_INTERVAL_MS);

  const statusTimer = setInterval(() => {
    broadcastEvent("channels.status", bridgeManager.getStatus());
  }, 10_000);

  wss.on("connection", (ws, req) => {
    const connId = randomUUID();
    ctx.connections.set(connId, { id: connId, authorized: false });
    (ctx.connections.get(connId) as any).ws = ws;

    ws.on("message", async (raw) => {
      const parsed = safeJsonParse(rawDataToString(raw));
      if (!validateRequestFrame(parsed)) {
        send(ws, {
          type: "res",
          id: "invalid",
          ok: false,
          error: { code: "invalid_frame", message: "invalid request frame" }
        });
        return;
      }

      const frame = parsed as RequestFrame;
      const method = methods[frame.method];
      if (!method) {
        send(ws, {
          type: "res",
          id: frame.id,
          ok: false,
          error: { code: "unknown_method", message: `Unknown method: ${frame.method}` }
        });
        return;
      }

      const conn = ctx.connections.get(connId);
      if (!conn) {
        send(ws, {
          type: "res",
          id: frame.id,
          ok: false,
          error: { code: "connection_missing", message: "connection missing" }
        });
        return;
      }

      if (frame.method !== "connect" && !conn.authorized) {
        send(ws, {
          type: "res",
          id: frame.id,
          ok: false,
          error: { code: "unauthorized", message: "connect required" }
        });
        return;
      }

      let result: GatewayMethodResult;
      try {
        result = await method(frame.params, ctx, { connId, req });
      } catch (err) {
        result = errorResult("internal_error", err instanceof Error ? err.message : String(err));
      }

      if (frame.method === "connect" && result.ok) {
        conn.authorized = true;
      }

      const response: ResponseFrame = {
        type: "res",
        id: frame.id,
        ok: result.ok,
        payload: result.payload,
        error: result.error
      };
      send(ws, response);
    });

    ws.on("close", () => {
      subscriptions.unsubscribeAll(connId);
      ctx.connections.delete(connId);
    });
  });

  server.listen(port, bind, () => {
    // eslint-disable-next-line no-console
    console.log(`[gateway] listening on ws://${bind}:${port}`);
  });

  process.on("SIGINT", async () => {
    clearInterval(tickTimer);
    clearInterval(statusTimer);
    await bridgeManager.stop();
    server.close(() => process.exit(0));
  });

  process.on("SIGTERM", async () => {
    clearInterval(tickTimer);
    clearInterval(statusTimer);
    await bridgeManager.stop();
    server.close(() => process.exit(0));
  });
}
