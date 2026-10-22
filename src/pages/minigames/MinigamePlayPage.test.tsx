import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ApiError } from '@/api/errors'
import { compoundInterest } from '@/games/compoundInterest'
import { loanSimulator } from '@/games/loanSimulator'
import { loanTotal } from '@/lib/loans'
import type { Minigame, MinigameSession } from '@/types/minigames'
import { minigameService } from '@/services/minigameService'
import { walletService } from '@/services/walletService'
import MinigamePlayPage from './MinigamePlayPage'

vi.mock('@/services/minigameService', () => ({ minigameService: { get: vi.fn(), play: vi.fn() } }))
vi.mock('@/services/walletService', () => ({ walletService: { get: vi.fn() } }))

const get = vi.mocked(minigameService.get)
const play = vi.mocked(minigameService.play)
const wallet = vi.mocked(walletService.get)

const trivia: Minigame = {
  id: 1,
  title: 'Interés compuesto',
  type: 'TRIVIA',
  topic: 'Interés compuesto',
  tokenCost: 0,
  maxTokenReward: 20,
  status: 'PUBLISHED',
}
const simulator: Minigame = { ...trivia, id: 3, title: 'Simulador de préstamo', type: 'SIMULATION', topic: 'Préstamos', tokenCost: 10, maxTokenReward: 50 }

const session = (overrides: Partial<MinigameSession> = {}): MinigameSession => ({
  id: 7,
  minigameTitle: 'Interés compuesto',
  score: 100,
  tokensSpent: 0,
  tokensEarned: 20,
  playedAt: '2026-10-05T21:00:00',
  ...overrides,
})

function renderAt(id: number | string) {
  const router = createMemoryRouter(
    [
      { path: '/minijuegos', element: <p>Catálogo</p> },
      { path: '/minijuegos/:id', element: <MinigamePlayPage /> },
    ],
    { initialEntries: [`/minijuegos/${id}`] },
  )
  render(<RouterProvider router={router} />)
  return router
}

async function answerTrivia(rightAnswers: number) {
  for (let i = 0; i < compoundInterest.questions.length; i++) {
    const prompt = (await screen.findByRole('heading', { level: 2, name: /\?$|\.$/ })).textContent
    const question = compoundInterest.questions.find((q) => q.prompt === prompt)!
    const right = question.options[question.answer]
    const choice = i < rightAnswers ? right : question.options.find((o) => o !== right)!
    await userEvent.click(screen.getByRole('button', { name: choice }))
    await userEvent.click(screen.getByRole('button', { name: /Siguiente pregunta|Ver resultado/ }))
  }
}

