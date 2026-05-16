"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: string) => void;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  themes: Theme[];
};

export type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableSystem?: boolean;
  enableColorScheme?: boolean;
  attribute?: "class";
  disableTransitionOnChange?: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEMES: Theme[] = ["light", "dark", "system"];
const STORAGE_KEY = "theme";
const themeListeners = new Set<() => void>();

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(storageKey: string, fallback: Theme): Theme {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function applyTheme(theme: ResolvedTheme, enableColorScheme: boolean) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);

  if (enableColorScheme) {
    root.style.colorScheme = theme;
  }
}

function emitThemeChange() {
  for (const listener of themeListeners) listener();
}

function subscribeThemeStorage(storageKey: string, callback: () => void) {
  themeListeners.add(callback);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey) callback();
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    themeListeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function subscribeSystemTheme(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = STORAGE_KEY,
  enableSystem = true,
  enableColorScheme = true,
}: ThemeProviderProps) {
  const theme: Theme = useSyncExternalStore(
    useCallback(
      (callback) => subscribeThemeStorage(storageKey, callback),
      [storageKey],
    ),
    useCallback(() => getStoredTheme(storageKey, defaultTheme), [
      defaultTheme,
      storageKey,
    ]),
    () => defaultTheme,
  );
  const systemTheme: ResolvedTheme = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemTheme,
    () => "light",
  );

  const resolvedTheme: ResolvedTheme =
    theme === "system" && enableSystem ? systemTheme : (theme as ResolvedTheme);

  useEffect(() => {
    applyTheme(resolvedTheme, enableColorScheme);
  }, [enableColorScheme, resolvedTheme]);

  const setTheme = useCallback(
    (nextTheme: string) => {
      if (
        nextTheme !== "light" &&
        nextTheme !== "dark" &&
        nextTheme !== "system"
      ) {
        return;
      }

      try {
        window.localStorage.setItem(storageKey, nextTheme);
      } catch {
        // Ignore storage failures; the in-memory theme still updates.
      }
      emitThemeChange();
    },
    [storageKey],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme,
      themes: enableSystem ? THEMES : ["light", "dark"],
    }),
    [enableSystem, resolvedTheme, setTheme, systemTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return context;
}
