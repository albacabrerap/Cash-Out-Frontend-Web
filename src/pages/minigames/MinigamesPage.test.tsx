import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { TokenTransaction } from '@/types/finance'
import type { Minigame, MinigameSession } from '@/types/minigames'
import { minigameService } from '@/services/minigameService'
import { walletService } from '@/services/walletService'
import MinigamesPage from './MinigamesPage'

vi.mock('@/services/minigameService', () => ({ minigameService: { list: vi.fn(), sessions: vi.fn() } }))
vi.mock('@/services/walletService', () => ({ walletService: { get: vi.fn(), transactions: vi.fn() } }))
vi.mock('@/services/raceService', () => ({ raceService: { create: vi.fn() } }))

const list = vi.mocked(minigameService.list)
const sessions = vi.mocked(minigameService.sessions)
const transactions = vi.mocked(walletService.transactions)

const game = (overrides: Partial<Minigame>): Minigame => ({
  id: 1,
  title: 'Interés compuesto',
  type: 'TRIVIA',
  topic: 'Interés compuesto',
  tokenCost: 0,
  maxTokenReward: 20,
  status: 'PUBLISHED',
  ...overrides,
})

const CATALOG: Minigame[] = [
  game({ id: 3, title: 'Simulador de préstamo', type: 'SIMULATION', topic: 'Préstamos', tokenCost: 10, maxTokenReward: 50 }),
  game({ id: 1 }),
  game({ id: 4, title: 'Criptomonedas', topic: 'Cripto', tokenCost: 2, maxTokenReward: 10 }),
]

const session = (overrides: Partial<MinigameSession>): MinigameSession => ({
  id: 9,
  minigameTitle: '¿Apuesta o inversión?',
  score: 10,
  tokensSpent: 5,
  tokensEarned: 3.5,
  playedAt: '2026-10-05T21:52:00',
  ...overrides,
})

const tx = (id: number, reason: TokenTransaction['reason'], amount: number, referenceId: number | null): TokenTransaction => ({
  id,
  amount,
  reason,
  referenceId,
  balanceAfter: 100,
  createdAt: '2026-10-17T20:00:00',
})

function renderPage() {
  const router = createMemoryRouter([{ path: '/minijuegos', element: <MinigamesPage /> }], {
    initialEntries: ['/minijuegos'],
  })
  render(<RouterProvider router={router} />)
}

describe('MinigamesPage', () => {
  beforeEach(() => {
    list.mockResolvedValue(CATALOG)
    sessions.mockResolvedValue([session({})])
    transactions.mockResolvedValue({
      content: [tx(1, 'RACE_ENTRY', -20, 7), tx(2, 'RACE_PRIZE', 18, 7), tx(3, 'MINIGAME', 3.5, 9)],
      page: 0,
      size: 100,
      totalElements: 3,
      totalPages: 1,
    })
    vi.mocked(walletService.get).mockResolvedValue({ id: 1, tokenBalance: 8, updatedAt: '2026-10-05T21:00:00' })
  })

  it('muestra los juegos con su costo y premio, los gratis primero', async () => {
    renderPage()

    const games = await screen.findByRole('region', { name: 'Juegos' })
    const titles = await within(games).findAllByRole('heading', { level: 3 })
    expect(titles.map((h) => h.textContent)).toEqual(['Interés compuesto', 'Criptomonedas', 'Simulador de préstamo'])
    expect(within(games).getByText('Gratis')).toBeInTheDocument()
    expect(within(games).getByText('50.00 fichas')).toBeInTheDocument()
    expect(screen.getByText('8.00 fichas')).toBeInTheDocument()
  })

  it('avisa cuantas fichas faltan, y un juego sin contenido en la web sale como pronto', async () => {
    renderPage()

    expect(await screen.findByText('Te faltan 2.00 fichas para jugar.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Jugar Simulador de préstamo' })).toHaveAttribute('href', '/minijuegos/3')
    expect(screen.getByRole('button', { name: 'Pronto' })).toBeDisabled()
    expect(screen.queryByRole('link', { name: 'Jugar Criptomonedas' })).not.toBeInTheDocument()
  })

  it('cada tarjeta dice tu mejor puntaje y destaca el juego que mas jugaste', async () => {
    sessions.mockResolvedValue([
      session({ id: 1, minigameTitle: 'Interés compuesto', score: 63 }),
      session({ id: 2, minigameTitle: 'Interés compuesto', score: 88 }),
      session({ id: 3, minigameTitle: 'Simulador de préstamo', score: 100 }),
    ])
    renderPage()

    const card = await screen.findByRole('article', { name: 'Interés compuesto' })
    expect(await within(card).findByText('88 / 100')).toBeInTheDocument()
    expect(within(card).getByText('Más jugado')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Simulador de préstamo' })).queryByText('Más jugado')).not.toBeInTheDocument()
  })

  it('con un empate no destaca ninguno', async () => {
    renderPage()

    await screen.findByRole('article', { name: 'Interés compuesto' })
    expect(screen.queryByText('Más jugado')).not.toBeInTheDocument()
  })

  it('el historial junta partidas y carreras, en rojo si se perdieron fichas', async () => {
    renderPage()

    const history = await screen.findByRole('list', { name: 'Tus partidas' })
    const [race, played] = within(history).getAllByRole('listitem')
    expect(race).toHaveTextContent('Carrera de trading')
    expect(within(race).getAllByText('Premio')[0]).toBeInTheDocument()
    expect(within(race).getByText('−2.00 fichas')).toHaveClass('text-loss')
    expect(within(played).getByText('−1.50 fichas')).toHaveClass('text-loss')
    expect(within(played).getByText('Costó 5.00 fichas')).toBeInTheDocument()
  })

  it('sin juegos publicados lo explica', async () => {
    list.mockResolvedValue([])
    sessions.mockResolvedValue([])
    transactions.mockResolvedValue({ content: [], page: 0, size: 100, totalElements: 0, totalPages: 0 })
    renderPage()

    expect(await screen.findByText('Todavía no hay juegos publicados')).toBeInTheDocument()
    expect(await screen.findByText('Todavía no jugaste. Tus partidas aparecerán aquí.')).toBeInTheDocument()
  })
})
