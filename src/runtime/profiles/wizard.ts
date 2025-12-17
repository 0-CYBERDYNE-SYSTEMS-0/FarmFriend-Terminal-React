import readline from "node:readline/promises";

import type { Config, Profile, ProviderKind } from "./types.js";
import { getCredential, storeCredential } from "./storage.js";
import { GLOBAL_TOOL_CRED_PROFILE, OPTIONAL_TOOL_ENV_KEYS } from "./toolKeys.js";
import { promptSecret } from "./prompts.js";

type Preset = { provider: ProviderKind; baseUrl?: string; model?: string; credentialLabel?: string };
type InquirerLike = {
  prompt: <T = any>(questions: any) => Promise<T>;
};

const PRESETS: Record<string, Preset> = {
  OpenRouter: { provider: "openrouter", model: "openai/gpt-4o-mini", credentialLabel: "OPENROUTER_API_KEY" },
  "Anthropic (direct)": { provider: "anthropic", baseUrl: "https://api.anthropic.com", model: "claude-3-5-sonnet-20241022", credentialLabel: "ANTHROPIC_API_KEY" },
  "Z.ai (Anthropic-compatible)": {
    provider: "zai",
    baseUrl: "https://open.bigmodel.cn/api/anthropic",
    model: "glm-4.5-air",
    credentialLabel: "ANTHROPIC_AUTH_TOKEN"
  },
  MiniMax: {
    provider: "minimax",
    baseUrl: "https://api.minimax.io/anthropic",
    model: "MiniMax-M2",
    credentialLabel: "MINIMAX_API_KEY"
  },
  "LM Studio (local)": { provider: "lmstudio", baseUrl: "http://localhost:1234", model: "llama-3.2-3b-instruct" }
};

async function tryInquirer(): Promise<InquirerLike | null> {
  try {
    const mod = await import("inquirer");
    const i = ((mod as any).default || mod) as InquirerLike;
    return typeof i?.prompt === "function" ? i : null;
  } catch {
    return null;
  }
}

export async function promptSelectProfile(params: {
  config: Config;
  preferredName?: string;
}): Promise<Profile> {
  const { config, preferredName } = params;

  if (preferredName) {
    const found = config.profiles.find((p) => p.name === preferredName);
    if (!found) throw new Error(`Profile not found: ${preferredName}`);
    return found;
  }

  if (config.profiles.length === 0) throw new Error(`No profiles configured. Run "ff-terminal profile setup" first.`);
  if (config.profiles.length === 1) return config.profiles[0];

  const inquirer = await tryInquirer();
  if (inquirer) {
    const { selectedProfile } = await inquirer.prompt<{ selectedProfile: string }>([
      {
        type: "list",
        name: "selectedProfile",
        message: "Select a profile to use:",
        choices: config.profiles.map((p) => ({
          name: p.name === config.defaultProfile ? `${p.name} (default)` : p.name,
          value: p.name
        })),
        default: config.defaultProfile
      }
    ]);
    const found = config.profiles.find((p) => p.name === selectedProfile);
    if (!found) throw new Error(`Profile not found: ${selectedProfile}`);
    return found;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    // eslint-disable-next-line no-console
    console.log("\nAvailable profiles:");
    config.profiles.forEach((p, idx) => {
      const isDefault = config.defaultProfile && p.name === config.defaultProfile;
      // eslint-disable-next-line no-console
      console.log(`  ${idx + 1}) ${p.name}${isDefault ? " (default)" : ""} — ${p.provider}`);
    });
    const answer = await rl.question(`\nSelect profile [1-${config.profiles.length}] (default: ${config.defaultProfile ?? "1"}): `);
    const trimmed = answer.trim();
    if (!trimmed && config.defaultProfile) {
      const def = config.profiles.find((p) => p.name === config.defaultProfile);
      if (def) return def;
    }
    const n = Number(trimmed || "1");
    if (!Number.isFinite(n) || n < 1 || n > config.profiles.length) throw new Error("Invalid selection");
    return config.profiles[n - 1];
  } finally {
    rl.close();
  }
}

