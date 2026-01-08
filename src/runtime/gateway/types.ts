export type GatewayChannelStatus = {
  name: string;
  enabled: boolean;
  running: boolean;
  healthy: boolean;
  last_error?: string;
  details?: Record<string, unknown>;
};

export type GatewayStatusReport = {
  timestamp: string;
  workspace_dir: string;
  channels: GatewayChannelStatus[];
};

export interface GatewayChannel {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  status(): GatewayChannelStatus;
}
