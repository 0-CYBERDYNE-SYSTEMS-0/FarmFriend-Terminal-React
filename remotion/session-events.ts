/**
 * Unified Session Events for FF Terminal Demo
 * This defines the complete timeline of a realistic FF Terminal session
 * All components synchronize to these events
 */

export interface SessionEvent {
  frame: number;            // When this event starts
  type: EventType;          // Event type
  text?: string;            // Terminal text to display
  message?: string;         // Agent thinking message
  tool?: ToolInfo;          // Tool call information
  artifact?: ArtifactInfo;  // Artifact information
  output?: string[];        // Output lines to stream
  duration?: number;         // How long this event lasts (frames)
}

export enum EventType {
  // Terminal events
  USER_PROMPT = 'user_prompt',
  AGENT_THINKING = 'agent_thinking',
  TOOL_CALL = 'tool_call',
  TOOL_OUTPUT = 'tool_output',
  ARTIFACT_CREATED = 'artifact_created',
  SYSTEM_MESSAGE = 'system_message',
  SUCCESS_MESSAGE = 'success_message',
  ERROR_MESSAGE = 'error_message',

  // Component triggers (pop-ups)
  AGENT_THINKING_POPUP = 'agent_thinking_popup',
  TOOL_CALL_POPUP = 'tool_call_popup',
  ARTIFACT_POPUP = 'artifact_popup',
}

export interface ToolInfo {
  name: string;            // Tool name (read, exec, web_search, etc.)
  icon: string;             // Emoji icon
  description: string;      // What the tool is doing
  command?: string;         // Command being run
  path?: string;            // File path being accessed
  params?: Record<string, any>;  // Tool parameters
  duration?: string;        // Execution duration (for display)
  size?: string;            // File/return size (for display)
}

export interface ArtifactInfo {
  type: string;             // Artifact type (Report, Config, etc.)
  icon: string;             // Emoji icon
  file: string;             // Filename
  content: string;          // Preview content
  tags: string[];           // Tags to display
}

/**
 * Complete Session Timeline
 * Total duration: 60 seconds (1800 frames @ 30fps)
 *
 * Flow:
 * 0-120:      Branding/title intro (terminal hidden)
 * 120-240:    User prompt appears, agent starts thinking
 * 240-420:    First tool call (read sensor data) with diagnostics
 * 420-600:    Network analysis and sensor reset attempt
 * 600-720:    Artifact creation (incident report)
 * 720-840:    Final success message + artifact preview
 * 840-1440:   Continued terminal activity
 * 1440-1800:  CTA and outro (terminal fades out)
 */
