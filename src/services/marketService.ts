import { http } from '@/api/client'
import { compactParams } from '@/api/params'
import type { PageParams, PageResponse } from '@/types/api'
import type { Asset, AssetInput, AssetQuote, AssetType, CatalogSyncResult, PricePoint } from '@/types/market'

/** Catalogo de acciones, cotizaciones e historico. El backend los trae de Alpaca. */
export const marketService = {
  /** `letter` deja solo los simbolos que empiezan con esa letra. */
  async searchAssets(
    params: PageParams & { search?: string; type?: AssetType; letter?: string },
    signal?: AbortSignal,
  ): Promise<PageResponse<Asset>> {
    const { data } = await http.get<PageResponse<Asset>>('/assets', { params: compactParams(params), signal })
    return data
  },

  /** Las cotizaciones de varios activos con un solo pedido al proveedor; los que no tienen precio no vienen. */
  async quotes(ids: number[], signal?: AbortSignal): Promise<AssetQuote[]> {
    if (ids.length === 0) return []
    const { data } = await http.get<AssetQuote[]>('/assets/quotes', { params: { ids: ids.join(',') }, signal })
    return data
  },

  async getAsset(id: number, signal?: AbortSignal): Promise<Asset> {
    const { data } = await http.get<Asset>(`/assets/${id}`, { signal })
    return data
  },

  async getQuote(id: number, signal?: AbortSignal): Promise<AssetQuote> {
    const { data } = await http.get<AssetQuote>(`/assets/${id}/quote`, { signal })
    return data
  },

  /** Cierres diarios, del mas antiguo al mas reciente. Sin fechas, todo lo guardado (hasta 5 anios). */
  async getPriceHistory(id: number, signal?: AbortSignal, range?: { from: string; to: string }): Promise<PricePoint[]> {
    const { data } = await http.get<PricePoint[]>(`/assets/${id}/price-history`, { params: range, signal })
    return data
  },

  // Administracion del catalogo (solo ADMIN).

  async searchAllAssets(
    params: PageParams & { search?: string; type?: AssetType },
    signal?: AbortSignal,
  ): Promise<PageResponse<Asset>> {
    const { data } = await http.get<PageResponse<Asset>>('/assets', {
      params: compactParams({ ...params, includeInactive: true }),
      signal,
    })
    return data
  },

  async createAsset(input: AssetInput): Promise<Asset> {
    const { data } = await http.post<Asset>('/assets', input)
    return data
  },

  /** Baja logica: las posiciones abiertas siguen, pero ya no se puede comprar. */
  async deactivateAsset(id: number): Promise<void> {
    await http.delete(`/assets/${id}`)
  },

  /** Solo para activos manuales: los de Alpaca toman el precio del mercado. */
  async setPrice(id: number, price: number): Promise<AssetQuote> {
    const { data } = await http.put<AssetQuote>(`/assets/${id}/quote`, { price })
    return data
  },

  /** Recorre las ~13 mil acciones de Alpaca: puede tardar bastante mas que una peticion normal. */
  async syncCatalog(): Promise<CatalogSyncResult> {
    const { data } = await http.post<CatalogSyncResult>('/assets/sync', null, { timeout: 120_000 })
    return data
  },
}
