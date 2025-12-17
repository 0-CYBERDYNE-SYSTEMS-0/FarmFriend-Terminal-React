import { OPTIONAL_TOOL_ENV_KEYS, GLOBAL_TOOL_CRED_PROFILE } from "./toolKeys.js";
import { getCredential, storeCredential, deleteCredential } from "./storage.js";

type InquirerLike = {
  prompt: <T = any>(questions: any) => Promise<T>;
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

async function promptSecret(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  const stdin = process.stdin;
  const wasRaw = (stdin as any).isRaw;
  stdin.setRawMode?.(true);
  stdin.resume();

  return await new Promise((resolve) => {
    let value = "";
    const onData = (chunk: Buffer) => {
      const s = chunk.toString("utf8");
      for (const ch of s) {
        if (ch === "\r" || ch === "\n") {
          process.stdout.write("\n");
          stdin.off("data", onData);
          stdin.setRawMode?.(Boolean(wasRaw));
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          // Ctrl+C
          process.stdout.write("\n");
          stdin.off("data", onData);
          stdin.setRawMode?.(Boolean(wasRaw));
          process.exit(0);
        }
        if (ch === "\x7f" || ch === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (ch >= " ") {
          value += ch;
          process.stdout.write("*");
        }
      }
    };
    stdin.on("data", onData);
  });
}

export async function runToolKeysManager(): Promise<void> {
  const inquirer = await tryInquirer();
  if (!inquirer) {
    throw new Error("Inquirer library not available");
  }

  // eslint-disable-next-line no-console
  console.log("\n=== Global Tool API Keys Manager ===\n");

  // Show current status
  // eslint-disable-next-line no-console
  console.log("Current status:");
  const keyStatus: Record<string, boolean> = {};
  for (const key of OPTIONAL_TOOL_ENV_KEYS) {
    const value = await getCredential(GLOBAL_TOOL_CRED_PROFILE, key);
    keyStatus[key] = !!value;
    // eslint-disable-next-line no-console
    console.log(`  ${value ? "✓" : "✗"} ${key}`);
  }

  // eslint-disable-next-line no-console
  console.log("\nThese keys are shared across all profiles.");

  const { action } = await inquirer.prompt<{ action: string }>([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices: [
        { name: "Add/Update keys", value: "update" },
        { name: "View configured keys", value: "view" },
        { name: "Delete a key", value: "delete" },
        { name: "Exit", value: "exit" }
      ]
    }
  ]);

  if (action === "exit") return;

  if (action === "update") {
    for (const key of OPTIONAL_TOOL_ENV_KEYS) {
      const existing = await getCredential(GLOBAL_TOOL_CRED_PROFILE, key);
      const hasValue = !!existing;

      const prompt = hasValue
        ? `${key} (currently set, press Enter to keep or enter new value): `
        : `${key} (leave blank to skip): `;

      const value = await promptSecret(prompt);
      const v = value.trim();

      if (v) {
        await storeCredential(GLOBAL_TOOL_CRED_PROFILE, key, v);
        // eslint-disable-next-line no-console
        console.log(`  ✓ ${key} saved`);
      } else if (!hasValue) {
        // eslint-disable-next-line no-console
        console.log(`  ⊘ ${key} skipped`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`  ↻ ${key} unchanged`);
      }
    }
    // eslint-disable-next-line no-console
    console.log("\n✓ Tool keys updated successfully!");
  }

  if (action === "view") {
    // eslint-disable-next-line no-console
    console.log("\nConfigured keys:");
    for (const key of OPTIONAL_TOOL_ENV_KEYS) {
      const value = await getCredential(GLOBAL_TOOL_CRED_PROFILE, key);
      if (value) {
        const masked = value.length > 12 ? value.slice(0, 8) + "..." + value.slice(-4) : "***";
        // eslint-disable-next-line no-console
        console.log(`  ${key}: ${masked}`);
      }
    }
  }

  if (action === "delete") {
    const configuredKeys = [];
    for (const key of OPTIONAL_TOOL_ENV_KEYS) {
      const value = await getCredential(GLOBAL_TOOL_CRED_PROFILE, key);
      if (value) configuredKeys.push(key);
    }

    if (configuredKeys.length === 0) {
      // eslint-disable-next-line no-console
      console.log("\nNo keys configured to delete.");
      return;
    }

    const { keyToDelete } = await inquirer.prompt<{ keyToDelete: string }>([
      {
        type: "list",
        name: "keyToDelete",
        message: "Select key to delete:",
        choices: configuredKeys
      }
    ]);

    await deleteCredential(GLOBAL_TOOL_CRED_PROFILE, keyToDelete);
    // eslint-disable-next-line no-console
    console.log(`✓ ${keyToDelete} deleted`);
  }
}
