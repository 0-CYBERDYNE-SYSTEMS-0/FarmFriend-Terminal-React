import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { type ThemeName, getTheme, getCurrentTheme, type ColorTheme } from "../config/colors";

interface ThemeContextValue {
  themeName: ThemeName;
  theme: ColorTheme;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeName, setThemeNameState] = useState<ThemeName>(getCurrentTheme());
  const [theme, setTheme] = useState<ColorTheme>(getTheme(themeName));

  // Update theme object when theme name changes
  useEffect(() => {
    setTheme(getTheme(themeName));
  }, [themeName]);

  const value: ThemeContextValue = {
    themeName,
    theme,
    setThemeName: (name: ThemeName) => {
      setThemeNameState(name);
      // Store preference in localStorage
      localStorage.setItem("ff-terminal-theme", name);
    },
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

/**
 * Hook to get a specific color class from the theme
 */
export function useColor<K extends keyof ColorTheme>(role: K): string {
  const { theme } = useTheme();
  return theme[role];
}
