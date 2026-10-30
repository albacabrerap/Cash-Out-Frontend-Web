import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { ThemeToggle } from './ThemeToggle'

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))

function renderToggle() {
  render(
    <ThemeProvider>
      <input aria-label="Buscar" />
      <ThemeToggle />
    </ThemeProvider>,
  )
}

const isDark = () => document.documentElement.classList.contains('dark')

describe('ThemeToggle', () => {
  beforeEach(() => {
    // jsdom no trae matchMedia; el sistema queda en claro.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    localStorage.setItem('cashout.theme', 'light')
    document.documentElement.classList.remove('dark')
  })

  it('un clic alterna entre claro y oscuro y lo recuerda', async () => {
    renderToggle()
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar a tema oscuro' }))

    expect(isDark()).toBe(true)
    expect(localStorage.getItem('cashout.theme')).toBe('dark')
    expect(screen.getByRole('button', { name: 'Cambiar a tema claro' })).toBeInTheDocument()
  })

  it('la tecla D tambien lo cambia, pero no mientras se escribe', async () => {
    renderToggle()
    await userEvent.keyboard('d')
    expect(isDark()).toBe(true)

    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar' }), 'd')
    expect(isDark()).toBe(true)
  })
})
