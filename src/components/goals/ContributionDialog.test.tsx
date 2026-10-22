import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { toast } from 'sonner'
import type { SavingsGoal } from '@/types/goals'
import { goalService } from '@/services/goalService'
import { savingsService } from '@/services/savingsService'
import { ContributionDialog } from './ContributionDialog'

vi.mock('@/services/goalService', () => ({ goalService: { contribute: vi.fn() } }))
vi.mock('@/services/savingsService', () => ({ savingsService: { get: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const contribute = vi.mocked(goalService.contribute)
const getSavings = vi.mocked(savingsService.get)

const viaje: SavingsGoal = {
  id: 1,
  name: 'Viaje',
  targetAmount: 600,
  accumulatedAmount: 200,
  progressPercent: 33.33,
  deadline: '2999-01-01',
  status: 'IN_PROGRESS',
  completedAt: null,
  createdAt: '2026-10-01T15:00:00',
}

function renderDialog(available: number) {
  getSavings.mockResolvedValue({ id: 1, currentBalance: available, committedAmount: 0, availableBalance: available, updatedAt: '' })
  const onSaved = vi.fn()
  const router = createMemoryRouter(
    [{ path: '/', element: <ContributionDialog goal={viaje} onOpenChange={() => {}} onSaved={onSaved} /> }],
  )
  render(<RouterProvider router={router} />)
  return { onSaved }
}

async function submit(amount: string) {
  const input = await screen.findByLabelText('Monto del aporte')
  await userEvent.clear(input)
  await userEvent.type(input, amount)
  await userEvent.click(screen.getByRole('button', { name: 'Aportar' }))
}

describe('ContributionDialog', () => {
  beforeEach(() => {
    contribute.mockReset()
    vi.mocked(toast.success).mockReset()
  })

  it('no deja aportar mas de lo que falta', async () => {
    renderDialog(1000)
    await screen.findByText(/disponibles/)
    await submit('500')

    expect(await screen.findByText('Supera lo que te falta (S/ 400.00).')).toBeInTheDocument()
    expect(contribute).not.toHaveBeenCalled()
  })

  it('no deja aportar mas de lo disponible', async () => {
    renderDialog(150)
    await screen.findByText(/disponibles/)
    await submit('200')

    expect(await screen.findByText('Supera lo que tienes disponible (S/ 150.00).')).toBeInTheDocument()
    expect(contribute).not.toHaveBeenCalled()
  })

  it('"Aportar lo que falta" completa la meta y lo celebra', async () => {
    contribute.mockResolvedValue({ id: 9, amount: 400, source: 'MANUAL', createdAt: '' })
    const { onSaved } = renderDialog(1000)

    await userEvent.click(await screen.findByRole('button', { name: /Aportar lo que falta/ }))
    expect(screen.getByLabelText('Monto del aporte')).toHaveValue('400.00')
    await userEvent.click(screen.getByRole('button', { name: 'Aportar' }))

    await waitFor(() => expect(contribute).toHaveBeenCalledWith(1, { amount: 400, source: 'MANUAL' }))
    expect(onSaved).toHaveBeenCalledWith({ completed: true })
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Cumpliste'), expect.anything())
  })

  it('sin saldo disponible explica por que no se puede y como resolverlo', async () => {
    renderDialog(0)

    expect(await screen.findByText('No tienes saldo disponible para aportar.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Registra un ingreso primero' })).toHaveAttribute(
      'href',
      '/movimientos/ingresos?nuevo=1',
    )
    expect(screen.getByRole('button', { name: 'Aportar' })).toBeDisabled()
  })
})
