import type { Asset, AssetQuote } from '@/types/market'

export type MarketColumn = 'symbol' | 'last' | 'change' | 'changePct' | 'prevClose'
export type SortDirection = 'asc' | 'desc'
export interface MarketSort {
  column: MarketColumn
  direction: SortDirection
}

/** Sin orden elegido se respeta el del backend: el simbolo exacto primero. */
export const RELEVANCE = 'relevancia'
const COLUMNS: MarketColumn[] = ['symbol', 'last', 'change', 'changePct', 'prevClose']
export const MARKET_SORTS = [RELEVANCE, ...COLUMNS.flatMap((column) => [`${column},asc`, `${column},desc`])]

export function parseMarketSort(value: string): MarketSort | undefined {
  const [column, direction] = value.split(',')
  return COLUMNS.includes(column as MarketColumn) && (direction === 'asc' || direction === 'desc')
    ? { column: column as MarketColumn, direction }
    : undefined
}

/**
 * Como en la watchlist de un broker: la primera vez una columna de numeros ordena
 * de mayor a menor (el simbolo, de la A a la Z), la segunda al reves y la
 * tercera vuelve al orden original.
 */
export function nextSort(current: MarketSort | undefined, column: MarketColumn): string {
  const first: SortDirection = column === 'symbol' ? 'asc' : 'desc'
  if (current?.column !== column) return `${column},${first}`
  if (current.direction === first) return `${column},${first === 'asc' ? 'desc' : 'asc'}`
  return RELEVANCE
}

export function columnValue(column: MarketColumn, quote: AssetQuote | undefined): number | null {
  if (!quote) return null
  if (column === 'last') return quote.price
  if (column === 'prevClose') return quote.previousClose
  if (column === 'changePct') return quote.changePercent
  if (column === 'change') return quote.previousClose === null ? null : quote.price - quote.previousClose
  return null
}

/** Ordena lo que se ve; los activos sin cotizacion van siempre al final. */
export function sortAssets(assets: Asset[], sort: MarketSort | undefined, quoteOf: (asset: Asset) => AssetQuote | undefined): Asset[] {
  if (!sort) return assets
  const sign = sort.direction === 'asc' ? 1 : -1
  return [...assets].sort((a, b) => {
    if (sort.column === 'symbol') return sign * a.symbol.localeCompare(b.symbol)
    const x = columnValue(sort.column, quoteOf(a))
    const y = columnValue(sort.column, quoteOf(b))
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1
    return sign * (x - y)
  })
}
