import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { ThemeProvider } from './ThemeProvider'
import { THEME_STORAGE_KEY } from './themeContext'

/** jsdom no trae matchMedia. Este simula la preferencia del sistema operativo. */
function mockSystemTheme(dark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: dark && query === '(prefers-color-scheme: dark)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider>{children}</ThemeProvider>
const html = () => document.documentElement

describe('ThemeProvider', () => {
  afterEach(() => {
    html().classList.remove('dark')
    html().style.colorScheme = ''
  })

  it('sin eleccion guardada sigue al sistema', () => {
    mockSystemTheme(true)
    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.theme).toBe('system')
    expect(result.current.resolvedTheme).toBe('dark')
    expect(html()).toHaveClass('dark')
  })

  it('al elegir un tema lo aplica y lo recuerda', () => {
    mockSystemTheme(true)
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => result.current.setTheme('light'))

    expect(html()).not.toHaveClass('dark')
    expect(html().style.colorScheme).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('arranca con la eleccion guardada aunque el sistema diga otra cosa', () => {
    mockSystemTheme(false)
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.resolvedTheme).toBe('dark')
    expect(html()).toHaveClass('dark')
  })

  it('un valor guardado que no reconoce cae en "system"', () => {
    mockSystemTheme(false)
    localStorage.setItem(THEME_STORAGE_KEY, 'morado')
    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.theme).toBe('system')
  })
})
