import type { GatewayMethodHandler } from "../server-shared.js";
import { readConfig } from "../../runtime/profiles/storage.js";

export const modelsListHandler: GatewayMethodHandler = async (_params, ctx) => {
  const cfg: any = ctx.cfg || {};
  const profileConfig = readConfig();
  const profiles = profileConfig.profiles.map((p) => ({
    name: p.name,
    provider: p.provider,
    model: p.model ?? null,
    isDefault: profileConfig.defaultProfile === p.name
  }));
  return {
    ok: true,
    payload: {
      main_model: cfg.main_model ?? null,
      profiles
    }
  };
};
