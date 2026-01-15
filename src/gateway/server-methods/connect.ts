import os from "node:os";
import {
  PROTOCOL_VERSION,
  formatValidationErrors,
  type HelloOk,
  validateConnectParams
} from "../protocol/index.js";
import { authorizeGatewayConnect } from "../auth.js";
import type { GatewayMethodHandler } from "../server-shared.js";

export function createConnectHandler(methods: string[]): GatewayMethodHandler {
  return async (params, ctx, meta) => {
    if (!validateConnectParams(params)) {
      return {
        ok: false,
        error: {
          code: "invalid_params",
          message: formatValidationErrors(validateConnectParams.errors)
        }
      };
    }

    const payload = params as { minProtocol: number; maxProtocol: number; auth?: { token?: string; password?: string } };
    if (payload.minProtocol > PROTOCOL_VERSION || payload.maxProtocol < PROTOCOL_VERSION) {
      return {
        ok: false,
        error: {
          code: "protocol_mismatch",
          message: `protocol mismatch (server=${PROTOCOL_VERSION}, client=${payload.minProtocol}-${payload.maxProtocol})`
        }
      };
    }

    const authResult = await authorizeGatewayConnect({
      auth: ctx.auth,
      connectAuth: payload.auth || null,
      req: meta.req
    });
    if (!authResult.ok) {
      return {
        ok: false,
        error: {
          code: "unauthorized",
          message: authResult.reason || "unauthorized",
          details: { reason: authResult.reason }
        }
      };
    }

    const hello: HelloOk = {
      type: "hello-ok",
      protocol: PROTOCOL_VERSION,
      server: {
        version: process.env.FF_TERMINAL_VERSION || "dev",
        host: os.hostname(),
        connId: meta.connId
      },
      features: {
        methods,
        events: ["tick", "gateway.status", "channels.status"]
      },
      snapshot: {
        uptimeMs: Math.max(0, Date.now() - ctx.startTime)
      },
      policy: {
        maxPayload: 25 * 1024 * 1024,
        maxBufferedBytes: 25 * 1024 * 1024,
        tickIntervalMs: 30_000
      }
    };

    return { ok: true, payload: hello };
  };
}
