/**
 * Color Theme System for FF-Terminal Web Client
 * Maps semantic color roles to Tailwind CSS classes
 * Inspired by CLI colorTheme.ts but adapted for web
 */

export type ThemeName = "default" | "highContrast" | "muted";

export interface ColorTheme {
  // Transcript colors
  user: string;
  assistant: string;
  thinking: string;
  tool: string;
  error: string;
  system: string;

  // Todo status
  todoSummary: string;
  todoCompleted: string;
  todoInProgress: string;
  todoPending: string;
  todoHighPriority: string;
  todoLowPriority: string;

  // Subagent swarm
  subagentSummary: string;
  subagentRunning: string;
  subagentDone: string;
  subagentError: string;
  subagentAction: string;
  subagentMeta: string;

  // Plan panel
  planObjective: string;
  planProgress: string;
  planBlocked: string;
  planIconCompleted: string;
  planIconInProgress: string;

  // UI elements
  selected: string;
  unselected: string;
  bannerPrimary: string;
  bannerSecondary: string;
  statusReady: string;
  statusNeedsSetup: string;
  statusConnecting: string;
  statusConnected: string;

  // Forms and inputs
  formPrompt: string;
  formHelp: string;
  formPreview: string;

  // System notifications
  notificationSuccess: string;
  notificationError: string;
  notificationWarning: string;
  notificationInfo: string;

  // Spinner
  spinner: string;
}

/**
 * Theme definitions using Tailwind CSS color classes
 */
export const THEMES: Record<ThemeName, ColorTheme> = {
  default: {
    // Transcript colors
    user: "text-cyan-400",
    assistant: "text-white",
    thinking: "text-purple-400",
    tool: "text-yellow-400",
    error: "text-red-400",
    system: "text-gray-400",

    // Todo status
    todoSummary: "text-yellow-400",
    todoCompleted: "text-green-400",
    todoInProgress: "text-yellow-400",
    todoPending: "text-gray-500",
    todoHighPriority: "text-red-400",
    todoLowPriority: "text-gray-600",

    // Subagent swarm
    subagentSummary: "text-cyan-400",
    subagentRunning: "text-yellow-400",
    subagentDone: "text-green-400",
    subagentError: "text-red-400",
    subagentAction: "text-cyan-400",
    subagentMeta: "text-gray-500",

    // Plan panel
    planObjective: "text-cyan-400",
    planProgress: "text-gray-400",
    planBlocked: "text-red-500",
    planIconCompleted: "text-green-400",
    planIconInProgress: "text-yellow-400",

    // UI elements
    selected: "text-cyan-400",
    unselected: "text-white",
    bannerPrimary: "text-cyan-400",
    bannerSecondary: "text-green-400",
    statusReady: "text-green-400",
    statusNeedsSetup: "text-yellow-400",
    statusConnecting: "text-yellow-400",
    statusConnected: "text-gray-400",

    // Forms and inputs
    formPrompt: "text-green-400",
    formHelp: "text-gray-400",
    formPreview: "text-cyan-400",

    // System notifications
    notificationSuccess: "text-green-400",
    notificationError: "text-red-400",
    notificationWarning: "text-yellow-400",
    notificationInfo: "text-gray-400",

    // Spinner
    spinner: "text-yellow-400",
  },

  highContrast: {
    // Maximize contrast for accessibility
    user: "text-white",
    assistant: "text-white",
    thinking: "text-white",
    tool: "text-white",
    error: "text-red-300",
    system: "text-white",

    todoSummary: "text-white",
    todoCompleted: "text-green-300",
    todoInProgress: "text-yellow-300",
    todoPending: "text-white",
    todoHighPriority: "text-red-300",
    todoLowPriority: "text-white",

    subagentSummary: "text-white",
    subagentRunning: "text-yellow-300",
    subagentDone: "text-green-300",
    subagentError: "text-red-300",
    subagentAction: "text-white",
    subagentMeta: "text-white",

    planObjective: "text-white",
    planProgress: "text-white",
    planBlocked: "text-red-300",
    planIconCompleted: "text-green-300",
    planIconInProgress: "text-yellow-300",

    selected: "text-white",
    unselected: "text-gray-200",
    bannerPrimary: "text-white",
    bannerSecondary: "text-white",
    statusReady: "text-green-300",
    statusNeedsSetup: "text-yellow-300",
    statusConnecting: "text-yellow-300",
    statusConnected: "text-white",

    formPrompt: "text-white",
    formHelp: "text-white",
    formPreview: "text-white",

    notificationSuccess: "text-green-300",
    notificationError: "text-red-300",
    notificationWarning: "text-yellow-300",
    notificationInfo: "text-white",

    spinner: "text-yellow-300",
  },

  muted: {
    // Subtle colors for reduced visual noise
    user: "text-cyan-500",
    assistant: "text-gray-200",
    thinking: "text-purple-500",
    tool: "text-yellow-500",
    error: "text-red-500",
    system: "text-gray-600",

    todoSummary: "text-yellow-500",
    todoCompleted: "text-green-500",
    todoInProgress: "text-yellow-500",
    todoPending: "text-gray-600",
    todoHighPriority: "text-red-500",
    todoLowPriority: "text-gray-700",

    subagentSummary: "text-cyan-500",
    subagentRunning: "text-yellow-500",
    subagentDone: "text-green-500",
    subagentError: "text-red-500",
    subagentAction: "text-cyan-500",
    subagentMeta: "text-gray-600",

    planObjective: "text-cyan-500",
    planProgress: "text-gray-600",
    planBlocked: "text-red-500",
    planIconCompleted: "text-green-500",
    planIconInProgress: "text-yellow-500",

    selected: "text-cyan-500",
    unselected: "text-gray-400",
    bannerPrimary: "text-cyan-500",
    bannerSecondary: "text-green-500",
    statusReady: "text-green-500",
    statusNeedsSetup: "text-yellow-500",
    statusConnecting: "text-yellow-500",
    statusConnected: "text-gray-600",

    formPrompt: "text-green-500",
    formHelp: "text-gray-600",
    formPreview: "text-cyan-500",

    notificationSuccess: "text-green-500",
    notificationError: "text-red-500",
    notificationWarning: "text-yellow-500",
    notificationInfo: "text-gray-600",

    spinner: "text-yellow-500",
  },
};

/**
 * Get current theme from environment or default
 */
export function getCurrentTheme(): ThemeName {
  // Check for environment variable (can be set server-side)
  if (typeof window !== "undefined" && (window as any).__FF_THEME__) {
    const theme = String((window as any).__FF_THEME__).trim().toLowerCase();
    if (theme === "highcontrast" || theme === "high_contrast") return "highContrast";
    if (theme === "muted") return "muted";
  }
  return "default";
}

/**
 * Get color theme object for current or specified theme
 */
export function getTheme(themeName?: ThemeName): ColorTheme {
  return THEMES[themeName ?? getCurrentTheme()];
}

/**
 * Get a specific color class from current theme
 */
export function getColor<K extends keyof ColorTheme>(role: K, themeName?: ThemeName): string {
  return getTheme(themeName)[role];
}

/**
 * Utility to create dimmed version of a color class
 * Adds opacity to make text appear subtle
 */
export function getDimmedClass(colorClass: string): string {
  return `${colorClass} opacity-60`;
}
