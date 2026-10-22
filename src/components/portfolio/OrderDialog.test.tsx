import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/api/errors'
import type { TradeOrder } from '@/types/market'
import { marketService } from '@/services/marketService'
import { portfolioService } from '@/services/portfolioService'
import { walletService } from '@/services/walletService'
import { OrderDialog, type OrderTarget } from './OrderDialog'

vi.mock('@/services/marketService', () => ({ marketService: { getQuote: vi.fn() } }))
vi.mock('@/services/portfolioService', () => ({ portfolioService: { placeOrder: vi.fn() } }))
vi.mock('@/services/walletService', () => ({ walletService: { get: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const placeOrder = vi.mocked(portfolioService.placeOrder)

const aapl = (side: OrderTarget['side'], held = 0): OrderTarget => ({
  assetId: 7,
  symbol: 'AAPL',
  name: 'Apple Inc.',
  side,
  held,
})

const order = (overrides: Partial<TradeOrder>): TradeOrder => ({
  id: 1,
  assetId: 7,
  symbol: 'AAPL',
  side: 'BUY',
  quantity: 0.299625,
  status: 'EXECUTED',
  executionPrice: 333.75,
  tokensMoved: 100,
  tokenRate: 1,
  rejectionReason: null,
  createdAt: '2026-10-03T23:00:00',
  executedAt: '2026-10-03T23:00:00',
  ...overrides,
})

function renderDialog(target: OrderTarget, balance = 1000) {
  vi.mocked(marketService.getQuote).mockResolvedValue({
    symbol: 'AAPL',
    price: 333.75,
    previousClose: 330.44,
    changePercent: 1.0017,
    currency: 'USD',
    updatedAt: '2026-10-03T23:00:00',
  })
  vi.mocked(walletService.get).mockResolvedValue({ id: 1, tokenBalance: balance, updatedAt: '' })
  const onDone = vi.fn()
  render(<OrderDialog target={target} onOpenChange={() => {}} onDone={onDone} />)
  return { onDone }
}

async function submit(value: string, button: RegExp) {
  await screen.findByText('US$ 333.75')
  const input = screen.getByRole('textbox')
  await userEvent.clear(input)
  await userEvent.type(input, value)
  await userEvent.click(screen.getByRole('button', { name: button }))
}

describe('OrderDialog', () => {
  beforeEach(() => placeOrder.mockReset())

  it('compra en fichas: estima la cantidad y manda la cantidad truncada', async () => {
    placeOrder.mockResolvedValue(order({}))
    const { onDone } = renderDialog(aapl('BUY'))

    await screen.findByText('US$ 333.75')
    await userEvent.type(screen.getByRole('textbox'), '100')
    expect(screen.getByText(/Recibirás ≈ 0.299625 acciones/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Comprar$/ }))

    await waitFor(() =>
      expect(placeOrder).toHaveBeenCalledWith(expect.objectContaining({ assetId: 7, side: 'BUY', quantity: 0.299625 })),
    )
    expect(onDone).toHaveBeenCalled()
  })

  it('no manda la orden si no alcanzan las fichas', async () => {
    renderDialog(aapl('BUY'), 50)
    await submit('100', /^Comprar$/)

    expect(await screen.findByText(/No te alcanzan las fichas: tienes 50.00 fichas/)).toBeInTheDocument()
    expect(placeOrder).not.toHaveBeenCalled()
  })

  it('no deja vender mas de lo que se tiene', async () => {
    renderDialog(aapl('SELL', 0.2))
    await submit('0.5', /^Vender$/)

    expect(await screen.findByText('Solo tienes 0.2 acciones.')).toBeInTheDocument()
    expect(placeOrder).not.toHaveBeenCalled()
  })

  it('una orden rechazada muestra su motivo y el siguiente intento es otra orden', async () => {
    placeOrder.mockResolvedValue(order({ status: 'REJECTED', rejectionReason: 'No tienes fichas suficientes.' }))
    const { onDone } = renderDialog(aapl('BUY'))

    await submit('100', /^Comprar$/)
    expect(await screen.findByText('No tienes fichas suficientes.')).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /^Comprar$/ }))
    await waitFor(() => expect(placeOrder).toHaveBeenCalledTimes(2))
    const [first, second] = placeOrder.mock.calls.map(([input]) => input.clientOrderId)
    expect(second).not.toBe(first)
  })

  it('tras un error de red reintenta con el mismo id: si la orden llego, no compra dos veces', async () => {
    placeOrder.mockRejectedValueOnce(new ApiError({ kind: 'network' })).mockResolvedValueOnce(order({}))
    const { onDone } = renderDialog(aapl('BUY'))

    await submit('100', /^Comprar$/)
    expect(await screen.findByText(/No pudimos conectar con el servidor/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^Comprar$/ }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    const [first, second] = placeOrder.mock.calls.map(([input]) => input.clientOrderId)
    expect(second).toBe(first)
  })
})
