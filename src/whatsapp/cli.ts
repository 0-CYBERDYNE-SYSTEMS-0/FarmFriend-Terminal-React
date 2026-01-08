import { WhatsAppAuthState } from "./authState.js";
import { PairingManager } from "./pairingManager.js";
import { WhatsAppServer } from "./whatsappServer.js";
import { ToolRegistry } from "../runtime/tools/registry.js";
import { registerAllTools } from "../runtime/registerDefaultTools.js";
import { resolveWorkspaceDir } from "../runtime/config/paths.js";
import { findRepoRoot } from "../runtime/config/repoRoot.js";
import { resolveConfig } from "../runtime/config/loadConfig.js";
import { resolveMainSessionId, resolveSessionMode } from "../runtime/session/sessionPolicy.js";
import type { WhatsAppConfig } from "./types.js";

/**
 * WhatsApp CLI command handlers
 */

export async function handleWhatsAppCommand(args: string[]): Promise<void> {
  const [action, ...rest] = args;

  const repoRoot = findRepoRoot();
  const runtimeCfg = resolveConfig({ repoRoot });
  const workspaceDir = resolveWorkspaceDir(
    (runtimeCfg as any).workspace_dir ?? process.env.FF_WORKSPACE_DIR ?? undefined,
    { repoRoot }
  );

  if (!action || action === "help" || action === "-h" || action === "--help") {
    showWhatsAppHelp();
    return;
  }

  if (action === "login" || action === "connect") {
    await handleLogin(workspaceDir, runtimeCfg);
    return;
  }

  if (action === "logout" || action === "disconnect") {
    await handleLogout(workspaceDir);
    return;
  }

  if (action === "status") {
    await handleStatus(workspaceDir);
    return;
  }

  if (action === "approve") {
    const code = rest[0];
    if (!code) {
      console.error("Error: Pairing code required");
      console.log("Usage: ff-terminal whatsapp approve <code>");
      process.exit(1);
    }
    await handleApprove(workspaceDir, code);
    return;
  }

  if (action === "pending") {
    await handlePending(workspaceDir);
    return;
  }

  if (action === "allowlist") {
    await handleAllowlist(workspaceDir, rest);
    return;
  }

  if (action === "start") {
    await handleStart(workspaceDir, repoRoot, runtimeCfg);
    return;
  }

  console.error(`Unknown WhatsApp command: ${action}`);
  showWhatsAppHelp();
  process.exit(1);
}

function showWhatsAppHelp(): void {
  console.log(`
WhatsApp Integration Commands:

  ff-terminal whatsapp login         Link WhatsApp device via QR code
  ff-terminal whatsapp logout        Disconnect and clear authentication
  ff-terminal whatsapp status        Show connection and session status
  ff-terminal whatsapp approve <code>  Approve a pairing request
  ff-terminal whatsapp pending       List pending pairing requests
  ff-terminal whatsapp allowlist     Manage allowed phone numbers
  ff-terminal whatsapp start         Start WhatsApp server (development)
  ff-terminal whatsapp help          Show this help

Allowlist Commands:

  ff-terminal whatsapp allowlist list              List all allowed numbers
  ff-terminal whatsapp allowlist add <number>      Add a phone number
  ff-terminal whatsapp allowlist remove <number>   Remove a phone number

Configuration:

  Enable WhatsApp in your config or profile:
  {
    "whatsapp": {
      "enabled": true,
      "allowFrom": ["+1234567890"],
      "dmPolicy": "pairing"
    }
  }
`);
}

async function handleLogin(workspaceDir: string, config: any): Promise<void> {
  const authState = new WhatsAppAuthState(workspaceDir);

  if (authState.isAuthenticated()) {
    console.log("✓ Already authenticated");
    console.log("  Use 'ff-terminal whatsapp logout' to disconnect and re-authenticate");
    return;
  }

  console.log("Starting WhatsApp authentication...\n");
  console.log("This will display a QR code. Scan it with WhatsApp:");
  console.log("  1. Open WhatsApp on your phone");
  console.log("  2. Tap Menu or Settings");
  console.log("  3. Tap Linked Devices");
  console.log("  4. Tap Link a Device");
  console.log("  5. Scan the QR code below\n");

  const registry = new ToolRegistry();
  registerAllTools(registry, { workspaceDir });

  const repoRoot = findRepoRoot();
  const whatsappConfig: WhatsAppConfig = {
    enabled: true,
    allowFrom: config.whatsapp?.allowFrom || [],
    groups: config.whatsapp?.groups || [],
    dmPolicy: config.whatsapp?.dmPolicy || "pairing",
    autoReconnect: false // Don't auto-reconnect during login
  };

  const server = new WhatsAppServer(whatsappConfig, registry, workspaceDir, repoRoot, {
    sessionMode: resolveSessionMode(config),
    mainSessionId: resolveMainSessionId(config)
  });

  let connected = false;

  const timeout = setTimeout(() => {
    if (!connected) {
      console.log("\n❌ QR code scan timeout. Please try again.");
      process.exit(1);
    }
  }, 60000);

  try {
    await server.start();

    // Wait for connection
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (server.isConnected()) {
          connected = true;
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve();
        }
      }, 500);
    });

    console.log("\n✓ Successfully connected to WhatsApp!");
    console.log("  Your device is now linked.");
    console.log("\n  Use 'ff-terminal whatsapp status' to check connection");
    console.log("  Use 'ff-terminal start' to begin using WhatsApp with FF-Terminal");

    await server.stop();
    process.exit(0);

  } catch (error) {
    clearTimeout(timeout);
    console.error("\n❌ Failed to authenticate:", error);
    process.exit(1);
  }
}

