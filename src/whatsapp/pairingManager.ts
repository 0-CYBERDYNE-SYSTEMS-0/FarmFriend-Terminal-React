import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { PairingRequest } from "./types.js";

/**
 * Manages pairing codes for unknown WhatsApp senders
 */
export class PairingManager {
  private pairingsPath: string;
  private allowlistPath: string;

  constructor(workspaceDir: string) {
    const whatsappDir = path.join(workspaceDir, "whatsapp");
    this.pairingsPath = path.join(whatsappDir, "pairings.json");
    this.allowlistPath = path.join(whatsappDir, "allowlist.json");
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

  /**
   * Generate a pairing code for a new sender
   */
  generatePairingCode(phoneNumber: string): string {
    const code = crypto.randomBytes(3).toString("hex").toUpperCase();
    const request: PairingRequest = {
      code,
      from: phoneNumber,
      timestamp: Date.now(),
      approved: false
    };

    const pairings = this.loadPairings();
    pairings.push(request);
    fs.writeFileSync(this.pairingsPath, JSON.stringify(pairings, null, 2));

    return code;
  }

  /**
   * Approve a pairing code and add sender to allowlist
   */
  approvePairing(code: string): { success: boolean; phoneNumber?: string } {
    const pairings = this.loadPairings();
    const request = pairings.find(p => p.code === code && !p.approved);

    if (!request) {
      return { success: false };
    }

    // Mark as approved
    request.approved = true;
    fs.writeFileSync(this.pairingsPath, JSON.stringify(pairings, null, 2));

    // Add to allowlist
    this.addToAllowlist(request.from);

    return { success: true, phoneNumber: request.from };
  }

  /**
   * Check if a phone number is in the allowlist
   */
  isAllowed(phoneNumber: string, configAllowlist: string[]): boolean {
    // Check if wildcard is enabled
    if (configAllowlist.includes("*")) {
      return true;
    }

    // Check config allowlist
    if (configAllowlist.includes(phoneNumber)) {
      return true;
    }

    // Check persistent allowlist
    const allowlist = this.loadAllowlist();
    return allowlist.includes(phoneNumber);
  }

  /**
   * Add a phone number to the persistent allowlist
   */
  private addToAllowlist(phoneNumber: string): void {
    const allowlist = this.loadAllowlist();
    if (!allowlist.includes(phoneNumber)) {
      allowlist.push(phoneNumber);
      fs.writeFileSync(this.allowlistPath, JSON.stringify(allowlist, null, 2));
    }
  }

  /**
   * Get all pending pairing requests
   */
  getPendingPairings(): PairingRequest[] {
    return this.loadPairings().filter(p => !p.approved);
  }

  /**
   * List all allowed phone numbers
   */
  listAllowed(): string[] {
    return this.loadAllowlist();
  }

  /**
   * Remove a phone number from allowlist
   */
  removeFromAllowlist(phoneNumber: string): boolean {
    const allowlist = this.loadAllowlist();
    const index = allowlist.indexOf(phoneNumber);
    if (index > -1) {
      allowlist.splice(index, 1);
      fs.writeFileSync(this.allowlistPath, JSON.stringify(allowlist, null, 2));
      return true;
    }
    return false;
  }

  private loadPairings(): PairingRequest[] {
    try {
      const data = fs.readFileSync(this.pairingsPath, "utf8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private loadAllowlist(): string[] {
    try {
      const data = fs.readFileSync(this.allowlistPath, "utf8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Clean up old pairing requests (older than 24 hours)
   */
  cleanupOldRequests(): void {
    const pairings = this.loadPairings();
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const filtered = pairings.filter(p => p.timestamp > oneDayAgo);
    fs.writeFileSync(this.pairingsPath, JSON.stringify(filtered, null, 2));
  }
}
