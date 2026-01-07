/**
 * WhatsApp Integration Module for FF-Terminal
 *
 * Provides WhatsApp messaging integration using Baileys library,
 * enabling users to interact with FF-Terminal via WhatsApp.
 */

export { WhatsAppServer } from "./whatsappServer.js";
export { WhatsAppClient } from "./whatsappClient.js";
export { WhatsAppSessionManager } from "./sessionManager.js";
export { WhatsAppMessageHandler } from "./messageHandler.js";
export { WhatsAppAuthState } from "./authState.js";
export { PairingManager } from "./pairingManager.js";

export type {
  WhatsAppConfig,
  WhatsAppMessage,
  WhatsAppSession,
  WhatsAppClientOptions,
  PairingRequest
} from "./types.js";