export async function runProfileSetupWizard(params: { config: Config }): Promise<{ config: Config; created: Profile }> {
  const inquirer = await tryInquirer();
  if (inquirer) {
    // Inquirer path (closest to ai-claude-start UX).
    // eslint-disable-next-line no-console
    console.log("\nFF-Terminal Profile Setup Wizard\n");

    const presetNames = [...Object.keys(PRESETS), "Custom"];
    const { presetName } = await inquirer.prompt<{ presetName: string }>([
      { type: "list", name: "presetName", message: "Choose a profile type:", choices: presetNames }
    ]);

    const defaultName = presetName === "Custom" ? "" : presetName;
    const { name } = await inquirer.prompt<{ name: string }>([
      { type: "input", name: "name", message: "Profile name:", default: defaultName, validate: (s: string) => (s.trim() ? true : "Required") }
    ]);

    let profile: Profile;
    if (presetName === "Custom") {
      const ans = await inquirer.prompt<{ provider: ProviderKind; baseUrl?: string; model?: string }>([
        {
          type: "list",
          name: "provider",
          message: "Provider:",
          choices: ["openrouter", "anthropic", "zai", "minimax", "lmstudio"]
        },
        { type: "input", name: "baseUrl", message: "Base URL (optional):" },
        { type: "input", name: "model", message: "Model (optional):" }
      ]);
      profile = {
        name: name.trim(),
        provider: ans.provider,
        baseUrl: ans.baseUrl?.trim() || undefined,
        model: ans.model?.trim() || undefined
      };
    } else {
      const preset = PRESETS[presetName];
      const ans = await inquirer.prompt<{ baseUrl?: string; model?: string }>([
        ...(preset.baseUrl
          ? [{ type: "input", name: "baseUrl", message: "Base URL:", default: preset.baseUrl }]
          : []),
        { type: "input", name: "model", message: "Model:", default: preset.model || "" }
      ]);
      profile = {
        name: name.trim(),
        provider: preset.provider,
        baseUrl: preset.baseUrl ? (ans.baseUrl?.trim() || preset.baseUrl) : undefined,
        model: ans.model?.trim() || preset.model
      };
    }

    if (profile.provider !== "lmstudio") {
      const label = Object.values(PRESETS).find((p) => p.provider === profile.provider)?.credentialLabel || "API key";
      const { credential } = await inquirer.prompt<{ credential: string }>([
        { type: "password", name: "credential", message: `Enter ${label}:`, mask: "*" }
      ]);
      if (!credential?.trim()) throw new Error("Credential is required");
      await storeCredential(profile.name, label, credential.trim());
    }

    // Check which tool keys are already configured globally
    const keyStatus = {
      configured: [] as string[],
      missing: [] as string[],
      all: OPTIONAL_TOOL_ENV_KEYS as readonly string[]
    };

    for (const key of OPTIONAL_TOOL_ENV_KEYS) {
      const value = await getCredential(GLOBAL_TOOL_CRED_PROFILE, key);
      if (value) {
        keyStatus.configured.push(key);
      } else {
        keyStatus.missing.push(key);
      }
    }

    // Display status if any keys are configured
    if (keyStatus.configured.length > 0) {
      // eslint-disable-next-line no-console
      console.log("\nGlobal tool API keys detected:");
      for (const key of keyStatus.all) {
        const status = keyStatus.configured.includes(key) ? "✓" : "✗";
        // eslint-disable-next-line no-console
        console.log(`  ${status} ${key}`);
      }
    }

    // Only prompt if there are missing keys or no keys configured at all
    const shouldPrompt = keyStatus.missing.length > 0 || keyStatus.configured.length === 0;
    const defaultAnswer = keyStatus.missing.length > 0;

    if (!shouldPrompt) {
      // eslint-disable-next-line no-console
      console.log("\n✓ All tool API keys already configured globally (skipping prompt)");
    }

    const addOptional = shouldPrompt
      ? (
          await inquirer.prompt<{ addOptional: boolean }>([
            {
              type: "confirm",
              name: "addOptional",
              message:
                keyStatus.configured.length > 0
                  ? `Update tool API keys? (${keyStatus.missing.length} not set)`
                  : "Add optional API keys for tools (Tavily/Perplexity/Gemini/OpenWeather)?",
              default: defaultAnswer
            }
          ])
        ).addOptional
      : false;

    if (addOptional) {
      for (const key of OPTIONAL_TOOL_ENV_KEYS) {
        const existing = await getCredential(GLOBAL_TOOL_CRED_PROFILE, key);
        const hasValue = !!existing;

        const { value } = await inquirer.prompt<{ value: string }>([
          {
            type: "password",
            name: "value",
            message: hasValue
              ? `${key} (already set, press Enter to keep or enter new value):`
              : `Enter ${key} (leave blank to skip):`,
            mask: "*"
          }
        ]);

        const v = String(value || "").trim();
        if (v) {
          // Store directly to global (primary storage)
          await storeCredential(GLOBAL_TOOL_CRED_PROFILE, key, v);
          // eslint-disable-next-line no-console
          console.log(`  ✓ ${key} saved globally`);
        } else if (!hasValue) {
          // eslint-disable-next-line no-console
          console.log(`  ⊘ ${key} skipped`);
        } else {
          // eslint-disable-next-line no-console
          console.log(`  ↻ ${key} unchanged`);
        }
      }
    }

    const idx = params.config.profiles.findIndex((p) => p.name === profile.name);
    if (idx >= 0) {
      const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
        { type: "confirm", name: "overwrite", message: `Profile "${profile.name}" exists. Overwrite?`, default: false }
      ]);
      if (!overwrite) throw new Error("Setup cancelled");
      params.config.profiles[idx] = profile;
    } else {
      params.config.profiles.push(profile);
    }
    if (!params.config.defaultProfile) params.config.defaultProfile = profile.name;

    // eslint-disable-next-line no-console
    console.log(`\nSaved profile "${profile.name}" (${profile.provider}).`);
    return { config: params.config, created: profile };
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    // eslint-disable-next-line no-console
    console.log("\nFF-Terminal Profile Setup Wizard\n");

    const presetNames = [...Object.keys(PRESETS), "Custom"];
    // eslint-disable-next-line no-console
    console.log("Choose a profile type:");
    presetNames.forEach((n, i) => {
      // eslint-disable-next-line no-console
      console.log(`  ${i + 1}) ${n}`);
    });
    const presetIndex = Number((await rl.question(`Select [1-${presetNames.length}]: `)).trim() || "1");
    if (!Number.isFinite(presetIndex) || presetIndex < 1 || presetIndex > presetNames.length) {
      throw new Error("Invalid selection");
    }
    const presetName = presetNames[presetIndex - 1];

    const nameDefault = presetName === "Custom" ? "" : presetName;
    const name = (await rl.question(`Profile name${nameDefault ? ` [default: ${nameDefault}]` : ""}: `)).trim() || nameDefault;
    if (!name) throw new Error("Profile name is required");

    let profile: Profile;

    if (presetName === "Custom") {
      const provider = (await rl.question("Provider (openrouter | anthropic | zai | minimax | lmstudio): ")).trim() as ProviderKind;
      if (!["openrouter", "anthropic", "zai", "minimax", "lmstudio"].includes(provider)) throw new Error("Invalid provider");
      const baseUrl = (await rl.question("Base URL (optional): ")).trim() || undefined;
      const model = (await rl.question("Model (optional): ")).trim() || undefined;
      profile = { name, provider, baseUrl, model };
    } else {
      const preset = PRESETS[presetName];
      const baseUrl = preset.baseUrl
        ? (await rl.question(`Base URL [default: ${preset.baseUrl}]: `)).trim() || preset.baseUrl
        : undefined;
      const model = (await rl.question(`Model${preset.model ? ` [default: ${preset.model}]` : ""}: `)).trim() || preset.model;
      profile = { name, provider: preset.provider, baseUrl, model };
    }

    // Credential (provider-specific).
    const needsCredential = profile.provider !== "lmstudio";
    if (needsCredential) {
      const label = Object.values(PRESETS).find((p) => p.provider === profile.provider)?.credentialLabel || "API key";
      const credential = await promptSecret(`Enter ${label}: `);
      if (!credential.trim()) throw new Error("Credential is required");
      await storeCredential(profile.name, label, credential.trim());
    }

    const addOptional = (await rl.question("Add optional API keys for tools (Tavily/Perplexity/Gemini/OpenWeather)? (y/N): ")).trim().toLowerCase();
    if (addOptional === "y" || addOptional === "yes") {
      for (const key of OPTIONAL_TOOL_ENV_KEYS) {
        const v = (await promptSecret(`Enter ${key} (leave blank to skip): `)).trim();
        if (v) {
          await storeCredential(profile.name, key, v);
          const existingGlobal = await getCredential(GLOBAL_TOOL_CRED_PROFILE, key);
          if (!existingGlobal) await storeCredential(GLOBAL_TOOL_CRED_PROFILE, key, v);
        }
      }
    }

    // Upsert into config
    const idx = params.config.profiles.findIndex((p) => p.name === profile.name);
    if (idx >= 0) {
      const overwrite = (await rl.question(`Profile "${profile.name}" exists. Overwrite? (y/N): `)).trim().toLowerCase() === "y";
      if (!overwrite) throw new Error("Setup cancelled");
      params.config.profiles[idx] = profile;
    } else {
      params.config.profiles.push(profile);
    }

    if (!params.config.defaultProfile) params.config.defaultProfile = profile.name;

    // eslint-disable-next-line no-console
    console.log(`\nSaved profile "${profile.name}" (${profile.provider}).`);

    // Quick credential check
    if (needsCredential) {
      const label = Object.values(PRESETS).find((p) => p.provider === profile.provider)?.credentialLabel || "API key";
      const stored = await getCredential(profile.name, label);
      if (!stored) {
        // eslint-disable-next-line no-console
        console.log("Warning: credential store did not return a value for this profile.");
      }
    }

    return { config: params.config, created: profile };
  } finally {
    rl.close();
  }
}
