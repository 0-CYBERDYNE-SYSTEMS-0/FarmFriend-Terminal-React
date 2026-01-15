import type { GatewayMethodHandler } from "../server-shared.js";
import { createConnectHandler } from "./connect.js";
import { healthHandler } from "./health.js";
import { statusHandler } from "./status.js";
import {
  sessionsListHandler,
  sessionsPatchHandler,
  sessionsResetHandler,
  sessionsCompactHandler,
  sessionsHistoryHandler
} from "./sessions.js";
import { channelsStatusHandler } from "./channels.js";
import { configGetHandler, configSetHandler, configReloadHandler } from "./config.js";
import { logsTailHandler } from "./logs.js";
import { agentTurnHandler } from "./agent.js";
import { cronListHandler, cronAddHandler, cronUpdateHandler, cronRemoveHandler } from "./cron.js";
import { providersStatusHandler } from "./providers.js";
import { modelsListHandler } from "./models.js";
import { chatSendHandler } from "./chat.js";
import { bridgeSubscribeHandler, bridgeUnsubscribeHandler, bridgeUnsubscribeAllHandler } from "./bridge.js";

export function createGatewayMethods(): Record<string, GatewayMethodHandler> {
  const methods: Record<string, GatewayMethodHandler> = {
    connect: createConnectHandler([]),
    health: healthHandler,
    status: statusHandler,
    "config.get": configGetHandler,
    "config.set": configSetHandler,
    "config.reload": configReloadHandler,
    "sessions.list": sessionsListHandler,
    "sessions.patch": sessionsPatchHandler,
    "sessions.reset": sessionsResetHandler,
    "sessions.compact": sessionsCompactHandler,
    "sessions.history": sessionsHistoryHandler,
    "channels.status": channelsStatusHandler,
    "logs.tail": logsTailHandler,
    "agent.turn": agentTurnHandler,
    "chat.send": chatSendHandler,
    "cron.list": cronListHandler,
    "cron.add": cronAddHandler,
    "cron.update": cronUpdateHandler,
    "cron.remove": cronRemoveHandler,
    "providers.status": providersStatusHandler,
    "models.list": modelsListHandler,
    "bridge.subscribe": bridgeSubscribeHandler,
    "bridge.unsubscribe": bridgeUnsubscribeHandler,
    "bridge.unsubscribe_all": bridgeUnsubscribeAllHandler
  };

  const methodNames = Object.keys(methods).filter((name) => name !== "connect");
  methods.connect = createConnectHandler(["connect", ...methodNames]);

  return methods;
}
