/**
 * WhatsApp integration types for FF-Terminal
 */

export interface WhatsAppConfig {
  enabled: boolean;
  allowFrom: string[];
  groups?: string[];
  dmPolicy?: "pairing" | "open";
  credentialsPath?: string;
  autoReconnect?: boolean;
  qrTimeout?: number;
}

export interface WhatsAppMessage {
  from: string;
  to: string;
  text: string;
  messageId: string;
  timestamp: number;
  isGroup: boolean;
  groupId?: string;
  senderName?: string;
}

export interface PairingRequest {
  code: string;
  from: string;
  timestamp: number;
  approved: boolean;
}

export interface WhatsAppSession {
  sessionId: string;
  phoneNumber: string;
  lastActivity: number;
  messageCount: number;
}

export interface WhatsAppClientOptions {
  workspaceDir: string;
  config: WhatsAppConfig;
  onMessage: (message: WhatsAppMessage) => Promise<void>;
  onQR?: (qr: string) => void;
  onReady?: () => void;
  onDisconnect?: (reason: string) => void;
}
