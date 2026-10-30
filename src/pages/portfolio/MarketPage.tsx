import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { FilterX, SearchX, Star } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useListParams } from '@/hooks/useListParams'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { OrderTarget } from '@/hooks/useOrderForm'
import { useWatchlist } from '@/hooks/useWatchlist'
import { addDays, todayIso } from '@/lib/dates'
import type { ListConfig } from '@/lib/listParams'
import { MARKET_SORTS, parseMarketSort, RELEVANCE, sortAssets } from '@/lib/marketSort'
import type { ListReturnState } from '@/lib/routeParams'
import { cn } from '@/lib/utils'
import { marketService } from '@/services/marketService'
import { portfolioService } from '@/services/portfolioService'
import type { Asset, AssetQuote, AssetType } from '@/types/market'
import { DataPagination } from '@/components/data/DataPagination'
import { ErrorState } from '@/components/feedback/ErrorState'
import { SearchInput } from '@/components/filters/SearchInput'
import { AssetDetailPanel } from '@/components/market/AssetDetailPanel'
import { AssetTable } from '@/components/market/AssetTable'
import { FeaturedAssets, type FeaturedAsset } from '@/components/market/FeaturedAssets'
import { OrderDialog } from '@/components/portfolio/OrderDialog'
import { PortfolioHeader } from '@/components/portfolio/PortfolioHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type Filter = 'search' | 'type' | 'letra' | 'mios'

// El orden por columna se aplica en la web a lo que se ve: el backend solo ordena por relevancia.
const LIST_CONFIG: ListConfig<Filter> = { sorts: MARKET_SORTS, defaultSort: RELEVANCE, filters: ['search', 'type', 'letra', 'mios'] }

const FACETS: { value: '' | AssetType; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'STOCK', label: 'Acciones' },
  { value: 'ETF', label: 'ETF' },
  { value: 'CRYPTO', label: 'Cripto' },
]
const FEATURED = ['SPY', 'QQQ', 'BTC-USD', 'ETH-USD']
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const SUGGESTIONS = ['Apple', 'Tesla', 'S&P 500', 'Bitcoin']

const isAssetType = (value: string): value is AssetType =>
  value === 'STOCK' || value === 'ETF' || value === 'FUND' || value === 'CRYPTO'

