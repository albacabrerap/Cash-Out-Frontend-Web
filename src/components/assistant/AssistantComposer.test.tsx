import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/api/errors'
import { assistantService } from '@/services/assistantService'
import type { Draft } from '@/types/assistant'
import { AssistantComposer } from './AssistantComposer'

vi.mock('@/services/assistantService', () => ({ assistantService: { drafts: vi.fn(), confirm: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const drafts = vi.mocked(assistantService.drafts)
const confirm = vi.mocked(assistantService.confirm)

const base: Draft = {
  kind: 'EXPENSE',
  description: 'Taxi',
  amount: 12,
  currency: 'PEN',
  date: '2026-10-27',
  paymentMethod: 'YAPE',
  category: 'TRANSPORT',
  confidence: 0.6,
  alternatives: [],
  source: 'KEYWORDS',
  warnings: [],
  ruc: null,
  receiptRef: null,
  alreadyRegisteredAt: null,
}
const chifa: Draft = { ...base, description: 'Chifa', amount: 35.9, category: 'FOOD' }
const almuerzo: Draft = { ...base, description: 'Almuerzo', amount: null, category: 'FOOD', warnings: ['MISSING_AMOUNT'] }

describe('AssistantComposer', () => {
  beforeEach(() => {
    drafts.mockReset()
    confirm.mockReset()
  })

  it('una frase da tarjetas; corregir la categoria y guardar manda learn', async () => {
    drafts.mockResolvedValue([base, chifa])
    confirm.mockResolvedValue({ kind: 'EXPENSE', id: 1, learned: true })
    const onSaved = vi.fn()
    render(<AssistantComposer onSaved={onSaved} />)

    await userEvent.type(screen.getByLabelText('Qué gastaste o recibiste'), 'ayer taxi 12 y chifa 35 con yape{Enter}')
    const cards = within(await screen.findByRole('list', { name: 'Movimientos para revisar' })).getAllByRole('listitem')
    expect(cards).toHaveLength(2)
    expect(drafts).toHaveBeenCalledWith('ayer taxi 12 y chifa 35 con yape')

    await userEvent.click(within(cards[0]).getByRole('button', { name: 'Ocio' }))
    await userEvent.click(within(cards[0]).getByRole('button', { name: 'Guardar gasto' }))

    await waitFor(() =>
      expect(confirm).toHaveBeenCalledWith({
        kind: 'EXPENSE',
        amount: 12,
        date: '2026-10-27',
        description: 'Taxi',
        category: 'LEISURE',
        ruc: undefined,
        receiptRef: undefined,
        learn: true,
      }),
    )
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('una tarjeta sin monto avisa y no se guarda hasta completarlo', async () => {
    drafts.mockResolvedValue([almuerzo])
    confirm.mockResolvedValue({ kind: 'EXPENSE', id: 2, learned: false })
    render(<AssistantComposer onSaved={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Qué gastaste o recibiste'), 'almuerzo con yape{Enter}')
    expect(await screen.findByText('No dijiste el monto: complétalo.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Guardar gasto' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresa el monto.')
    expect(confirm).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Monto'), '15')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar gasto' }))
    await waitFor(() => expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ amount: 15, learn: false })))
  })

  it('si el servidor rechaza (sin saldo), la tarjeta queda con el motivo', async () => {
    drafts.mockResolvedValue([base])
    confirm.mockRejectedValue(new ApiError({ kind: 'http', status: 400, serverMessage: 'No tienes saldo suficiente.' }))
    render(<AssistantComposer onSaved={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Qué gastaste o recibiste'), 'taxi 12{Enter}')
    await userEvent.click(await screen.findByRole('button', { name: 'Guardar gasto' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes saldo suficiente.')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('un mensaje sin movimientos lo dice', async () => {
    drafts.mockResolvedValue([])
    render(<AssistantComposer onSaved={vi.fn()} />)

    await userEvent.type(screen.getByLabelText('Qué gastaste o recibiste'), 'ayer{Enter}')
    expect(await screen.findByRole('status')).toHaveTextContent('No encontramos ningún gasto ni ingreso')
  })
})
