import { useState } from 'react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { appendNews } from '@/lib/news'
import { newsService } from '@/services/newsService'
import type { NewsItem, NewsScope } from '@/types/news'

interface MorePages {
  key: string
  items: NewsItem[]
  next: string | null
}

/**
 * La primera pagina del mural y las que se cargan con "Cargar más". Las paginas
 * extra se guardan con la clave del filtro: al cambiarlo se descartan solas.
 */
export function useNewsFeed(scope: NewsScope, symbol: string | undefined) {
  const key = `${scope}|${symbol ?? ''}`
  const first = useApiQuery(['news', scope, symbol ?? null], (signal) => newsService.feed({ scope, symbol }, signal))
  const [more, setMore] = useState<MorePages>()
  const extra = more?.key === key ? more : undefined
  const next = extra ? extra.next : first.data?.nextPageToken

  const loadMore = useAsyncAction(async () => {
    if (!next) return
    try {
      const page = await newsService.feed({ scope, symbol, pageToken: next })
      setMore((prev) => ({
        key,
        items: appendNews(prev?.key === key ? prev.items : [], page.items),
        next: page.nextPageToken,
      }))
    } catch (err) {
      toast.error(userMessage(toApiError(err)))
    }
  })

  return {
    items: first.data && appendNews(first.data.items, extra?.items ?? []),
    error: first.error,
    isLoading: first.isLoading,
    isRefreshing: first.isRefreshing,
    reload: first.reload,
    hasMore: Boolean(next) && !first.isRefreshing,
    loadMore: loadMore.run,
    isLoadingMore: loadMore.isPending,
  }
}
