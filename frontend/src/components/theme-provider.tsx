"use client";

import {
  ThemeProvider as AppThemeProvider,
  type ThemeProviderProps,
} from "@/lib/theme";

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  return <AppThemeProvider {...props}>{children}</AppThemeProvider>;
}
