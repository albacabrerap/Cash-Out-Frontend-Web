import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { FilterX, SearchX } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useListParams } from '@/hooks/useListParams'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { OrderTarget } from '@/hooks/useOrderForm'
import { addDays, todayIso } from '@/lib/dates'
import type { ListConfig } from '@/lib/listParams'
import { ASSET_TYPE_LABEL, formatSignedPercent, formatUsd } from '@/lib/market'
import type { ListReturnState } from '@/lib/routeParams'
import { cn } from '@/lib/utils'
import { marketService } from '@/services/marketService'
import { portfolioService } from '@/services/portfolioService'
import type { Asset, AssetQuote, AssetType } from '@/types/market'
import { DataPagination } from '@/components/data/DataPagination'
import { ErrorState } from '@/components/feedback/ErrorState'
import { SearchInput } from '@/components/filters/SearchInput'
import { AssetDetailPanel } from '@/components/market/AssetDetailPanel'
import { FeaturedAssets, type FeaturedAsset } from '@/components/market/FeaturedAssets'
import { OrderDialog } from '@/components/portfolio/OrderDialog'
import { PortfolioHeader } from '@/components/portfolio/PortfolioHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type Filter = 'search' | 'type' | 'letra' | 'mios'

// El backend ordena solo (simbolo exacto primero); no hay orden que elegir.
const LIST_CONFIG: ListConfig<Filter> = { sorts: ['symbol'], defaultSort: 'symbol', filters: ['search', 'type', 'letra', 'mios'] }

const FACETS: { value: '' | AssetType; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'STOCK', label: 'Acciones' },
  { value: 'ETF', label: 'ETF' },
  { value: 'CRYPTO', label: 'Cripto' },
]
const FEATURED = ['SPY', 'QQQ', 'BTC-USD', 'ETH-USD']
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const SUGGESTIONS = ['Apple', 'Tesla', 'S&P 500', 'Bitcoin']
const COLUMNS =
  'grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[6.5rem_minmax(0,1fr)_4.5rem_7rem_4.5rem] xl:grid-cols-[6.5rem_minmax(0,1fr)_4.5rem_4.5rem_7rem_4.5rem]'

const isAssetType = (value: string): value is AssetType =>
  value === 'STOCK' || value === 'ETF' || value === 'FUND' || value === 'CRYPTO'

export default function MarketPage() {
  const list = useListParams(LIST_CONFIG)
  const { page, size, filters } = list
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
  const quoteOf = (asset: Asset): AssetQuote | undefined => quotes.data?.find((quote) => quote.symbol === asset.symbol)

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
  const clearFilters = () => list.update({ search: '', type: '', letra: '', mios: '' })

  return (
    <>
      <PortfolioHeader />

      <FeaturedAssets items={featured.error ? [] : featured.data} selectedId={selected?.id} onSelect={select} />

      <div className={cn('grid items-start gap-5', isWide && 'lg:grid-cols-[minmax(0,1fr)_23rem]')}>
        <section aria-labelledby="mercado-catalogo" className="min-w-0 overflow-hidden rounded-2xl border bg-card">
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
                  <div aria-hidden="true" className={cn('hidden gap-3 border-b px-5 py-2.5 text-xs text-muted-foreground sm:grid', COLUMNS)}>
                    <span>Símbolo</span>
                    <span>Nombre</span>
                    <span>Tipo</span>
                    <span className="hidden xl:block">Bolsa</span>
                    <span className="text-right">Precio</span>
                    <span className="text-right">Hoy</span>
                  </div>
                  <ul aria-label="Activos">
                    {loading || !rows
                      ? Array.from({ length: 8 }, (_, i) => (
                          <li key={i} className="flex items-center gap-3 border-b px-5 py-3">
                            <Skeleton className="size-7 rounded-lg" />
                            <Skeleton className="h-4 max-w-56 flex-1" />
                            <Skeleton className="h-4 w-20" />
                          </li>
                        ))
                      : rows.map((asset) => (
                          <AssetRow
                            key={asset.id}
                            asset={asset}
                            quote={quoteOf(asset)}
                            quotesLoading={quotes.isLoading || quotes.isRefreshing}
                            held={heldIds.includes(asset.id)}
                            wide={isWide}
                            selected={asset.id === selected?.id}
                            onSelect={() => setPicked(asset)}
                            returnState={returnState}
                          />
                        ))}
                  </ul>
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
        </section>

        {selected ? (
          <AssetDetailPanel
            key={selected.id}
            asset={selected}
            position={positions.find((position) => position.assetId === selected.id)}
            onTrade={setTarget}
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

interface AssetRowProps {
  asset: Asset
  quote: AssetQuote | undefined
  quotesLoading: boolean
  held: boolean
  /** En pantalla ancha la fila elige el detalle de al lado; en el celular abre la pagina del activo. */
  wide: boolean
  selected: boolean
  onSelect: () => void
  returnState: ListReturnState
}

function AssetRow({ asset, quote, quotesLoading, held, wide, selected, onSelect, returnState }: AssetRowProps) {
  const change = quote?.changePercent ?? null
  const target =
    'block truncate text-left font-semibold outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset'
  const price = quote ? (
    formatUsd(quote.price)
  ) : quotesLoading ? (
    <span className="inline-block h-3.5 w-16 animate-pulse rounded bg-muted align-middle" />
  ) : (
    '—'
  )

  return (
    <li
      className={cn(
        'relative grid items-center gap-3 border-b px-4 py-2.5 text-[13px] transition-colors last:border-b-0 hover:bg-muted/50 sm:px-5',
        COLUMNS,
        selected && 'bg-muted/60 shadow-[inset_3px_0_0_var(--accent-ink)]',
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-[11px] font-bold">
          {asset.symbol[0]}
        </span>
        <span className="min-w-0">
          {wide ? (
            <button type="button" aria-pressed={selected} onClick={onSelect} className={target}>
              {asset.symbol}
            </button>
          ) : (
            <Link to={String(asset.id)} state={returnState} className={cn(target, 'underline-offset-4 hover:underline')}>
              {asset.symbol}
            </Link>
          )}
          <span className="block truncate text-xs text-muted-foreground sm:hidden">{asset.name}</span>
        </span>
      </span>
      <span className="hidden min-w-0 truncate sm:block">
        {asset.name}
        {held && <span className="text-xs text-accent-ink"> · en tu portafolio</span>}
      </span>
      <span className="hidden sm:block">
        <span className="rounded-full border px-2 py-px text-[11px]">{ASSET_TYPE_LABEL[asset.type]}</span>
      </span>
      <span className="hidden text-muted-foreground xl:block">{asset.exchange ?? '—'}</span>
      <span className="text-right">
        <span className="block font-mono tabular-nums">{price}</span>
        {change !== null && (
          <span className={cn('block text-xs tabular-nums sm:hidden', change >= 0 ? 'text-gain' : 'text-loss')}>
            {formatSignedPercent(change)}
          </span>
        )}
      </span>
      <span className={cn('hidden text-right tabular-nums sm:block', change !== null && (change >= 0 ? 'text-gain' : 'text-loss'))}>
        {change !== null ? formatSignedPercent(change) : quotesLoading ? '' : '—'}
      </span>
    </li>
  )
}
