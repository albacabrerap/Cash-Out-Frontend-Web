import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { useLiveRoom } from '@/hooks/useLiveRoom'
import { updownService } from '@/services/updownService'
import type { UpDownPlayer, UpDownView } from '@/types/updown'
import UpDownPlayerPage from './UpDownPlayerPage'

vi.mock('@/hooks/useLiveRoom', () => ({ useLiveRoom: vi.fn() }))
vi.mock('@/services/updownService', () => ({ updownService: { join: vi.fn(), vote: vi.fn() } }))

const room = vi.mocked(useLiveRoom)
const vote = vi.mocked(updownService.vote)
const apply = vi.fn()

const me: UpDownPlayer = {
  id: 1, rank: 1, name: 'Valeria', points: 1000, hits: 0, voted: false, choice: null, bet: 0, delta: 0, me: true,
}
const voting: UpDownView = {
  code: 'KX7Q2M',
  phase: 'VOTING',
  host: false,
  joined: true,
  maxPlayers: 40,
  startPoints: 1000,
  minBet: 10,
  round: 1,
  totalRounds: 8,
  secondsLeft: 12,
  votingSeconds: 20,
  question: {
    sector: 'Bancos regionales',
    period: 'marzo de 2023',
    context: 'Silicon Valley Bank anuncia una gran pérdida en bonos.',
    past: Array.from({ length: 80 }, (_, i) => 120 - i / 4),
    future: null,
    reveal: null,
  },
  tally: { answered: 0, options: [] },
  ranking: [me],
  me,
  history: [],
}

function renderPage(view: UpDownView) {
  room.mockReturnValue({ view, connection: 'live', apply })
  const router = createMemoryRouter([{ path: '/minijuegos/sube-o-baja/:code', element: <UpDownPlayerPage /> }], {
    initialEntries: ['/minijuegos/sube-o-baja/KX7Q2M'],
  })
  render(<RouterProvider router={router} />)
}

describe('UpDownPlayerPage', () => {
  it('elige, apuesta con un atajo y confirma', async () => {
    vote.mockResolvedValue(voting)
    renderPage(voting)

    expect(screen.getByText(/Silicon Valley Bank/)).toBeInTheDocument()
    const confirm = screen.getByRole('button', { name: 'Elige una opción' })
    expect(confirm).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: /Baja/ }))
    await userEvent.click(screen.getByRole('button', { name: '50 %' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar apuesta' }))

    expect(vote).toHaveBeenCalledWith('KX7Q2M', 'DOWN', 500)
    expect(apply).toHaveBeenCalledWith(voting)
  })

  it('al revelar muestra lo que gano y la leccion', () => {
    const won = { ...me, voted: true, choice: 'DOWN' as const, bet: 300, delta: 300, points: 1300 }
    renderPage({
      ...voting,
      phase: 'REVEAL',
      question: {
        ...voting.question!,
        future: Array.from({ length: 22 }, (_, i) => 100 - i),
        reveal: {
          name: 'un índice de bancos regionales de EE. UU. (KRE)',
          date: '2023-03-09',
          outcome: 'DOWN',
          changePercent: -18.4,
          lesson: 'El miedo se contagió a otros bancos.',
        },
      },
      ranking: [won],
      me: won,
    })

    expect(screen.getByText('¡Acertaste!')).toBeInTheDocument()
    expect(screen.getByText('+300 pts')).toBeInTheDocument()
    expect(screen.getByText(/El miedo se contagió/)).toBeInTheDocument()
  })
})
