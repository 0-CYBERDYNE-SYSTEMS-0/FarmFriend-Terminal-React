import fs from "node:fs";
import path from "node:path";
import type { AuthenticationState } from "@whiskeysockets/baileys";
import { useMultiFileAuthState } from "@whiskeysockets/baileys";

/**
 * Manages WhatsApp authentication state persistence
 */
export class WhatsAppAuthState {
  private authPath: string;

  constructor(workspaceDir: string) {
    this.authPath = path.join(workspaceDir, "whatsapp", "auth");
    this.ensureAuthDirectory();
  }

  private ensureAuthDirectory(): void {
    if (!fs.existsSync(this.authPath)) {
      fs.mkdirSync(this.authPath, { recursive: true });
    }
  }

  /**
   * Get authentication state using Baileys multi-file auth
   */
  async getAuthState(): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
  }> {
    return await useMultiFileAuthState(this.authPath);
  }

  /**
   * Check if device is already authenticated
   */
  isAuthenticated(): boolean {
    const credsPath = path.join(this.authPath, "creds.json");
    return fs.existsSync(credsPath);
  }

  /**
   * Clear authentication state (logout)
   */
  clearAuth(): void {
    if (fs.existsSync(this.authPath)) {
      fs.rmSync(this.authPath, { recursive: true, force: true });
    }
    this.ensureAuthDirectory();
  }

  /**
   * Get authentication directory path
   */
  getAuthPath(): string {
    return this.authPath;
  }
}