export const SESSION_EVENTS: SessionEvent[] = [
  // ===== USER PROMPT (120-240) =====
  { frame: 120, type: EventType.USER_PROMPT, text: 'Check irrigation sensors in Field 7 — 3 sensors showing offline', duration: 120 },

  // ===== AGENT THINKING (240-420) =====
  {
    frame: 240,
    type: EventType.AGENT_THINKING,
    message: 'Analyzing sensor connectivity status...',
    duration: 60,
  },
  {
    frame: 300,
    type: EventType.AGENT_THINKING,
    message: 'Cross-referencing network topology...',
    duration: 60,
  },
  {
    frame: 360,
    type: EventType.AGENT_THINKING,
    message: 'Identifying failure point: relay node near pump house',
    duration: 60,
  },

  // ===== TOOL CALL: read (420-540) =====
  {
    frame: 420,
    type: EventType.TOOL_CALL,
    text: '> read /sensors/field_7/sensor_logs.json',
    tool: {
      name: 'read',
      icon: '📄',
      description: 'Reading sensor diagnostic logs',
      path: '/sensors/field_7/sensor_logs.json',
      duration: '0.8s',
      size: '45.2 MB',
    },
    duration: 120,
  },

  // ===== TOOL OUTPUT: read results (540-660) =====
  {
    frame: 540,
    type: EventType.TOOL_OUTPUT,
    output: [
      '{',
      '  "sensors": [',
      '    { "id": "F7-S1", "status": "online", "last_heartbeat": "2026-01-22T14:50:23Z" },',
      '    { "id": "F7-S2", "status": "online", "last_heartbeat": "2026-01-22T14:50:21Z" },',
      '    { "id": "F7-S3", "status": "offline", "last_heartbeat": "2026-01-22T13:15:42Z",',
      '      "error": "connection_timeout" },',
      '    { "id": "F7-S4", "status": "offline", "last_heartbeat": "2026-01-22T13:16:05Z",',
      '      "error": "connection_timeout" },',
      '    { "id": "F7-S5", "status": "offline", "last_heartbeat": "2026-01-22T13:16:18Z",',
      '      "error": "hardware_failure" }',
      '  ],',
      '  "network_path": ["gateway", "relay-node-pump-house"],',
      '  "anomaly_detected": "relay-node-pump-house not responding"',
      '}',
    ],
    duration: 120,
  },

  // ===== TOOL CALL: exec (ping test) (660-780) =====
  {
    frame: 660,
    type: EventType.TOOL_CALL,
    text: '> exec ping -c 5 relay-node-pump-house.local',
    tool: {
      name: 'exec',
      icon: '🔨',
      description: 'Testing network connectivity to relay node',
      command: 'ping -c 5 relay-node-pump-house.local',
      duration: '2.1s',
      size: 'N/A',
    },
    duration: 120,
  },

  // ===== TOOL OUTPUT: ping results (780-900) =====
  {
    frame: 780,
    type: EventType.TOOL_OUTPUT,
    output: [
      'PING relay-node-pump-house.local (192.168.1.50): 56 data bytes',
      '64 bytes from 192.168.1.50: icmp_seq=0 ttl=64 time=12.4 ms',
      '64 bytes from 192.168.1.50: icmp_seq=1 ttl=64 time=11.8 ms',
      '64 bytes from 192.168.1.50: icmp_seq=2 ttl=64 time=13.2 ms',
      '64 bytes from 192.168.1.50: icmp_seq=3 ttl=64 time=11.9 ms',
      '64 bytes from 192.168.1.50: icmp_seq=4 ttl=64 time=12.1 ms',
      '',
      '--- relay-node-pump-house.local ping statistics ---',
      '5 packets transmitted, 5 packets received, 0.0% packet loss',
      'round-trip min/avg/max/stddev = 11.8/12.3/13.2/0.5 ms',
      '',
      '✓ Relay node responding — attempting sensor reset...',
    ],
    duration: 120,
  },

  // ===== TOOL CALL: exec (sensor reset) (900-1020) =====
  {
    frame: 900,
    type: EventType.TOOL_CALL,
    text: '> exec ssh sensor-node-3 "systemctl restart sensord && systemctl restart wirelessd"',
    tool: {
      name: 'exec',
      icon: '🔨',
      description: 'Restarting sensor services on affected nodes',
      command: 'ssh sensor-node-3 "systemctl restart sensord && systemctl restart wirelessd"',
      duration: '3.4s',
      size: 'N/A',
    },
    duration: 120,
  },

  // ===== TOOL OUTPUT: reset results (1020-1140) =====
  {
    frame: 1020,
    type: EventType.TOOL_OUTPUT,
    output: [
      '[sensor-node-3] Running systemctl restart sensord...',
      '[sensor-node-3] ✓ sensord.service restarted',
      '[sensor-node-3] Running systemctl restart wirelessd...',
      '[sensor-node-3] ✓ wirelessd.service restarted',
      '',
      '[sensor-node-4] Running systemctl restart sensord...',
      '[sensor-node-4] ✓ sensord.service restarted',
      '',
      '✓ Sensors F7-S3 and F7-S4 back online',
      '',
      '⚠ Sensor F7-S5 hardware failure detected',
      '→ Created replacement part order (PO-2026-0147)',
      '→ Estimated delivery: 3-5 business days',
    ],
    duration: 120,
  },

  // ===== TOOL CALL: write (artifact creation) (1140-1260) =====
  {
    frame: 1140,
    type: EventType.TOOL_CALL,
    text: '> write memory/incidents/2026-01-22_field7_sensors.md',
    tool: {
      name: 'write',
      icon: '✏️',
      description: 'Creating incident report for sensor downtime',
      path: 'memory/incidents/2026-01-22_field7_sensors.md',
      duration: '0.6s',
      size: '12 KB',
    },
    duration: 120,
  },

  // ===== SUCCESS MESSAGE (1260-1380) =====
  {
    frame: 1260,
    type: EventType.ARTIFACT_CREATED,
    text: '✓ Incident report created: 2026-01-22_field7_sensors.md',
    artifact: {
      type: 'INCIDENT REPORT',
      icon: '📋',
      file: '2026-01-22_field7_sensors.md',
      content: `# Sensor Downtime Incident - Field 7

**Date:** 2026-01-22
**Severity:** Moderate
**Affected Sensors:** 3 of 5 (F7-S3, F7-S4, F7-S5)

## Root Cause
Network relay node near pump house became unresponsive, causing 3 sensors to lose connectivity.

## Resolution
1. Ping test confirmed relay node responsiveness
2. SSH commands restarted sensor services on nodes 3 and 4
3. Both sensors (F7-S3, F7-S4) now back online
4. Sensor F7-S5 hardware failure identified — replacement ordered

## Downtime Summary
- Total downtime: 2 hours 34 minutes
- Data points missed: 12
- Impact: Low — normal irrigation resumed

## Follow-up
Monitor sensors for next 24 hours for stability.
Hardware replacement arriving in 3-5 business days.

---
*Automatically generated by Farm Friend Terminal*`,
      tags: ['Incident', 'Sensors', 'Resolved'],
    },
    duration: 120,
  },

  // ===== FINAL SUCCESS (1380-1500) =====
  {
    frame: 1380,
    type: EventType.SUCCESS_MESSAGE,
    text: '✓ All irrigation sensors operational. 3 issues resolved in 2 minutes.',
    duration: 120,
  },
];