describe('MinigamePlayPage', () => {
  beforeEach(() => {
    get.mockReset()
    play.mockReset()
    wallet.mockReset()
    get.mockResolvedValue(trivia)
    wallet.mockResolvedValue({ id: 1, tokenBalance: 100, updatedAt: '2026-10-05T21:00:00' })
  })

  it('una trivia completa registra el puntaje y muestra las fichas ganadas', async () => {
    play.mockResolvedValue(session())
    renderAt(1)

    await userEvent.click(await screen.findByRole('button', { name: 'Empezar partida' }))
    await answerTrivia(8)

    expect(await screen.findByRole('heading', { name: 'Tu puntaje: 100 de 100' })).toHaveFocus()
    expect(play).toHaveBeenCalledWith({ minigameId: 1, score: 100 })
    const [earned] = await screen.findAllByText('+20.00 fichas', { selector: 'dd' })
    expect(earned).toHaveClass('text-gain')
    await waitFor(() => expect(wallet).toHaveBeenCalledTimes(2))
  })

  it('despues de cada respuesta explica cual era la correcta', async () => {
    renderAt(1)
    await userEvent.click(await screen.findByRole('button', { name: 'Empezar partida' }))

    const prompt = (await screen.findByRole('heading', { level: 2, name: /\?$|\.$/ })).textContent
    const question = compoundInterest.questions.find((q) => q.prompt === prompt)!
    const right = question.options[question.answer]
    await userEvent.click(screen.getByRole('button', { name: question.options.find((o) => o !== right)! }))

    expect(screen.getByText(`No era esa. La respuesta es «${right}».`)).toBeInTheDocument()
    expect(screen.getByText(question.explanation)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Siguiente pregunta' })).toHaveFocus()
  })

  it('en el simulador gana quien elige el prestamo que cuesta menos en total', async () => {
    get.mockResolvedValue(simulator)
    play.mockResolvedValue(session({ minigameTitle: simulator.title, tokensSpent: 10, tokensEarned: 50 }))
    renderAt(3)
    await userEvent.click(await screen.findByRole('button', { name: 'Empezar partida' }))

    for (const round of loanSimulator.rounds) {
      const totals = round.offers.map((offer) => loanTotal(round.principal, offer))
      const cheapest = round.offers[totals.indexOf(Math.min(...totals))].lender
      const card = (await screen.findByRole('heading', { level: 3, name: cheapest })).closest('li')!
      await userEvent.click(within(card).getByRole('button', { name: /Elegir la oferta/ }))
      expect(within(card).getByText('La más barata')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: /Siguiente ronda|Ver resultado/ }))
    }

    expect(await screen.findByRole('heading', { name: 'Tu puntaje: 100 de 100' })).toBeInTheDocument()
    expect(play).toHaveBeenCalledWith({ minigameId: 3, score: 100 })
    expect(await screen.findByText('+40.00 fichas', { selector: 'dd' })).toBeInTheDocument()
  })

  it('sin fichas suficientes no deja empezar', async () => {
    get.mockResolvedValue(simulator)
    wallet.mockResolvedValue({ id: 1, tokenBalance: 4, updatedAt: '2026-10-05T21:00:00' })
    renderAt(3)

    expect(await screen.findByText('Te faltan 6.00 fichas para jugar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Empezar partida' })).toBeDisabled()
  })

  it('si el registro falla se puede reintentar sin volver a jugar', async () => {
    play.mockRejectedValueOnce(new ApiError({ kind: 'network' })).mockResolvedValueOnce(session({ score: 0, tokensEarned: 0 }))
    renderAt(1)
    await userEvent.click(await screen.findByRole('button', { name: 'Empezar partida' }))
    await answerTrivia(0)

    expect(await screen.findByText('No pudimos registrar tu partida')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(play).toHaveBeenCalledTimes(2))
    expect(play).toHaveBeenLastCalledWith({ minigameId: 1, score: 0 })
    expect(await screen.findByText('Ganaste')).toBeInTheDocument()
  })

  it('salir a mitad de partida pide confirmacion', async () => {
    const router = renderAt(1)
    await userEvent.click(await screen.findByRole('button', { name: 'Empezar partida' }))
    await screen.findByText('Pregunta 1 de 8')

    await userEvent.click(screen.getByRole('link', { name: 'Volver a minijuegos' }))
    const dialog = await screen.findByRole('alertdialog', { name: '¿Salir de la partida?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(router.state.location.pathname).toBe('/minijuegos/1')
    expect(screen.getByText('Pregunta 1 de 8')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: 'Volver a minijuegos' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Salir' }))
    expect(await screen.findByText('Catálogo')).toBeInTheDocument()
    expect(play).not.toHaveBeenCalled()
  })

  it('un juego que no existe o que la web no sabe jugar lo dice', async () => {
    get.mockRejectedValueOnce(new ApiError({ kind: 'http', status: 404 }))
    renderAt(99)
    expect(await screen.findByText('No encontramos este juego')).toBeInTheDocument()
  })

  it('un juego publicado sin contenido en la web no se puede empezar', async () => {
    get.mockResolvedValue({ ...trivia, topic: 'Criptomonedas' })
    renderAt(1)
    expect(await screen.findByText('Este juego todavía no se puede jugar en la web')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Empezar partida' })).not.toBeInTheDocument()
  })
})
