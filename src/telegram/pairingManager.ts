import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

type TelegramPairingRequest = {
  code: string;
  from: string;
  chatId: string;
  username?: string;
  displayName?: string;
  timestamp: number;
  approved: boolean;
};

export class TelegramPairingManager {
  private pairingsPath: string;
  private allowlistPath: string;

  constructor(workspaceDir: string) {
    const telegramDir = path.join(workspaceDir, "telegram");
    this.pairingsPath = path.join(telegramDir, "pairings.json");
    this.allowlistPath = path.join(telegramDir, "allowlist.json");
    this.ensureFiles();
  }

  private ensureFiles(): void {
    const dir = path.dirname(this.pairingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.pairingsPath)) {
      fs.writeFileSync(this.pairingsPath, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(this.allowlistPath)) {
      fs.writeFileSync(this.allowlistPath, JSON.stringify([], null, 2));
    }
  }

  requestPairing(params: {
    from: string;
    chatId: string;
    username?: string;
    displayName?: string;
    ttlMinutes?: number;
  }): string {
    const ttlMs = Math.max(5, Number(params.ttlMinutes ?? 1440)) * 60 * 1000;
    const now = Date.now();
    const pairings = this.loadPairings().filter((p) => now - p.timestamp <= ttlMs);
    const existing = pairings.find((p) => p.from === params.from && !p.approved);
    if (existing) {
      this.savePairings(pairings);
      return existing.code;
    }

    const code = crypto.randomBytes(3).toString("hex").toUpperCase();
    pairings.push({
      code,
      from: params.from,
      chatId: params.chatId,
      username: params.username,
      displayName: params.displayName,
      timestamp: now,
      approved: false
    });
    this.savePairings(pairings);
    return code;
  }

  approvePairing(code: string): { success: boolean; senderId?: string } {
    const pairings = this.loadPairings();
    const request = pairings.find((p) => p.code === code && !p.approved);
    if (!request) return { success: false };
    request.approved = true;
    this.savePairings(pairings);
    this.addToAllowlist(request.from);
    return { success: true, senderId: request.from };
  }

  isAllowed(senderId: string, configAllowlist: string[]): boolean {
    if (configAllowlist.includes("*")) return true;
    if (configAllowlist.includes(senderId)) return true;
    return this.loadAllowlist().includes(senderId);
  }

  listAllowed(): string[] {
    return this.loadAllowlist();
  }

  addAllowed(senderId: string): void {
    this.addToAllowlist(senderId);
  }

  removeAllowed(senderId: string): boolean {
    const allowlist = this.loadAllowlist();
    const index = allowlist.indexOf(senderId);
    if (index > -1) {
      allowlist.splice(index, 1);
      fs.writeFileSync(this.allowlistPath, JSON.stringify(allowlist, null, 2));
      return true;
    }
    return false;
  }

  getPendingPairings(ttlMinutes?: number): TelegramPairingRequest[] {
    const ttlMs = Math.max(5, Number(ttlMinutes ?? 1440)) * 60 * 1000;
    const now = Date.now();
    const pairings = this.loadPairings().filter((p) => now - p.timestamp <= ttlMs);
    this.savePairings(pairings);
    return pairings.filter((p) => !p.approved);
  }

  private addToAllowlist(senderId: string): void {
    const allowlist = this.loadAllowlist();
    if (!allowlist.includes(senderId)) {
      allowlist.push(senderId);
      fs.writeFileSync(this.allowlistPath, JSON.stringify(allowlist, null, 2));
    }
  }

  private loadPairings(): TelegramPairingRequest[] {
    try {
      const data = fs.readFileSync(this.pairingsPath, "utf8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private savePairings(pairings: TelegramPairingRequest[]): void {
    fs.writeFileSync(this.pairingsPath, JSON.stringify(pairings, null, 2));
  }

  private loadAllowlist(): string[] {
    try {
      const data = fs.readFileSync(this.allowlistPath, "utf8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
}
