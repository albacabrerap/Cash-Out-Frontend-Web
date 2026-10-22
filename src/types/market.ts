export type AssetType = 'STOCK' | 'ETF' | 'FUND' | 'CRYPTO'

/** Un segundo del precio en vivo: segundos Unix y precio. */
export interface LivePoint {
  time: number
  price: number
}

/** AssetResponse */
export interface Asset {
  id: number
  symbol: string
  name: string
  type: AssetType
  currency: string
  active: boolean
  source: 'MANUAL' | 'ALPACA' | 'COINBASE'
  exchange: string | null
}

/** AssetQuoteResponse. `updatedAt` es cuando se consulto el precio, en UTC. */
export interface AssetQuote {
  symbol: string
  price: number
  previousClose: number | null
  /** Variacion del dia en %, con cuatro decimales. */
  changePercent: number | null
  currency: string
  updatedAt: string
}

/** AssetPriceResponse: un cierre diario. */
export interface PricePoint {
  /** yyyy-MM-dd, dia de cotizacion en Nueva York. */
  date: string
  closePrice: number
}

/** PositionResponse. Los tres ultimos son null si el activo todavia no tiene precio. */
export interface Position {
  id: number
  assetId: number
  symbol: string
  assetName: string
  quantity: number
  averageCost: number
  currentPrice: number | null
  marketValue: number | null
  unrealizedPnl: number | null
}

/** PortfolioResponse. Todos los montos estan en fichas (1 ficha = 1 US$). */
export interface Portfolio {
  id: number
  investedTokens: number
  simulatedValue: number
  unrealizedPnl: number
  realizedPnl: number
  positions: Position[]
  updatedAt: string
}

export type OrderSide = 'BUY' | 'SELL'
export type OrderStatus = 'PENDING' | 'EXECUTED' | 'REJECTED' | 'CANCELLED'

/** TradeOrderResponse */
export interface TradeOrder {
  id: number
  assetId: number
  symbol: string
  side: OrderSide
  quantity: number
  status: OrderStatus
  executionPrice: number | null
  tokensMoved: number
  tokenRate: number | null
  rejectionReason: string | null
  createdAt: string
  executedAt: string | null
}

/** TradeOrderRequest. `clientOrderId` hace idempotente el envio: reintentar no compra dos veces. */
export interface TradeOrderInput {
  clientOrderId: string
  assetId: number
  side: OrderSide
  quantity: number
}

/** AssetRequest: alta manual de un activo (solo ADMIN). */
export interface AssetInput {
  symbol: string
  name: string
  type: AssetType
  currency: string
}

/** Resultado de POST /assets/sync. */
export interface CatalogSyncResult {
  received: number
  created: number
  updated: number
  deactivated: number
}
