import type { RuntimeConfig } from "../runtime/config/loadConfig.js";
import type { GatewayBridgeManager } from "./bridgeManager.js";
import type { GatewayBridge } from "./types.js";
import type { ResolvedGatewayAuth } from "./auth.js";
import type { ToolRegistry } from "../runtime/tools/registry.js";
import type { BridgeSubscriptionManager } from "./bridgeSubscriptions.js";

export type GatewayServerConnection = {
  id: string;
  authorized: boolean;
  nodeId?: string;
};

export type GatewayServerContext = {
  repoRoot: string;
  workspaceDir: string;
  cfg: RuntimeConfig;
  auth: ResolvedGatewayAuth;
  bridgeManager: GatewayBridgeManager;
  registry: ToolRegistry;
  subscriptions: BridgeSubscriptionManager;
  startTime: number;
  connections: Map<string, GatewayServerConnection>;
  buildBridges: (cfg: RuntimeConfig) => GatewayBridge[];
};

export type GatewayMethodResult = {
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string; details?: unknown };
};

export type GatewayMethodHandler = (
  params: unknown,
  ctx: GatewayServerContext,
  meta: { connId: string; req?: import("node:http").IncomingMessage }
) => Promise<GatewayMethodResult>;
