import { use } from 'react'
import { ThemeContext, type ThemeContextValue } from '@/contexts/themeContext'

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext)
  if (!context) {
    throw new Error('useTheme tiene que usarse dentro de <ThemeProvider>.')
  }
  return context
}
