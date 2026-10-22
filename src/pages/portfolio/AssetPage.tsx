import { useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { ArrowDownRight, ArrowUpRight, SearchX } from 'lucide-react'
import { ApiError } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useLivePrices } from '@/hooks/useLivePrices'
import { usePolling } from '@/hooks/usePolling'
import { CHART_RANGES, type ChartRange } from '@/lib/chartRanges'
import { formatDateTime, formatTokens } from '@/lib/format'
import { ASSET_TYPE_LABEL, formatQuantity, formatSignedPercent, formatUsd, returnPercent } from '@/lib/market'
import { parseId, returnPath } from '@/lib/routeParams'
import { marketService } from '@/services/marketService'
import { portfolioService } from '@/services/portfolioService'
import { DetailItem, DetailList } from '@/components/data/DetailList'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageLoader } from '@/components/feedback/PageLoader'
import { BackLink } from '@/components/navigation/BackLink'
import { AssetNews } from '@/components/news/AssetNews'
import { LivePriceChart } from '@/components/portfolio/LivePriceChart'
import { OrderDialog, type OrderTarget } from '@/components/portfolio/OrderDialog'
import { PnlText } from '@/components/portfolio/PnlText'
import { PriceChart } from '@/components/portfolio/PriceChart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

const isRange = (value: string | null): value is ChartRange => CHART_RANGES.some((r) => r.key === value)

type ChartView = 'vivo' | 'historico'

export default function AssetPage() {
  const id = parseId(useParams().id)
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const rangeParam = searchParams.get('rango')
  const range: ChartRange = isRange(rangeParam) ? rangeParam : '6M'
  const [target, setTarget] = useState<OrderTarget | null>(null)

  const notFound = () => Promise.reject(new ApiError({ kind: 'http', status: 404 }))
  const asset = useApiQuery(['asset', id], (signal) => (id ? marketService.getAsset(id, signal) : notFound()))
  const quote = useApiQuery(['quote', id], (signal) => (id ? marketService.getQuote(id, signal) : notFound()))
  const history = useApiQuery(['history', id], (signal) => (id ? marketService.getPriceHistory(id, signal) : notFound()))
  const portfolio = useApiQuery(['portfolio'], (signal) => portfolioService.get(signal))
  usePolling(quote.reload, 15_000, Boolean(asset.data))
  const isCrypto = asset.data?.type === 'CRYPTO'
  const live = useLivePrices(id, isCrypto)
  const view: ChartView = searchParams.get('vista') === 'historico' ? 'historico' : 'vivo'

  const backTo = returnPath(location.state, '/portafolio/mercado')
  const setParam = (key: string, value: string) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.set(key, value)
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
  const order = (side: OrderTarget['side']) =>
    setTarget({ assetId: data.id, symbol: data.symbol, name: data.name, side, held: position?.quantity ?? 0 })

  return (
    <>
      <BackLink to={backTo}>Volver al mercado</BackLink>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{data.symbol}</h1>
            <Badge variant="secondary">{ASSET_TYPE_LABEL[data.type]}</Badge>
            {data.exchange && <Badge variant="outline">{data.exchange}</Badge>}
            {!data.active && <Badge variant="destructive">Ya no se opera</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{data.name}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => order('BUY')} disabled={!data.active || !quote.data}>
            Comprar
          </Button>
          <Button variant="outline" onClick={() => order('SELL')} disabled={!position || !quote.data}>
            Vender
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardDescription>Precio de la última operación</CardDescription>
            <CardTitle>
              {quote.data && price !== undefined ? (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className={cn(
                      'text-3xl font-semibold tracking-tight tabular-nums',
                      change !== null && (up ? 'text-gain' : 'text-loss'),
                    )}
                  >
                    {formatUsd(price)}
                  </span>
                  {change !== null && (
                    <span className={cn('flex items-center text-sm font-medium tabular-nums', up ? 'text-gain' : 'text-loss')}>
                      {up ? <ArrowUpRight className="size-4" aria-hidden="true" /> : <ArrowDownRight className="size-4" aria-hidden="true" />}
                      {formatSignedPercent(change)} {isCrypto ? 'en 24 h' : 'hoy'}
                    </span>
                  )}
                </div>
              ) : quote.error ? (
                <span className="text-sm font-normal text-destructive">{quote.error.serverMessage ?? 'Sin precio por ahora.'}</span>
              ) : (
                <Skeleton className="h-9 w-40" />
              )}
            </CardTitle>
            {livePrice !== undefined ? (
              <p className="text-xs text-muted-foreground">Precio de Coinbase, actualizado cada segundo</p>
            ) : (
              quote.data && (
                <p className="text-xs text-muted-foreground">
                  Consultado el {formatDateTime(quote.data.updatedAt)} · se actualiza cada 15 segundos
                </p>
              )
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isCrypto && (
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                value={view}
                onValueChange={(value) => value && setParam('vista', value)}
                aria-label="Tipo de gráfico"
              >
                <ToggleGroupItem value="vivo" className="px-3">
                  En vivo
                </ToggleGroupItem>
                <ToggleGroupItem value="historico" className="px-3">
                  Histórico
                </ToggleGroupItem>
              </ToggleGroup>
            )}
            {isCrypto && view === 'vivo' ? (
              <LivePriceChart symbol={data.symbol} points={live.points} status={live.status} />
            ) : history.error && !history.data ? (
              <ErrorState error={history.error} onRetry={history.reload} title="No pudimos cargar el gráfico" />
            ) : !history.data ? (
              <Skeleton className="h-72 w-full" />
            ) : history.data.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Todavía no hay cierres para graficar.</p>
            ) : (
              <PriceChart
                symbol={data.symbol}
                points={history.data}
                range={range}
                onRangeChange={(next) => setParam('rango', next)}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Tu posición</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {position ? (
              <DetailList className="sm:grid-cols-1">
                <DetailItem label="Tienes">
                  {formatQuantity(position.quantity)} {unit}
                </DetailItem>
                <DetailItem label="Costo promedio">{formatUsd(position.averageCost)}</DetailItem>
                <DetailItem label="Valor hoy">
                  {position.marketValue === null ? '—' : formatTokens(position.marketValue)}
                </DetailItem>
                <DetailItem label="Resultado">
                  <PnlText
                    value={position.unrealizedPnl}
                    percent={returnPercent(position.unrealizedPnl, position.quantity * position.averageCost)}
                  />
                </DetailItem>
              </DetailList>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavía no tienes {data.symbol}. Puedes comprar desde 0.01 fichas: no necesitas{' '}
                {isCrypto ? 'una moneda entera' : 'una acción entera'}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Un activo manual lo inventa la app: su simbolo puede coincidir con una empresa real (CASH). */}
      {data.source !== 'MANUAL' && <AssetNews symbol={data.symbol} />}

      <OrderDialog
        target={target}
        onOpenChange={(open) => !open && setTarget(null)}
        onDone={() => {
          setTarget(null)
          portfolio.reload()
          quote.reload()
        }}
      />
    </>
  )
}
