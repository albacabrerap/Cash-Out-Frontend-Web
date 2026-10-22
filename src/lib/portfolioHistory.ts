import type { TokenTransaction } from '@/types/finance'
import type { PricePoint, TradeOrder } from '@/types/market'
import { addDays, todayIso } from './dates'
import { parseServerDateTime } from './format'

export interface PortfolioDay {
  /** yyyy-MM-dd local */
  date: string
  tokens: number
  value: number
  unrealized: number
  realized: number
}

export interface PortfolioNow {
  tokens: number
  value: number
  unrealized: number
  realized: number
}

/** Los ultimos `count` dias, del mas antiguo a hoy. */
export function lastDays(count: number, today = todayIso()): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - (count - 1)))
}

/** Fecha local (yyyy-MM-dd) de un LocalDateTime del backend. */
export function localDate(serverDateTime: string): string {
  const date = parseServerDateTime(serverDateTime)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Rearma los ultimos dias del portafolio para dibujar sus lineas: el saldo de
 * fichas sale del libro de movimientos; las posiciones, de repetir las ordenes
 * con costo promedio, valoradas al cierre de cada dia. Es una aproximacion para
 * el grafico: el ultimo dia se reemplaza por lo que dice el backend.
 */
export function portfolioHistory(
  days: string[],
  orders: TradeOrder[],
  closes: Map<number, PricePoint[]>,
  transactions: TokenTransaction[],
  now: PortfolioNow,
): PortfolioDay[] {
  const executed = orders
    .filter((order) => order.status === 'EXECUTED')
    .map((order) => ({ order, date: localDate(order.executedAt ?? order.createdAt) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.order.id - b.order.id)
  const ledger = transactions
    .map((tx) => ({ tx, date: localDate(tx.createdAt) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.tx.id - b.tx.id)

  const held = new Map<number, { quantity: number; cost: number }>()
  let realized = 0
  let next = 0

  return days.map((date, i) => {
    while (next < executed.length && executed[next].date <= date) {
      const { order } = executed[next++]
      const position = held.get(order.assetId) ?? { quantity: 0, cost: 0 }
      if (order.side === 'BUY') {
        position.quantity += order.quantity
        position.cost += order.tokensMoved
      } else if (position.quantity > 0) {
        const average = position.cost / position.quantity
        realized += order.tokensMoved - order.quantity * average
        position.cost -= order.quantity * average
        position.quantity -= order.quantity
      }
      held.set(order.assetId, position)
    }

    if (i === days.length - 1) return { date, ...now }

    let value = 0
    let cost = 0
    for (const [assetId, position] of held) {
      if (position.quantity <= 1e-9) continue
      const price = closeOn(closes.get(assetId) ?? [], date) ?? position.cost / position.quantity
      value += position.quantity * price
      cost += position.cost
    }
    return { date, tokens: balanceOn(ledger, date, now.tokens), value, unrealized: value - cost, realized }
  })
}

/** El ultimo cierre hasta ese dia; antes del primero, el primero. */
function closeOn(points: PricePoint[], date: string): number | undefined {
  let price: number | undefined
  for (const point of points) {
    if (point.date > date) break
    price = point.closePrice
  }
  return price ?? points[0]?.closePrice
}

/** El saldo al cerrar ese dia: el del ultimo movimiento hasta entonces o, si no hubo, el de antes del primero. */
function balanceOn(ledger: { tx: TokenTransaction; date: string }[], date: string, fallback: number): number {
  let balance: number | undefined
  for (const { tx, date: day } of ledger) {
    if (day > date) {
      return balance ?? tx.balanceAfter - tx.amount
    }
    balance = tx.balanceAfter
  }
  return balance ?? fallback
}
