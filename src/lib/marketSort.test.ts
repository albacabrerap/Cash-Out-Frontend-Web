import type { Asset, AssetQuote } from '@/types/market'
import { columnValue, nextSort, parseMarketSort, RELEVANCE, sortAssets } from './marketSort'

const asset = (id: number, symbol: string) => ({ id, symbol }) as Asset
const quote = (price: number, previousClose: number | null, changePercent: number | null) =>
  ({ price, previousClose, changePercent }) as AssetQuote

const assets = [asset(1, 'MSFT'), asset(2, 'AAPL'), asset(3, 'ZZZ')]
const quotes: Record<number, AssetQuote | undefined> = { 1: quote(400, 410, -2.44), 2: quote(230, 225, 2.22) }
const quoteOf = (item: Asset) => quotes[item.id]

describe('marketSort', () => {
  it('lee solo columnas y direcciones validas', () => {
    expect(parseMarketSort('changePct,desc')).toEqual({ column: 'changePct', direction: 'desc' })
    expect(parseMarketSort(RELEVANCE)).toBeUndefined()
    expect(parseMarketSort('volumen,desc')).toBeUndefined()
  })

  it('los numeros empiezan de mayor a menor, el simbolo de la A a la Z, y el tercer toque vuelve al original', () => {
    expect(nextSort(undefined, 'last')).toBe('last,desc')
    expect(nextSort({ column: 'last', direction: 'desc' }, 'last')).toBe('last,asc')
    expect(nextSort({ column: 'last', direction: 'asc' }, 'last')).toBe(RELEVANCE)
    expect(nextSort(undefined, 'symbol')).toBe('symbol,asc')
    expect(nextSort({ column: 'last', direction: 'desc' }, 'symbol')).toBe('symbol,asc')
  })

  it('el cambio es el ultimo menos el cierre anterior', () => {
    expect(columnValue('change', quote(230, 225, 2.22))).toBe(5)
    expect(columnValue('change', quote(230, null, null))).toBeNull()
    expect(columnValue('last', undefined)).toBeNull()
  })

  it('ordena y deja al final los activos sin cotizacion, en las dos direcciones', () => {
    const symbols = (column: 'changePct' | 'symbol', direction: 'asc' | 'desc') =>
      sortAssets(assets, { column, direction }, quoteOf).map((item) => item.symbol)
    expect(symbols('changePct', 'desc')).toEqual(['AAPL', 'MSFT', 'ZZZ'])
    expect(symbols('changePct', 'asc')).toEqual(['MSFT', 'AAPL', 'ZZZ'])
    expect(symbols('symbol', 'asc')).toEqual(['AAPL', 'MSFT', 'ZZZ'])
    expect(sortAssets(assets, undefined, quoteOf)).toBe(assets)
  })
})