export default function MarketPage() {
  const list = useListParams(LIST_CONFIG)
  const { page, size, filters } = list
  const sort = parseMarketSort(list.sort)
  const watchlist = useWatchlist()
  const location = useLocation()
  const navigate = useNavigate()
  const isWide = useMediaQuery('(min-width: 1024px)')
  const searchRef = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<Asset | null>(null)
  const [target, setTarget] = useState<OrderTarget | null>(null)

  const type = isAssetType(filters.type) ? filters.type : undefined
  const letter = /^[A-Z]$/.test(filters.letra) ? filters.letra : undefined
  const mine = filters.mios === '1'
  const params = { page: page - 1, size, search: filters.search || undefined, type, letter }

  const portfolio = useApiQuery(['portfolio'], (signal) => portfolioService.get(signal))
  const positions = portfolio.data?.positions ?? []
  const heldIds = positions.map((position) => position.assetId)
  const query = useApiQuery(['assets', params, mine], (signal) =>
    mine ? Promise.resolve(null) : marketService.searchAssets(params, signal),
  )
  // Lo propio son pocos activos: se traen uno por uno y se filtran aqui.
  const held = useApiQuery(['held-assets', mine ? heldIds : null], (signal) =>
    mine && portfolio.data ? Promise.all(heldIds.map((id) => marketService.getAsset(id, signal))) : Promise.resolve(null),
  )
  const counts = useApiQuery(['asset-counts'], async (signal) => {
    const pages = await Promise.all(
      FACETS.map((facet) => marketService.searchAssets({ page: 0, size: 1, type: facet.value || undefined }, signal)),
    )
    return Object.fromEntries(FACETS.map((facet, i) => [facet.value, pages[i].totalElements]))
  })
  const featured = useApiQuery(['featured-assets'], async (signal): Promise<FeaturedAsset[]> => {
    const found = await Promise.all(
      FEATURED.map((symbol) =>
        marketService
          .searchAssets({ search: symbol, page: 0, size: 1 }, signal)
          .then((result) => result.content.find((asset) => asset.symbol === symbol)),
      ),
    )
    const assets = found.filter((asset): asset is Asset => asset !== undefined)
    const range = { from: addDays(todayIso(), -31), to: todayIso() }
    const [quotes, histories] = await Promise.all([
      marketService.quotes(assets.map((asset) => asset.id), signal).catch(() => []),
      Promise.all(assets.map((asset) => marketService.getPriceHistory(asset.id, signal, range).catch(() => []))),
    ])
    return assets.map((asset, i) => ({ asset, quote: quotes.find((quote) => quote.symbol === asset.symbol), points: histories[i] }))
  })

  const search = filters.search.trim().toLowerCase()
  const rows: Asset[] | undefined = mine
    ? held.data?.filter(
        (asset) =>
          (!type || asset.type === type) &&
          (!letter || asset.symbol.startsWith(letter)) &&
          (!search || asset.symbol.toLowerCase().includes(search) || asset.name.toLowerCase().includes(search)),
      )
    : query.data?.content
  const ids = rows?.map((asset) => asset.id) ?? []
  const quotes = useApiQuery(['asset-quotes', ids], (signal) => marketService.quotes(ids, signal))
  const favoriteIds = watchlist.assets?.map((asset) => asset.id) ?? []
  const favoriteQuotes = useApiQuery(['favorite-quotes', favoriteIds], (signal) => marketService.quotes(favoriteIds, signal))
  const quoteOf = (asset: Asset): AssetQuote | undefined =>
    [...(quotes.data ?? []), ...(favoriteQuotes.data ?? [])].find((quote) => quote.symbol === asset.symbol)
  const setSort = (value: string) => list.update({ sort: value }, { replace: true })

  useEffect(() => {
    const focus = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focus)
    return () => window.removeEventListener('keydown', focus)
  }, [])

  const data = query.data
  if (data && !query.isRefreshing && data.totalPages > 0 && page > data.totalPages) {
    return <Navigate to={list.hrefForPage(data.totalPages)} replace />
  }

  // Se espera a los destacados para que el panel no salte de la primera fila a SPY.
  const fallback = featured.data?.[0]?.asset ?? (featured.data || featured.error ? rows?.[0] : undefined)
  const selected = isWide ? (picked ?? fallback) : undefined
  const select = (asset: Asset) => (isWide ? setPicked(asset) : navigate(`/portafolio/mercado/${asset.id}`))
  const returnState: ListReturnState = { from: location.pathname + location.search }
  const loading = mine ? !held.data : query.isLoading
  const error = mine ? held.error : query.error
  const hasFilters = Boolean(filters.search || type || letter || mine)
  const tableProps = {
    sort,
    onSort: setSort,
    heldIds,
    isFavorite: watchlist.isFavorite,
    onToggleFavorite: (asset: Asset) => void watchlist.toggle(asset),
    wide: isWide,
    selectedId: selected?.id,
    onSelect: setPicked,
    returnState,
  }
  const clearFilters = () => list.update({ search: '', type: '', letra: '', mios: '' })

  return (
    <>
      <PortfolioHeader />

      <FeaturedAssets items={featured.error ? [] : featured.data} selectedId={selected?.id} onSelect={select} />

      <div className={cn('grid items-start gap-5', isWide && 'lg:grid-cols-[minmax(0,1fr)_23rem]')}>
        <div className="min-w-0 space-y-5">
        <section aria-labelledby="mercado-favoritos" className="overflow-hidden rounded-2xl border bg-card">
          <div className="px-4 pt-4 pb-3 sm:px-5">
            <h2 id="mercado-favoritos" className="flex items-center gap-2 text-[15px] font-semibold">
              <Star aria-hidden="true" className="size-4 fill-current text-accent-ink" />
              Favoritos
            </h2>
          </div>
          {watchlist.error && !watchlist.assets ? (
            <ErrorState error={watchlist.error} onRetry={watchlist.reload} title="No pudimos cargar tus favoritos" className="mx-4 mb-4 sm:mx-5" />
          ) : watchlist.assets?.length === 0 ? (
            <p className="border-t px-4 py-5 text-[13px] text-muted-foreground sm:px-5">
              Toca la <Star aria-hidden="true" className="inline size-3.5 align-[-2px]" /> de un activo para seguirlo aquí, con su precio del día.
            </p>
          ) : (
            <div className="border-t">
              <AssetTable
                label="Favoritos"
                assets={watchlist.assets && sortAssets(watchlist.assets, sort, quoteOf)}
                quoteOf={quoteOf}
                quotesLoading={favoriteQuotes.isLoading || favoriteQuotes.isRefreshing}
                skeletonRows={3}
                {...tableProps}
              />
            </div>
          )}
        </section>

        <section aria-labelledby="mercado-catalogo" className="overflow-hidden rounded-2xl border bg-card">
          <h2 id="mercado-catalogo" className="sr-only">
            Catálogo de activos
          </h2>
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
            <SearchInput
              className="sm:flex-1"
              inputRef={searchRef}
              defaultValue={filters.search}
              onSearch={(value) => list.update({ search: value }, { replace: true })}
              label="Buscar acciones"
              placeholder="Busca por nombre o símbolo: Apple, TSLA, S&P 500… (Ctrl K)"
            />
            <Button
              variant="outline"
              aria-pressed={mine}
              onClick={() => list.update({ mios: mine ? '' : '1' })}
              className={cn('shrink-0', mine && 'border-accent-ink bg-accent')}
            >
              Solo los míos{portfolio.data && ` · ${positions.length}`}
            </Button>
          </div>
          <div role="group" aria-label="Tipo de activo" className="flex flex-wrap items-center gap-1.5 px-4 pb-4 sm:px-5">
            {FACETS.map((facet) => {
              const pressed = (type ?? '') === facet.value
              const count = counts.data?.[facet.value]
              return (
                <button
                  key={facet.label}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => list.update({ type: facet.value })}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                    pressed ? 'border-accent-ink bg-accent' : 'hover:bg-muted',
                  )}
                >
                  {facet.label}
                  {count !== undefined && <span className="text-muted-foreground tabular-nums">{count.toLocaleString('es-PE')}</span>}
                </button>
              )
            })}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                <FilterX aria-hidden="true" />
                Limpiar filtros
              </Button>
            )}
          </div>

          <div className="grid border-t md:grid-cols-[minmax(0,1fr)_2rem]">
            <nav
              aria-label="Ir a la letra"
              className="flex gap-0.5 overflow-x-auto border-b [scrollbar-width:none] px-3 py-1.5 md:order-last md:flex-col md:items-center md:overflow-visible md:border-b-0 md:border-l md:px-0 md:py-2"
            >
              {['', ...LETTERS].map((value) => {
                const pressed = (letter ?? '') === value
                return (
                  <button
                    key={value || 'todas'}
                    type="button"
                    aria-pressed={pressed}
                    aria-label={value ? `Símbolos que empiezan con ${value}` : 'Todas las letras'}
                    onClick={() => list.update({ letra: value })}
                    className={cn(
                      'grid h-6 min-w-6 shrink-0 place-items-center rounded-md text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-[1.15rem] md:w-6',
                      pressed ? 'bg-accent text-accent-ink' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {value || '•'}
                  </button>
                )
              })}
            </nav>

            <div className="min-w-0">
              {error && !rows ? (
                <ErrorState error={error} onRetry={mine ? held.reload : query.reload} title="No pudimos cargar el mercado" className="m-4 sm:m-5" />
              ) : rows && rows.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <span aria-hidden="true" className="inline-grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <SearchX className="size-5" />
                  </span>
                  <p className="mt-3 font-semibold">
                    {filters.search ? `No encontramos «${filters.search}»` : mine ? 'No tienes activos con estos filtros' : 'No hay activos con estos filtros'}
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">Prueba con el nombre de la empresa o con alguno de estos:</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {SUGGESTIONS.map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => list.update({ search: suggestion, type: '', letra: '', mios: '' })}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div aria-busy={loading || query.isRefreshing} className={cn('transition-opacity', query.isRefreshing && 'opacity-60')}>
                  <AssetTable
                    label="Activos"
                    assets={loading || !rows ? undefined : sortAssets(rows, sort, quoteOf)}
                    quoteOf={quoteOf}
                    quotesLoading={quotes.isLoading || quotes.isRefreshing}
                    {...tableProps}
                  />
                </div>
              )}
              {!mine && data && data.totalElements > 0 && (
                <div className="px-4 py-3 sm:px-5">
                  <DataPagination
                    page={page}
                    size={size}
                    totalElements={data.totalElements}
                    totalPages={data.totalPages}
                    hrefForPage={list.hrefForPage}
                    onSizeChange={(value) => list.update({ size: value })}
                    noun={{ one: 'activo', other: 'activos' }}
                  />
                </div>
              )}
            </div>
          </div>
          {sort && !mine && (
            <p className="border-t px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
              El orden por columna se aplica a esta página; las demás páginas siguen el orden por relevancia.
            </p>
          )}
        </section>
        </div>

        {selected ? (
          <AssetDetailPanel
            key={selected.id}
            asset={selected}
            position={positions.find((position) => position.assetId === selected.id)}
            onTrade={setTarget}
            favorite={watchlist.isFavorite(selected.id)}
            onToggleFavorite={() => void watchlist.toggle(selected)}
          />
        ) : (
          isWide && <Skeleton className="h-[34rem] rounded-2xl" />
        )}
      </div>

      <OrderDialog
        target={target}
        onOpenChange={(open) => !open && setTarget(null)}
        onDone={() => {
          setTarget(null)
          portfolio.reload()
        }}
      />
    </>
  )
}
