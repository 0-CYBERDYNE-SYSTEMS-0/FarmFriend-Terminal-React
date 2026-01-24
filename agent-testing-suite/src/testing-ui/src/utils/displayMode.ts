export type DisplayMode = "clean" | "verbose";

const normalizeDisplayMode = (value?: string | null): DisplayMode =>
  value && value.trim().toLowerCase() === "verbose" ? "verbose" : "clean";

export const getDisplayMode = (): DisplayMode => {
  if (typeof window === "undefined") return "clean";

  const params = new URLSearchParams(window.location.search);
  const paramValue = params.get("display-mode") || params.get("displayMode");
  const envValue = (import.meta as any)?.env?.VITE_DISPLAY_MODE as string | undefined;

  let storedValue: string | null = null;
  try {
    storedValue = window.localStorage.getItem("ff-display-mode");
  } catch {
    storedValue = null;
  }

  const resolved = normalizeDisplayMode(paramValue || storedValue || envValue);

  if (paramValue) {
    try {
      window.localStorage.setItem("ff-display-mode", resolved);
    } catch {
      // ignore storage failures
    }
  }

  return resolved;
};
