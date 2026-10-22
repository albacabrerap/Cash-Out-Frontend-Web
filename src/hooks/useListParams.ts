import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { applyListChanges, parseListParams, type ListChanges, type ListConfig } from '@/lib/listParams'

/** Pagina, tamano, orden y filtros guardados en la URL: se pueden compartir y sobreviven a un F5. */
export function useListParams<F extends string>(config: ListConfig<F>) {
  const [searchParams, setSearchParams] = useSearchParams()
  const state = useMemo(() => parseListParams(searchParams, config), [searchParams, config])

  const update = useCallback(
    (changes: ListChanges<F>, options?: { replace?: boolean }) => {
      setSearchParams((prev) => applyListChanges(prev, changes, config), { replace: options?.replace })
    },
    [setSearchParams, config],
  )

  const hrefForPage = useCallback(
    (page: number) => {
      const query = applyListChanges(searchParams, { page } as ListChanges<F>, config).toString()
      return query ? `?${query}` : '?'
    },
    [searchParams, config],
  )

  const hasFilters = Object.values<string>(state.filters).some(Boolean)

  return { ...state, update, hrefForPage, hasFilters }
}
