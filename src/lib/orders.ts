import { addDays, parseIsoDate, todayIso } from '@/lib/dates'
import { localDate } from '@/lib/portfolioHistory'
import type { TradeOrder } from '@/types/market'

export type OrderPeriod = '7d' | '30d' | 'todo'
export type OrderKind = 'todas' | 'compras' | 'ventas' | 'rechazadas'

export const ORDER_PERIODS: { value: OrderPeriod; label: string }[] = [
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'todo', label: 'Todo' },
]

const PERIOD_DAYS: Record<OrderPeriod, number> = { '7d': 7, '30d': 30, todo: Infinity }
const BARS = 7

export const isOrderPeriod = (value: string): value is OrderPeriod => value in PERIOD_DAYS
export const isOrderKind = (value: string): value is OrderKind =>
  value === 'todas' || value === 'compras' || value === 'ventas' || value === 'rechazadas'

const executed = (order: TradeOrder) => order.status === 'EXECUTED'

function daysAgo(day: string, today: string): number {
  return Math.round((parseIsoDate(today).getTime() - parseIsoDate(day).getTime()) / 86_400_000)
}

/** Del mas reciente al mas antiguo: el backend no garantiza el orden. */
export function newestFirst(orders: TradeOrder[]): TradeOrder[] {
  return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
}

export function inPeriod(orders: TradeOrder[], period: OrderPeriod, today = todayIso()): TradeOrder[] {
  const limit = PERIOD_DAYS[period]
  return orders.filter((order) => daysAgo(localDate(order.createdAt), today) < limit)
}

export function matchesKind(order: TradeOrder, kind: OrderKind): boolean {
  if (kind === 'rechazadas') return order.status === 'REJECTED'
  if (kind === 'compras') return executed(order) && order.side === 'BUY'
  if (kind === 'ventas') return executed(order) && order.side === 'SELL'
  return true
}

/** Fichas con signo: lo que salio (compra) o entro (venta) al saldo. */
export function signedTokens(order: TradeOrder): number | null {
  if (!executed(order)) return null
  return order.side === 'BUY' ? -order.tokensMoved : order.tokensMoved
}

export interface OrderMetric {
  key: 'executed' | 'invested' | 'received' | 'rejected'
  value: number
  /** Siete tramos iguales del periodo, del mas antiguo al mas reciente. */
  bars: number[]
  count: number
}

export function orderMetrics(orders: TradeOrder[], period: OrderPeriod, today = todayIso()): OrderMetric[] {
  const span =
    period === 'todo'
      ? Math.max(1, ...orders.map((order) => daysAgo(localDate(order.createdAt), today) + 1))
      : PERIOD_DAYS[period]
  const bucket = (order: TradeOrder) =>
    BARS - 1 - Math.min(BARS - 1, Math.floor((daysAgo(localDate(order.createdAt), today) / span) * BARS))
  const bars = (list: TradeOrder[], value: (order: TradeOrder) => number) =>
    list.reduce((sums, order) => {
      sums[bucket(order)] += value(order)
      return sums
    }, Array<number>(BARS).fill(0))

  const done = orders.filter(executed)
  const buys = done.filter((order) => order.side === 'BUY')
  const sells = done.filter((order) => order.side === 'SELL')
  const rejected = orders.filter((order) => order.status === 'REJECTED')
  const total = (list: TradeOrder[]) => list.reduce((sum, order) => sum + order.tokensMoved, 0)

  return [
    { key: 'executed', value: done.length, bars: bars(done, () => 1), count: orders.length },
    { key: 'invested', value: total(buys), bars: bars(buys, (order) => order.tokensMoved), count: buys.length },
    { key: 'received', value: total(sells), bars: bars(sells, (order) => order.tokensMoved), count: sells.length },
    { key: 'rejected', value: rejected.length, bars: bars(rejected, () => 1), count: rejected.length },
  ]
}

export interface OrderDay {
  day: string
  orders: TradeOrder[]
  /** null si ninguna orden del dia movio fichas. */
  net: number | null
}

export function groupByDay(orders: TradeOrder[]): OrderDay[] {
  const days = new Map<string, TradeOrder[]>()
  for (const order of orders) {
    const day = localDate(order.createdAt)
    days.set(day, [...(days.get(day) ?? []), order])
  }
  return [...days].map(([day, list]) => {
    const moved = list.map(signedTokens).filter((value): value is number => value !== null)
    return { day, orders: list, net: moved.length ? moved.reduce((sum, value) => sum + value, 0) : null }
  })
}

const longDay = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })

/** "Hoy · Miércoles 21 de octubre". */
export function dayTitle(day: string, today = todayIso()): string {
  const name = longDay.format(parseIsoDate(day))
  const prefix = day === today ? 'Hoy · ' : day === addDays(today, -1) ? 'Ayer · ' : ''
  return prefix + name[0].toUpperCase() + name.slice(1)
}

/** Un consejo que acompana al motivo del backend, segun el lado de la orden. */
export function rejectionTip(order: TradeOrder): string {
  return order.side === 'BUY'
    ? 'Puedes comprar fracciones: prueba con menos fichas o una cantidad menor.'
    : 'Solo puedes vender lo que tienes en tu portafolio.'
}
