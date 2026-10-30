import { useState } from 'react'
import { Link } from 'react-router'
import { Star } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import type { OrderTarget } from '@/hooks/useOrderForm'
import type { ChartRange } from '@/lib/chartRanges'
import { formatTokens } from '@/lib/format'
import { ASSET_TYPE_LABEL, formatQuantity, formatSignedPercent, formatUsd } from '@/lib/market'
import { cn } from '@/lib/utils'
import { marketService } from '@/services/marketService'
import type { Asset, Position } from '@/types/market'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PriceChart } from '@/components/portfolio/PriceChart'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface AssetDetailPanelProps {
  asset: Asset
  /** Lo que el usuario tiene de este activo, si tiene. */
  position: Position | undefined
  onTrade: (target: OrderTarget) => void
  favorite: boolean
  onToggleFavorite: () => void
}

/** El activo elegido en la lista: su precio, su grafico y comprar o vender sin cambiar de pagina. */
export function AssetDetailPanel({ asset, position, onTrade, favorite, onToggleFavorite }: AssetDetailPanelProps) {
  const [range, setRange] = useState<ChartRange>('1M')
  const quote = useApiQuery(['quote', asset.id], (signal) => marketService.getQuote(asset.id, signal))
  const history = useApiQuery(['history', asset.id], (signal) => marketService.getPriceHistory(asset.id, signal))
  const change = quote.data?.changePercent ?? null
  const target = (side: OrderTarget['side']): OrderTarget => ({
    assetId: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    side,
    held: position?.quantity ?? 0,
  })
  const gain = position && position.currentPrice !== null ? ((position.currentPrice - position.averageCost) / position.averageCost) * 100 : null

  return (
    <aside aria-labelledby="mercado-detalle" className="rounded-2xl border bg-card p-5 lg:sticky lg:top-20">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent font-bold text-accent-ink">
          {asset.symbol[0]}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="mercado-detalle" className="text-lg font-semibold">
            {asset.symbol}
          </h2>
          <p className="truncate text-[12.5px] text-muted-foreground">{asset.name}</p>
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          aria-pressed={favorite}
          aria-label={favorite ? `Quitar ${asset.symbol} de favoritos` : `Agregar ${asset.symbol} a favoritos`}
          onClick={onToggleFavorite}
        >
          <Star aria-hidden="true" className={cn(favorite && 'fill-current text-accent-ink')} />
        </Button>
      </div>
      <p className="mt-3.5 flex flex-wrap items-baseline gap-x-2.5">
        <span className="font-mono text-[1.75rem] font-medium tracking-tight tabular-nums">
          {quote.data ? formatUsd(quote.data.price) : quote.error ? '—' : <span className="inline-block h-8 w-36 animate-pulse rounded-md bg-muted align-middle" />}
        </span>
        {change !== null && (
          <span className={cn('text-[13px] tabular-nums', change >= 0 ? 'text-gain' : 'text-loss')}>{formatSignedPercent(change)} hoy</span>
        )}
      </p>

      <div className="mt-4">
        {history.error && !history.data ? (
          <ErrorState error={history.error} onRetry={history.reload} title="No pudimos cargar el gráfico" />
        ) : history.data ? (
          <PriceChart symbol={asset.symbol} points={history.data} range={range} onRangeChange={setRange} />
        ) : (
          <Skeleton className="h-72 w-full" />
        )}
      </div>

      <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[13px]">
        <dt className="text-muted-foreground">Cierre anterior</dt>
        <dd className="text-right font-mono tabular-nums">{formatUsd(quote.data?.previousClose)}</dd>
        <dt className="text-muted-foreground">Tipo · bolsa</dt>
        <dd className="text-right">
          {ASSET_TYPE_LABEL[asset.type]} · {asset.exchange ?? '—'}
        </dd>
      </dl>

      <p className={cn('mt-4 rounded-xl px-3.5 py-2.5 text-[12.5px] leading-relaxed', position ? 'bg-gain/10' : 'bg-muted')}>
        {position
          ? `Tienes ${formatQuantity(position.quantity)} (${formatTokens(position.marketValue)})${gain === null ? '' : ` · ${formatSignedPercent(gain)} desde que compraste`}.`
          : `No tienes ${asset.symbol}. Puedes comprar fracciones desde 0.01 fichas.`}
      </p>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={() => onTrade(target('BUY'))}>
          Comprar
        </Button>
        <Button variant="outline" className="flex-1" disabled={!position} onClick={() => onTrade(target('SELL'))}>
          Vender
        </Button>
      </div>
      <Link to={`/portafolio/mercado/${asset.id}`} className="mt-3 inline-block text-[12.5px] font-medium underline-offset-4 hover:underline">
        Ver la página del activo
      </Link>
    </aside>
  )
}
