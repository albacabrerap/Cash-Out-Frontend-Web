import { http } from '@/api/client'
import { compactParams } from '@/api/params'
import type { NewsPage, NewsScope, TrendingAsset } from '@/types/news'

/** Noticias de Benzinga que el backend trae de Alpaca y guarda 5 minutos. */
export const newsService = {
  /** Un simbolo manda sobre el alcance. Sin pageToken, la primera pagina. */
  async feed(
    params: { scope: NewsScope; symbol?: string; pageToken?: string },
    signal?: AbortSignal,
  ): Promise<NewsPage> {
    const { data } = await http.get<NewsPage>('/news', { params: compactParams(params), signal })
    return data
  },

  async trending(signal?: AbortSignal): Promise<TrendingAsset[]> {
    const { data } = await http.get<TrendingAsset[]>('/news/trending', { signal })
    return data
  },
}