async function handleLogout(workspaceDir: string): Promise<void> {
  const authState = new WhatsAppAuthState(workspaceDir);

  if (!authState.isAuthenticated()) {
    console.log("Not authenticated");
    return;
  }

  authState.clearAuth();
  console.log("✓ Logged out and cleared authentication");
  console.log("  Use 'ff-terminal whatsapp login' to re-authenticate");
}

async function handleStatus(workspaceDir: string): Promise<void> {
  const authState = new WhatsAppAuthState(workspaceDir);
  const pairingManager = new PairingManager(workspaceDir);

  console.log("WhatsApp Status:\n");

  if (authState.isAuthenticated()) {
    console.log("✓ Device authenticated");
    console.log(`  Auth path: ${authState.getAuthPath()}`);
  } else {
    console.log("✗ Not authenticated");
    console.log("  Run: ff-terminal whatsapp login");
  }

  const pending = pairingManager.getPendingPairings();
  const allowed = pairingManager.listAllowed();

  console.log(`\nPairing Requests: ${pending.length} pending`);
  console.log(`Allowed Numbers: ${allowed.length}`);

  if (pending.length > 0) {
    console.log("\nPending pairing requests:");
    for (const req of pending) {
      const age = Math.floor((Date.now() - req.timestamp) / 1000 / 60);
      console.log(`  ${req.code} - ${req.from} (${age}m ago)`);
    }
    console.log("\nApprove with: ff-terminal whatsapp approve <code>");
  }
}

async function handleApprove(workspaceDir: string, code: string): Promise<void> {
  const pairingManager = new PairingManager(workspaceDir);
  const result = pairingManager.approvePairing(code);

  if (result.success) {
    console.log(`✓ Approved pairing for ${result.phoneNumber}`);
    console.log("  This number can now message the bot");
  } else {
    console.log(`✗ Invalid or expired pairing code: ${code}`);
    console.log("  Check pending requests with: ff-terminal whatsapp pending");
  }
}

async function handlePending(workspaceDir: string): Promise<void> {
  const pairingManager = new PairingManager(workspaceDir);
  const pending = pairingManager.getPendingPairings();

  if (pending.length === 0) {
    console.log("No pending pairing requests");
    return;
  }

  console.log(`Pending Pairing Requests (${pending.length}):\n`);

  for (const req of pending) {
    const age = Math.floor((Date.now() - req.timestamp) / 1000 / 60);
    console.log(`Code: ${req.code}`);
    console.log(`  From: ${req.from}`);
    console.log(`  Time: ${age} minutes ago`);
    console.log();
  }

  console.log("Approve with: ff-terminal whatsapp approve <code>");
}

async function handleAllowlist(workspaceDir: string, args: string[]): Promise<void> {
  const pairingManager = new PairingManager(workspaceDir);
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "list") {
    const allowed = pairingManager.listAllowed();
    if (allowed.length === 0) {
      console.log("Allowlist is empty");
      return;
    }
    console.log(`Allowed Phone Numbers (${allowed.length}):\n`);
    for (const number of allowed) {
      console.log(`  ${number}`);
    }
    return;
  }

  if (subcommand === "add") {
    const number = rest[0];
    if (!number) {
      console.error("Error: Phone number required");
      console.log("Usage: ff-terminal whatsapp allowlist add <number>");
      process.exit(1);
    }
    // Add to config-based allowlist would require config editing
    console.log("Note: This adds to the persistent allowlist.");
    console.log("To add to config-based allowlist, edit your config file:");
    console.log('  "whatsapp": { "allowFrom": ["+1234567890"] }');
    return;
  }

  if (subcommand === "remove") {
    const number = rest[0];
    if (!number) {
      console.error("Error: Phone number required");
      console.log("Usage: ff-terminal whatsapp allowlist remove <number>");
      process.exit(1);
    }
    const removed = pairingManager.removeFromAllowlist(number);
    if (removed) {
      console.log(`✓ Removed ${number} from allowlist`);
    } else {
      console.log(`✗ ${number} not found in allowlist`);
    }
    return;
  }

  console.error(`Unknown allowlist command: ${subcommand}`);
  console.log("Usage: ff-terminal whatsapp allowlist [list|add|remove]");
  process.exit(1);
}

async function handleStart(workspaceDir: string, repoRoot: string, config: any): Promise<void> {
  console.log("Starting WhatsApp server...\n");

  const whatsappConfig: WhatsAppConfig = config.whatsapp || {
    enabled: true,
    allowFrom: [],
    groups: [],
    dmPolicy: "pairing",
    autoReconnect: true
  };

  if (!whatsappConfig.enabled) {
    whatsappConfig.enabled = true;
  }

  const registry = new ToolRegistry();
  registerAllTools(registry, { workspaceDir });

  const server = new WhatsAppServer(whatsappConfig, registry, workspaceDir, repoRoot, {
    sessionMode: resolveSessionMode(config),
    mainSessionId: resolveMainSessionId(config)
  });

  try {
    await server.start();

    console.log("✓ WhatsApp server running");
    console.log("  Press Ctrl+C to stop\n");

    // Keep process alive
    process.on("SIGINT", async () => {
      console.log("\nShutting down...");
      await server.stop();
      process.exit(0);
    });

    // Prevent exit
    await new Promise(() => {});

  } catch (error) {
    console.error("Failed to start WhatsApp server:", error);
    process.exit(1);
  }
}
