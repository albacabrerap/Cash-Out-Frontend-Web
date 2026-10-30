import { useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { SearchX, Star } from 'lucide-react'
import { ApiError } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useLivePrices } from '@/hooks/useLivePrices'
import { usePolling } from '@/hooks/usePolling'
import { useWatchlist } from '@/hooks/useWatchlist'
import { returnsByRange, yearStats } from '@/lib/assetStats'
import { CHART_RANGES, type ChartRange } from '@/lib/chartRanges'
import { formatDateTime } from '@/lib/format'
import { ASSET_TYPE_LABEL, displayName, formatSignedPercent, formatUsd } from '@/lib/market'
import { newestFirst } from '@/lib/orders'
import { parseId, returnPath } from '@/lib/routeParams'
import { cn } from '@/lib/utils'
import { marketService } from '@/services/marketService'
import { portfolioService } from '@/services/portfolioService'
import type { OrderSide } from '@/types/market'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageLoader } from '@/components/feedback/PageLoader'
import { AssetChart } from '@/components/market/AssetChart'
import { AssetOrders } from '@/components/market/AssetOrders'
import { AssetPositionCard } from '@/components/market/AssetPositionCard'
import { AssetReturns } from '@/components/market/AssetReturns'
import { YearRange } from '@/components/market/YearRange'
import { BackLink } from '@/components/navigation/BackLink'
import { AssetNews } from '@/components/news/AssetNews'
import { LivePriceChart } from '@/components/portfolio/LivePriceChart'
import { OrderTicket } from '@/components/portfolio/OrderTicket'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const BENCHMARK = 'SPY'
const isRange = (value: string | null): value is ChartRange => CHART_RANGES.some((r) => r.key === value)

