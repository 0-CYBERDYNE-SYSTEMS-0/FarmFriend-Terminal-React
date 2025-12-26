/**
 * Color Theme System for FF-Terminal CLI
 * Provides semantic color roles that can be swapped for different themes
 */

export type ColorToken =
  | "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white"
  | "blackBright" | "redBright" | "greenBright" | "yellowBright"
  | "blueBright" | "magentaBright" | "cyanBright" | "whiteBright"
  | "gray";

export type ThemeName = "default" | "highContrast" | "muted";

/**
 * Color theme definitions
 */
export const THEMES: Record<ThemeName, ColorTheme> = {
  default: {
    // Transcript colors
    user: "cyanBright",
    assistant: "whiteBright",
    thinking: "magenta",
    tool: "yellow",
    error: "redBright",
    system: "gray",

    // Todo status
    todoSummary: "yellow",
    todoCompleted: "green",
    todoInProgress: "yellow",
    todoPending: "gray",
    todoHighPriority: "redBright",
    todoLowPriority: "gray",
    
    // Subagent swarm
    subagentSummary: "cyan",
    subagentRunning: "yellow",
    subagentDone: "green",
    subagentError: "redBright",
    subagentAction: "cyan",
    subagentMeta: "gray",
    
    // Plan panel
    planObjective: "cyanBright",
    planProgress: "gray",
    planBlocked: "red",
    planIconCompleted: "green",
    planIconInProgress: "yellow",
    
    // UI elements
    selected: "cyan",
    unselected: "white",
    bannerPrimary: "cyanBright",
    bannerSecondary: "greenBright",
    statusReady: "green",
    statusNeedsSetup: "yellow",
    statusConnecting: "yellow",
    statusConnected: "gray",
    
    // Forms and inputs
    formPrompt: "green",
    formHelp: "gray",
    formPreview: "cyanBright",
    
    // System notifications
    notificationSuccess: "green",
    notificationError: "redBright",
    notificationWarning: "yellow",
    notificationInfo: "gray",
    
    // Spinner
    spinner: "yellow",
  },
  
  highContrast: {
    // Maximize contrast for accessibility
    user: "whiteBright",
    assistant: "whiteBright",
    thinking: "whiteBright",
    tool: "whiteBright",
    error: "redBright",
    system: "whiteBright",
    
    todoSummary: "whiteBright",
    todoCompleted: "greenBright",
    todoInProgress: "yellowBright",
    todoPending: "whiteBright",
    todoHighPriority: "redBright",
    todoLowPriority: "whiteBright",
    
    subagentSummary: "whiteBright",
    subagentRunning: "yellowBright",
    subagentDone: "greenBright",
    subagentError: "redBright",
    subagentAction: "whiteBright",
    subagentMeta: "whiteBright",
    
    planObjective: "whiteBright",
    planProgress: "whiteBright",
    planBlocked: "redBright",
    planIconCompleted: "greenBright",
    planIconInProgress: "yellowBright",
    
    selected: "whiteBright",
    unselected: "white",
    bannerPrimary: "whiteBright",
    bannerSecondary: "whiteBright",
    statusReady: "greenBright",
    statusNeedsSetup: "yellowBright",
    statusConnecting: "yellowBright",
    statusConnected: "whiteBright",
    
    formPrompt: "whiteBright",
    formHelp: "whiteBright",
    formPreview: "whiteBright",
    
    notificationSuccess: "greenBright",
    notificationError: "redBright",
    notificationWarning: "yellowBright",
    notificationInfo: "whiteBright",
    
    spinner: "yellowBright",
  },
  
  muted: {
    // Subtle colors for reduced visual noise
    user: "cyan",
    assistant: "white",
    thinking: "magenta",
    tool: "yellow",
    error: "red",
    system: "gray",

    todoSummary: "yellow",
    todoCompleted: "green",
    todoInProgress: "yellow",
    todoPending: "gray",
    todoHighPriority: "red",
    todoLowPriority: "gray",

    subagentSummary: "cyan",
    subagentRunning: "yellow",
    subagentDone: "green",
    subagentError: "red",
    subagentAction: "cyan",
    subagentMeta: "gray",

    planObjective: "cyan",
    planProgress: "gray",
    planBlocked: "red",
    planIconCompleted: "green",
    planIconInProgress: "yellow",

    selected: "cyan",
    unselected: "gray",
    bannerPrimary: "cyan",
    bannerSecondary: "green",
    statusReady: "green",
    statusNeedsSetup: "yellow",
    statusConnecting: "yellow",
    statusConnected: "gray",

    formPrompt: "green",
    formHelp: "gray",
    formPreview: "cyan",

    notificationSuccess: "green",
    notificationError: "red",
    notificationWarning: "yellow",
    notificationInfo: "gray",
    
    spinner: "yellow",
  },
};

export interface ColorTheme {
  // Transcript colors
  user: ColorToken;
  assistant: ColorToken;
  thinking: ColorToken;
  tool: ColorToken;
  error: ColorToken;
  system: ColorToken;
  
  // Todo status
  todoSummary: ColorToken;
  todoCompleted: ColorToken;
  todoInProgress: ColorToken;
  todoPending: ColorToken;
  todoHighPriority: ColorToken;
  todoLowPriority: ColorToken;
  
  // Subagent swarm
  subagentSummary: ColorToken;
  subagentRunning: ColorToken;
  subagentDone: ColorToken;
  subagentError: ColorToken;
  subagentAction: ColorToken;
  subagentMeta: ColorToken;
  
  // Plan panel
  planObjective: ColorToken;
  planProgress: ColorToken;
  planBlocked: ColorToken;
  planIconCompleted: ColorToken;
  planIconInProgress: ColorToken;
  
  // UI elements
  selected: ColorToken;
  unselected: ColorToken;
  bannerPrimary: ColorToken;
  bannerSecondary: ColorToken;
  statusReady: ColorToken;
  statusNeedsSetup: ColorToken;
  statusConnecting: ColorToken;
  statusConnected: ColorToken;
  
  // Forms and inputs
  formPrompt: ColorToken;
  formHelp: ColorToken;
  formPreview: ColorToken;
  
  // System notifications
  notificationSuccess: ColorToken;
  notificationError: ColorToken;
  notificationWarning: ColorToken;
  notificationInfo: ColorToken;
  
  // Spinner
  spinner: ColorToken;
}

/**
 * Get current theme from environment or default
 */
export function getCurrentTheme(): ThemeName {
  const themeEnv = String(process.env.FF_THEME || "").trim().toLowerCase();
  return (themeEnv === "highcontrast" || themeEnv === "high_contrast") ? "highContrast"
    : themeEnv === "muted" ? "muted"
    : "default";
}

/**
 * Get color theme object for current or specified theme
 */
export function getTheme(themeName?: ThemeName): ColorTheme {
  return THEMES[themeName ?? getCurrentTheme()];
}

/**
 * Get a specific color token from current theme
 */
export function color<K extends keyof ColorTheme>(role: K): ColorToken {
  return getTheme()[role];
}
