import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import type { ThemeName, ColorTheme } from "@/store/types"

interface ThemeContextValue {
  themeName: ThemeName
  theme: ColorTheme
  setThemeName: (name: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

// Default theme configurations
export const THEMES: Record<ThemeName, ColorTheme> = {
  default: {
    // Transcript colors
    user: "text-cyan-400",
    assistant: "text-white",
    thinking: "text-purple-400",
    tool: "text-yellow-400",
    error: "text-red-400",
    system: "text-gray-400",

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
    user: "text-white",
    assistant: "text-white",
    thinking: "text-white",
    tool: "text-white",
    error: "text-red-300",
    system: "text-white",

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
    user: "text-cyan-500",
    assistant: "text-gray-200",
    thinking: "text-purple-500",
    tool: "text-yellow-500",
    error: "text-red-500",
    system: "text-gray-600",

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

  dark: {
    user: "text-cyan-400",
    assistant: "text-gray-100",
    thinking: "text-pink-400",
    tool: "text-amber-400",
    error: "text-red-400",
    system: "text-gray-500",

    selected: "text-cyan-400",
    unselected: "text-gray-300",
    bannerPrimary: "text-cyan-400",
    bannerSecondary: "text-emerald-400",
    statusReady: "text-emerald-400",
    statusNeedsSetup: "text-amber-400",
    statusConnecting: "text-blue-400",
    statusConnected: "text-gray-400",

    formPrompt: "text-emerald-400",
    formHelp: "text-gray-500",
    formPreview: "text-cyan-400",

    notificationSuccess: "text-emerald-400",
    notificationError: "text-red-400",
    notificationWarning: "text-amber-400",
    notificationInfo: "text-blue-400",

    spinner: "text-amber-400",
  },
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeName, setThemeNameState] = useState<ThemeName>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("fieldview-theme")
      if (stored && stored in THEMES) {
        return stored as ThemeName
      }
    }
    return "default"
  })
  
  const [theme, setTheme] = useState<ColorTheme>(THEMES[themeName])

  // Update theme object when theme name changes
  useEffect(() => {
    setTheme(THEMES[themeName])
  }, [themeName])

  const value: ThemeContextValue = {
    themeName,
    theme,
    setThemeName: (name: ThemeName) => {
      setThemeNameState(name)
      // Store preference in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("fieldview-theme", name)
      }
    },
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}

/**
 * Hook to get a specific color class from theme
 */
export function useColor<K extends keyof ColorTheme>(role: K): string {
  const { theme } = useTheme()
  return theme[role]
}