export default function AssetPage() {
  const id = parseId(useParams().id)
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const rangeParam = searchParams.get('rango')
  const range: ChartRange = isRange(rangeParam) ? rangeParam : '1M'
  const compare = searchParams.get('comparar') === '1'
  const [side, setSide] = useState<OrderSide>('BUY')
  const watchlist = useWatchlist()

  const notFound = () => Promise.reject(new ApiError({ kind: 'http', status: 404 }))
  const asset = useApiQuery(['asset', id], (signal) => (id ? marketService.getAsset(id, signal) : notFound()))
  const quote = useApiQuery(['quote', id], (signal) => (id ? marketService.getQuote(id, signal) : notFound()))
  const history = useApiQuery(['history', id], (signal) => (id ? marketService.getPriceHistory(id, signal) : notFound()))
  const portfolio = useApiQuery(['portfolio'], (signal) => portfolioService.get(signal))
  const orders = useApiQuery(['asset-orders', id], (signal) =>
    portfolioService.allOrders(signal).then((list) => newestFirst(list.filter((order) => order.assetId === id))),
  )
  const isBenchmark = asset.data?.symbol === BENCHMARK
  // El S&P 500 se compara con su ETF; si este activo ya es SPY no hay nada que comparar.
  const benchmark = useApiQuery(['benchmark', isBenchmark], async (signal) => {
    if (isBenchmark) return null
    const page = await marketService.searchAssets({ search: BENCHMARK, page: 0, size: 1 }, signal)
    const spy = page.content.find((item) => item.symbol === BENCHMARK)
    return spy ? marketService.getPriceHistory(spy.id, signal) : null
  })
  usePolling(quote.reload, 15_000, Boolean(asset.data))
  const isCrypto = asset.data?.type === 'CRYPTO'
  const live = useLivePrices(id, isCrypto)
  const liveView = isCrypto && searchParams.get('vista') !== 'historico'

  const backTo = returnPath(location.state, '/portafolio/mercado')
  const setParams = (changes: Record<string, string | null>) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) params.delete(key)
          else params.set(key, value)
        }
        return params
      },
      { replace: true, preventScrollReset: true, state: location.state },
    )

  if (asset.error?.status === 404) {
    return (
      <EmptyState
        icon={SearchX}
        title="No encontramos este activo"
        description="Puede que el enlace no sea correcto."
        action={
          <Button asChild variant="outline">
            <Link to="/portafolio/mercado">Volver al mercado</Link>
          </Button>
        }
      />
    )
  }
  if (asset.error && !asset.data) {
    return <ErrorState error={asset.error} onRetry={asset.reload} title="No pudimos cargar el activo" />
  }
  if (!asset.data) return <PageLoader label="Cargando el activo…" />

  const data = asset.data
  const position = portfolio.data?.positions.find((p) => p.assetId === data.id)
  const livePrice = isCrypto ? live.points.at(-1)?.price : undefined
  const previousClose = quote.data?.previousClose ?? null
  const price = livePrice ?? quote.data?.price
  // La cripto no cierra: su variacion es contra la apertura de 24 h, recalculada con cada segundo.
  const change =
    livePrice !== undefined && previousClose ? ((livePrice - previousClose) / previousClose) * 100 : (quote.data?.changePercent ?? null)
  const up = (change ?? 0) >= 0
  const unit = isCrypto ? data.symbol.split('-')[0] : 'acciones'
  const favorite = watchlist.isFavorite(data.id)
  const words = displayName(data.name).split(' ')
  // La cursiva va en la ultima palabra ("Apple *Inc.*"), salvo que sea un numero o una sigla corta ("Series 1").
  const accent = words.length > 1 && /^\p{L}[\p{L}.]{2,}$/u.test(words.at(-1)!)
  // En el celular el ticket queda al final: estos botones llevan directo a el.
  const goToTicket = (next: OrderSide) => {
    setSide(next)
    document.getElementById('activo-ticket')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const changeRange = (next: ChartRange) => setParams({ rango: next, vista: isCrypto ? 'historico' : null })

  return (
    <>
      <BackLink to={backTo}>Volver al mercado</BackLink>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-2xl font-bold text-accent-ink">
            {data.symbol[0]}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate font-display text-4xl leading-none sm:text-[2.75rem]">
                {accent ? (
                  <>
                    {words.slice(0, -1).join(' ')} <em className="text-accent-ink">{words.at(-1)}</em>
                  </>
                ) : (
                  words.join(' ')
                )}
              </h1>
              <Button
                variant="outline"
                size="icon-sm"
                aria-pressed={favorite}
                aria-label={favorite ? `Quitar ${data.symbol} de favoritos` : `Agregar ${data.symbol} a favoritos`}
                onClick={() => void watchlist.toggle(data)}
              >
                <Star aria-hidden="true" className={cn(favorite && 'fill-current text-accent-ink')} />
              </Button>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              <span className="font-mono font-medium text-foreground">{data.symbol}</span>
              <Badge variant="outline">{ASSET_TYPE_LABEL[data.type]}</Badge>
              {data.exchange && <Badge variant="outline">{data.exchange}</Badge>}
              {!data.active && <Badge variant="destructive">Ya no se opera</Badge>}
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-gain" />
                {livePrice !== undefined
                  ? 'En vivo · Coinbase, cada segundo'
                  : quote.data
                    ? `Se actualiza cada 15 s · ${formatDateTime(quote.data.updatedAt)}`
                    : 'Se actualiza cada 15 s'}
              </span>
            </p>
          </div>
        </div>
        <div className="sm:text-right">
          {quote.data && price !== undefined ? (
            <>
              <p className="font-mono text-4xl leading-none font-medium tracking-tight tabular-nums">{formatUsd(price)}</p>
              <p className="mt-1.5 text-sm">
                {change !== null && (
                  <span className={cn('tabular-nums', up ? 'text-gain' : 'text-loss')}>
                    {formatSignedPercent(change)} {isCrypto ? 'en 24 h' : 'hoy'}
                  </span>
                )}
                {previousClose !== null && !isCrypto && <span className="text-muted-foreground"> · cierre anterior {formatUsd(previousClose)}</span>}
              </p>
            </>
          ) : quote.error ? (
            <p className="text-sm text-destructive">{quote.error.serverMessage ?? 'Sin precio por ahora.'}</p>
          ) : (
            <Skeleton className="h-10 w-44" />
          )}
          {data.active && (
            <div className="mt-3 flex gap-2 lg:hidden">
              <Button className="flex-1" onClick={() => goToTicket('BUY')}>
                Comprar
              </Button>
              <Button variant="outline" className="flex-1" disabled={!position} onClick={() => goToTicket('SELL')}>
                Vender
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="min-w-0 space-y-5">
          {history.error && !history.data && !liveView ? (
            <ErrorState error={history.error} onRetry={history.reload} title="No pudimos cargar el gráfico" />
          ) : !history.data && !liveView ? (
            <Skeleton className="h-96 w-full rounded-2xl" />
          ) : (
            <AssetChart
              symbol={data.symbol}
              points={history.data ?? []}
              range={range}
              onRangeChange={changeRange}
              benchmark={benchmark.data ?? undefined}
              compare={compare}
              onCompareChange={(next) => setParams({ comparar: next ? '1' : null })}
              costBasis={position?.averageCost}
              live={
                isCrypto
                  ? {
                      active: liveView,
                      onSelect: () => setParams({ vista: null }),
                      content: <LivePriceChart symbol={data.symbol} points={live.points} status={live.status} />,
                    }
                  : undefined
              }
            />
          )}

          <AssetReturns returns={history.data && returnsByRange(history.data, benchmark.data ?? undefined)} range={range} onRangeChange={changeRange} />

          <div className="grid gap-5 md:grid-cols-2">
            <YearRange stats={history.data && yearStats(history.data, price)} price={price} />
            <AssetPositionCard symbol={data.symbol} position={position} invested={portfolio.data?.simulatedValue} unit={unit} />
          </div>

          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <AssetOrders symbol={data.symbol} orders={orders.data} error={orders.error} onRetry={orders.reload} />
            {/* Un activo manual lo inventa la app: su simbolo puede coincidir con una empresa real (CASH). */}
            {data.source !== 'MANUAL' && <AssetNews symbol={data.symbol} />}
          </div>
        </div>

        <div id="activo-ticket" className="scroll-mt-20 space-y-3 lg:sticky lg:top-20">
          {data.active ? (
            <OrderTicket
              locked
              asset={{ assetId: data.id, symbol: data.symbol, name: data.name }}
              side={side}
              positions={portfolio.data?.positions}
              onAssetChange={() => {}}
              onSideChange={setSide}
              onDone={() => {
                portfolio.reload()
                quote.reload()
                orders.reload()
              }}
            />
          ) : (
            <p className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
              {data.symbol} ya no se opera: puedes ver su historia, pero no comprarlo ni venderlo.
            </p>
          )}
          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            Antes de operar por una noticia, mira el gráfico: si ya subió o bajó fuerte, probablemente ya está en el precio.
          </p>
        </div>
      </div>
    </>
  )
}
