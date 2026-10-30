import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { useLiveRoom } from '@/hooks/useLiveRoom'
import { portfolioGameService } from '@/services/portfolioGameService'
import type { PortfolioGamePlayer, PortfolioGameView } from '@/types/portfolioGame'
import PortfolioGamePlayerPage from './PortfolioGamePlayerPage'

vi.mock('@/hooks/useLiveRoom', () => ({ useLiveRoom: vi.fn() }))
vi.mock('@/services/portfolioGameService', () => ({
  portfolioGameService: { join: vi.fn(), allocate: vi.fn(), unready: vi.fn() },
}))

const room = vi.mocked(useLiveRoom)
const allocate = vi.mocked(portfolioGameService.allocate)
const apply = vi.fn()

const me: PortfolioGamePlayer = { id: 1, rank: 1, name: 'Valeria', ready: false, weights: {}, result: null, me: true }
const sector = (key: string, name: string, kind: string) => ({ key, name, kind, symbol: key.toUpperCase(), description: '' })
const lobby: PortfolioGameView = {
  code: 'KX7Q2M',
  phase: 'LOBBY',
  host: false,
  joined: true,
  maxPlayers: 40,
  startValue: 10_000,
  step: 0,
  totalSteps: 5,
  sectors: [sector('tech', 'Tecnología', 'Crecimiento'), sector('gold', 'Oro', 'Refugio'), sector('bonds', 'Bonos largos', 'Renta fija')],
  stages: [],
  ranking: [me],
  me,
  benchmark: null,
}

function renderPage(view: PortfolioGameView) {
  room.mockReturnValue({ view, connection: 'live', apply })
  const router = createMemoryRouter([{ path: '/minijuegos/arma-tu-portafolio/:code', element: <PortfolioGamePlayerPage /> }], {
    initialEntries: ['/minijuegos/arma-tu-portafolio/KX7Q2M'],
  })
  render(<RouterProvider router={router} />)
}

describe('PortfolioGamePlayerPage', () => {
  it('reparte el 100 % de 10 en 10 y queda listo', async () => {
    allocate.mockResolvedValue(lobby)
    renderPage(lobby)

    expect(screen.getByRole('button', { name: 'Asigna el 100 % (faltan 100 %)' })).toBeDisabled()
    for (let i = 0; i < 6; i++) await userEvent.click(screen.getByRole('button', { name: 'Agregar 10 % a Tecnología' }))
    for (let i = 0; i < 4; i++) await userEvent.click(screen.getByRole('button', { name: 'Agregar 10 % a Oro' }))

    expect(screen.getByRole('button', { name: 'Agregar 10 % a Bonos largos' })).toBeDisabled()
    expect(screen.getByText('Muy concentrado: un mal semestre te puede hundir.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Quitar 10 % de Tecnología' }))
    await userEvent.click(screen.getByRole('button', { name: 'Agregar 10 % a Bonos largos' }))
    expect(screen.getByText('La mitad o más en un solo sector: es una apuesta fuerte.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Estoy listo' }))

    expect(allocate).toHaveBeenCalledWith('KX7Q2M', { tech: 50, gold: 40, bonds: 10 })
    expect(apply).toHaveBeenCalledWith(lobby)
  })

  it('durante la simulacion muestra su valor y lo que mas peso en la etapa', () => {
    const playing = {
      ...me,
      ready: true,
      weights: { tech: 60, gold: 40 },
      result: { value: 11_500, returnPercent: 15, lastPercent: 15, risk: null, score: null },
    }
    renderPage({
      ...lobby,
      phase: 'RUNNING',
      step: 1,
      stages: [
        {
          number: 1,
          revealed: true,
          period: 'primer semestre de 2023',
          title: 'Boom de la inteligencia artificial y crisis de bancos regionales',
          lesson: 'La tecnología subió como pocas veces.',
          returns: { tech: 40, gold: 5, bonds: 4.7 },
          benchmarkReturn: 16.8,
        },
      ],
      ranking: [playing],
      me: playing,
    })

    expect(screen.getByText(/Boom de la inteligencia artificial/)).toBeInTheDocument()
    expect(screen.getByText('+24.0 %')).toBeInTheDocument()
    expect(screen.getByText('+2.0 %')).toBeInTheDocument()
  })
})
