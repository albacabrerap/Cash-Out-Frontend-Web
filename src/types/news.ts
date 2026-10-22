/** "mine": lo que tiene el usuario; "market": todo; "crypto": los pares del catalogo. */
export type NewsScope = 'mine' | 'market' | 'crypto'

/** NewsAssetResponse: un activo del catalogo que la nota menciona. */
export interface NewsAsset {
  assetId: number
  symbol: string
  name: string
  /** Variacion del dia en %; null si todavia no hay cotizacion. */
  changePercent: number | null
}

/** NewsItemResponse. Titular y resumen llegan en ingles, como los publica la fuente. */
export interface NewsItem {
  id: number
  headline: string
  /** Puede venir vacio: muchas notas cortas no traen resumen. */
  summary: string
  source: string | null
  author: string | null
  /** null si la fuente no dio un enlace web valido. */
  url: string | null
  imageUrl: string | null
  /** ISO en UTC. */
  publishedAt: string
  /** Ultima edicion, ISO en UTC. El mural viene ordenado por esta fecha. */
  updatedAt: string
  assets: NewsAsset[]
}

export interface NewsPage {
  items: NewsItem[]
  /** null cuando no hay mas paginas. */
  nextPageToken: string | null
}

export interface TrendingAsset {
  assetId: number
  symbol: string
  name: string
  mentions: number
}
