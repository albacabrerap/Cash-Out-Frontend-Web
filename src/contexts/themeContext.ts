import { createContext } from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme(theme: Theme): void
}

/** index.html lee esta misma clave antes de pintar. */
export const THEME_STORAGE_KEY = 'cashout.theme'

export const ThemeContext = createContext<ThemeContextValue | null>(null)
