import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { THEME_STORAGE_KEY, ThemeContext, type ResolvedTheme, type Theme, type ThemeContextValue } from './themeContext'

// Reemplaza a next-themes: el tema inicial lo aplica un script de index.html antes del primer pintado.

const DARK_QUERY = '(prefers-color-scheme: dark)'

function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
  } catch {
    return 'system'
  }
}

function subscribeToSystemTheme(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function systemPrefersDark() {
  return window.matchMedia(DARK_QUERY).matches
}

/** Apaga las transiciones durante el cambio para que la pantalla no cambie a pedazos. */
function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  const pause = document.createElement('style')
  pause.textContent = '*,*::before,*::after{transition:none!important}'
  document.head.appendChild(pause)

  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved

  // Forzar el calculo de estilos antes de reactivar las transiciones.
  void window.getComputedStyle(document.body).opacity
  requestAnimationFrame(() => pause.remove())
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const systemDark = useSyncExternalStore(subscribeToSystemTheme, systemPrefersDark, () => false)
  const resolvedTheme: ResolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  // Layout effect: el cambio tiene que verse antes del siguiente pintado.
  useLayoutEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  // Si se cambia el tema en otra pestana, esta lo sigue.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) setThemeState(readStoredTheme())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Sin almacenamiento el tema no se recuerda al recargar.
    }
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme])

  return <ThemeContext value={value}>{children}</ThemeContext>
}
