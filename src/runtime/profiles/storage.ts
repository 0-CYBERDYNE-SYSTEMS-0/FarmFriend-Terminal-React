import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";

import type { Config, Profile } from "./types.js";

const CONFIG_FILE = process.env.FF_PROFILE_STORE_PATH || join(homedir(), ".ff-terminal-profiles.json");

export type StoredData = {
  config: Config;
  // Back-compat:
  // - legacy: credentials[profileName] = "<single secret>"
  // - current: credentials[profileName] = { [envKey]: "<secret>" }
  credentials?: Record<string, string | Record<string, string>>;
};

export function readConfig(): Config {
  if (!existsSync(CONFIG_FILE)) return { profiles: [] };
  try {
    const data = JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as StoredData;
    return data.config || { profiles: [] };
  } catch {
    return { profiles: [] };
  }
}

export function writeConfig(config: Config): void {
  const existing: StoredData = existsSync(CONFIG_FILE)
    ? (JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as StoredData)
    : { config: { profiles: [] } };
  existing.config = config;
  writeFileSync(CONFIG_FILE, JSON.stringify(existing, null, 2) + "\n", "utf8");
  try {
    // Restrict file permissions to user-only (sensitive credential data)
    chmodSync(CONFIG_FILE, 0o600);
  } catch {
    // ignore chmod errors on Windows or filesystems that don't support permissions
  }
}

export async function storeCredential(profileName: string, keyOrCredential: string, credentialMaybe?: string): Promise<void> {
  const hasKey = typeof credentialMaybe === "string";
  const key = hasKey ? keyOrCredential : undefined;
  const credential = hasKey ? credentialMaybe! : keyOrCredential;

  const data: StoredData = existsSync(CONFIG_FILE)
    ? (JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as StoredData)
    : { config: { profiles: [] }, credentials: {} };
  if (!data.credentials) data.credentials = {};

  const existing = data.credentials[profileName];
  if (!key) {
    data.credentials[profileName] = credential;
  } else if (!existing) {
    data.credentials[profileName] = { [key]: credential };
  } else if (typeof existing === "string") {
    data.credentials[profileName] = { PRIMARY: existing, [key]: credential };
  } else {
    existing[key] = credential;
  }

  writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
  try {
    // Restrict file permissions to user-only (sensitive credential data)
    chmodSync(CONFIG_FILE, 0o600);
  } catch {
    // ignore chmod errors on Windows or filesystems that don't support permissions
  }
}

export async function getCredential(profileName: string, key?: string): Promise<string | null> {
  if (!existsSync(CONFIG_FILE)) return null;
  const data = JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as StoredData;
  const v = data.credentials?.[profileName];
  if (!v) return null;
  if (typeof v === "string") return v; // legacy single-secret fallback
  if (!key) return v.PRIMARY || null;
  return v[key] || v.PRIMARY || null;
}

export async function deleteCredential(profileName: string, key?: string): Promise<void> {
  if (!existsSync(CONFIG_FILE)) return;
  const data = JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as StoredData;
  if (!data.credentials || !data.credentials[profileName]) return;

  if (!key) {
    delete data.credentials[profileName];
  } else {
    const cur = data.credentials[profileName];
    if (typeof cur === "string") {
      // legacy: delete everything (we can't know which key it is)
      delete data.credentials[profileName];
    } else {
      delete cur[key];
      if (Object.keys(cur).length === 0) delete data.credentials[profileName];
    }
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
  try {
    // Restrict file permissions to user-only (sensitive credential data)
    chmodSync(CONFIG_FILE, 0o600);
  } catch {
    // ignore chmod errors on Windows or filesystems that don't support permissions
  }
}

export function getProfileByName(config: Config, name: string): Profile | null {
  return config.profiles.find((p) => p.name === name) ?? null;
}