/**
 * Helper: Get the current event at a given frame
 */
export function getCurrentEvent(frame: number): SessionEvent | null {
  for (let i = SESSION_EVENTS.length - 1; i >= 0; i--) {
    const event = SESSION_EVENTS[i];
    const eventEnd = event.duration ? event.frame + event.duration : frame + 1;
    if (frame >= event.frame && frame < eventEnd) {
      return event;
    }
  }
  return null;
}

/**
 * Helper: Get all events that should trigger pop-ups at a given frame
 */
export function getPopupEvents(frame: number): {
  agentThinking?: SessionEvent;
  toolCall?: SessionEvent;
  artifact?: SessionEvent;
} {
  const agentThinking = SESSION_EVENTS.find(e =>
    e.type === EventType.AGENT_THINKING_POPUP &&
    frame >= e.frame &&
    (!e.duration || frame < e.frame + e.duration)
  );

  const toolCall = SESSION_EVENTS.find(e =>
    e.type === EventType.TOOL_CALL_POPUP &&
    frame >= e.frame &&
    (!e.duration || frame < e.frame + e.duration)
  );

  const artifact = SESSION_EVENTS.find(e =>
    e.type === EventType.ARTIFACT_POPUP &&
    frame >= e.frame &&
    (!e.duration || frame < e.frame + e.duration)
  );

  return { agentThinking, toolCall, artifact };
}

/**
 * Color constants for terminal output
 */
export const TERMINAL_COLORS = {
  PROMPT: '#00ff88',           // Green
  USER_INPUT: '#e2e8f0',       // White-ish
  AGENT_RESPONSE: '#00d4ff',   // Cyan
  TOOL_CALL: '#ff6b6b',         // Red
  TOOL_OUTPUT: '#a0aec0',       // Gray
  SUCCESS: '#00ff88',          // Green
  ERROR: '#ff6b6b',            // Red
  WARNING: '#ffd700',          // Yellow
  SYSTEM: '#718096',           // Dark gray
  JSON_KEY: '#63b3ed',         // Light blue
  JSON_STRING: '#faf089',      // Yellow
  JSON_NUMBER: '#f6ad55',      // Orange
  JSON_BOOLEAN: '#68d391',     // Green
} as const;
