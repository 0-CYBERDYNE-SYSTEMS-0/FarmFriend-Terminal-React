export type Role = "system" | "developer" | "user" | "assistant" | "tool" | "thinking" | "error"

export type ChatMessage = {
  id: string
  role: Role
  content: string
  timestamp: number
  toolName?: string
  attachments?: Array<{ name: string; type: string; size: number; data: string }>
}

export type FileAttachment = {
  name: string
  type: string
  size: number
  data: string
}

export type ConsoleEvent = {
  id: string
  type: string
  content: string
  timestamp: number
  metadata?: any
}

export type GatewayChannelStatus = {
  name: string
  enabled: boolean
  running: boolean
  healthy: boolean
  last_error?: string
  details?: Record<string, unknown>
}

export type GatewayStatusReport = {
  timestamp: string
  workspace_dir: string
  channels: GatewayChannelStatus[]
}

export type ControlOverview = {
  timestamp: string
  workspace_dir: string
  gateway?: GatewayStatusReport | null
  scheduler: {
    task_count: number
    enabled_count: number
    next_run_at: number | null
  }
  health: {
    ok: boolean
    issues: Array<{ type?: string; severity?: string; message?: string; path?: string }>
  }
  contract: {
    files: Array<{ name: string; exists: boolean }>
  }
}

// WebSocket message types
export type WebClientMessage =
  | { type: "command"; data: { command: string; files?: FileAttachment[] } }
  | { type: "ping" }
  | { type: "get_history" }
  | { type: "clear_session" }

export type WebServerMessage =
  | { type: "system"; content: string; session_id: string; timestamp: number }
  | { type: "response"; content: string; session_id: string; timestamp: number }
  | { type: "thinking"; content: string; session_id: string; timestamp: number }
  | { type: "thinking_xml"; content: string; session_id: string; timestamp: number }
  | { type: "tool_call"; tool_name: string; content: string; session_id: string; timestamp: number }
  | { type: "error"; content: string; session_id: string; timestamp: number }
  | { type: "history"; content: string; session_id: string; timestamp: number }
  | { type: "pong"; session_id: string; timestamp: number }
  | { type: "command_received"; content: string; session_id: string; timestamp: number }
  | { type: "turn_finished"; session_id: string; timestamp: number }

// Status indicator types
export type StatusPillData = {
  label: string
  value: string
  tone: 'good' | 'warn' | 'bad' | 'muted'
}

export type GatewayIndicator = 'online' | 'offline' | 'degraded'

export type FieldViewMode = 'classic' | 'mission' | 'guided'

// Theme types
export type ThemeName = "default" | "highContrast" | "muted" | "dark"

export interface ColorTheme {
  // Transcript colors
  user: string
  assistant: string
  thinking: string
  tool: string
  error: string
  system: string

  // UI elements
  selected: string
  unselected: string
  bannerPrimary: string
  bannerSecondary: string
  statusReady: string
  statusNeedsSetup: string
  statusConnecting: string
  statusConnected: string

  // Forms and inputs
  formPrompt: string
  formHelp: string
  formPreview: string

  // System notifications
  notificationSuccess: string
  notificationError: string
  notificationWarning: string
  notificationInfo: string

  // Spinner
  spinner: string
}