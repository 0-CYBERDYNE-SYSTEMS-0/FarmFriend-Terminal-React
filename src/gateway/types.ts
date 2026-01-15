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
  uptime_ms: number;
  channels: GatewayChannelStatus[];
};

export interface GatewayBridge {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  status(): GatewayChannelStatus;
}
