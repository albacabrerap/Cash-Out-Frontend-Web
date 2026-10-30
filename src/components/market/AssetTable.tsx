import { Link } from 'react-router'
import { ArrowDown, ArrowUp, Star } from 'lucide-react'
import { ASSET_TYPE_LABEL, formatSignedPercent, formatUsd } from '@/lib/market'
import { columnValue, nextSort, type MarketColumn, type MarketSort } from '@/lib/marketSort'
import type { ListReturnState } from '@/lib/routeParams'
import { cn } from '@/lib/utils'
import type { Asset, AssetQuote } from '@/types/market'
import { Skeleton } from '@/components/ui/skeleton'

// Estrella, instrumento, ultimo, cambio, cambio %, cierre anterior y, en pantallas anchas, tipo y bolsa.
const COLUMNS =
  'grid-cols-[2rem_minmax(0,1fr)_auto] sm:grid-cols-[2rem_minmax(0,1fr)_6.25rem_4.75rem_4.75rem_6.25rem] xl:grid-cols-[2rem_minmax(0,1fr)_6.25rem_4.75rem_4.75rem_6.25rem_7.5rem]'

const HEADERS: { column: MarketColumn | null; label: string; className?: string }[] = [
  { column: 'symbol', label: 'Instrumento' },
  { column: 'last', label: 'Último', className: 'justify-end' },
  { column: 'change', label: 'Cambio', className: 'justify-end' },
  { column: 'changePct', label: 'Cambio %', className: 'justify-end' },
  { column: 'prevClose', label: 'Cierre ant.', className: 'justify-end' },
  { column: null, label: 'Tipo · bolsa', className: 'hidden xl:flex' },
]

const tone = (value: number | null) => (value === null || value === 0 ? 'text-muted-foreground' : value > 0 ? 'text-gain' : 'text-loss')

interface AssetTableProps {
  label: string
  /** undefined mientras carga. */
  assets: Asset[] | undefined
  quoteOf(asset: Asset): AssetQuote | undefined
  quotesLoading: boolean
  sort: MarketSort | undefined
  onSort(value: string): void
  heldIds: number[]
  isFavorite(id: number): boolean
  onToggleFavorite(asset: Asset): void
  /** En pantalla ancha la fila elige el detalle de al lado; en el celular abre la pagina del activo. */
  wide: boolean
  selectedId: number | undefined
  onSelect(asset: Asset): void
  returnState: ListReturnState
  skeletonRows?: number
}

/** Una lista de activos como la watchlist de un broker: columnas fijas que se ordenan al tocarlas. */
export function AssetTable(props: AssetTableProps) {
  const { label, assets, sort, onSort, skeletonRows = 8 } = props

  return (
    <div role="table" aria-label={label} aria-rowcount={assets ? assets.length + 1 : undefined}>
      <div role="row" className={cn('hidden items-center gap-3 border-b px-4 py-2 text-xs text-muted-foreground sm:grid sm:px-5', COLUMNS)}>
        <span role="columnheader" aria-label="Favorito" />
        {HEADERS.map((header) => {
          const active = header.column !== null && sort?.column === header.column
          return (
            <span
              key={header.label}
              role="columnheader"
              aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : header.column ? 'none' : undefined}
              className={cn('flex', header.className)}
            >
              {header.column ? (
                <button
                  type="button"
                  onClick={() => onSort(nextSort(sort, header.column!))}
                  className={cn(
                    'inline-flex items-center gap-1 rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                    active && 'font-medium text-foreground',
                  )}
                >
                  {header.label}
                  {active &&
                    (sort.direction === 'asc' ? (
                      <ArrowUp className="size-3" aria-hidden="true" />
                    ) : (
                      <ArrowDown className="size-3" aria-hidden="true" />
                    ))}
                </button>
              ) : (
                header.label
              )}
            </span>
          )
        })}
      </div>
      {!assets
        ? Array.from({ length: skeletonRows }, (_, i) => (
            <div key={i} role="row" className="flex items-center gap-3 border-b px-5 py-3 last:border-b-0">
              <Skeleton className="size-5 rounded" />
              <Skeleton className="h-4 max-w-56 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))
        : assets.map((asset) => <AssetTableRow key={asset.id} asset={asset} {...props} />)}
    </div>
  )
}

function AssetTableRow({
  asset,
  quoteOf,
  quotesLoading,
  heldIds,
  isFavorite,
  onToggleFavorite,
  wide,
  selectedId,
  onSelect,
  returnState,
}: AssetTableProps & { asset: Asset }) {
  const quote = quoteOf(asset)
  const favorite = isFavorite(asset.id)
  const selected = asset.id === selectedId
  const percent = columnValue('changePct', quote)
  const change = columnValue('change', quote)
  const pending = quotesLoading && !quote
  const target =
    'block truncate text-left font-semibold outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset'
  const number = (value: string, className?: string) => (
    <span role="cell" className={cn('hidden text-right font-mono tabular-nums sm:block', className)}>
      {pending ? <span className="inline-block h-3.5 w-12 animate-pulse rounded bg-muted align-middle" /> : value}
    </span>
  )

  return (
    <div
      role="row"
      className={cn(
        'relative grid items-center gap-3 border-b px-4 py-2.5 text-[13px] transition-colors last:border-b-0 hover:bg-muted/50 sm:px-5',
        COLUMNS,
        selected && 'bg-muted/60 shadow-[inset_3px_0_0_var(--accent-ink)]',
      )}
    >
      <span role="cell">
        <button
          type="button"
          aria-pressed={favorite}
          aria-label={favorite ? `Quitar ${asset.symbol} de favoritos` : `Agregar ${asset.symbol} a favoritos`}
          onClick={() => onToggleFavorite(asset)}
          className="relative z-10 grid size-7 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star aria-hidden="true" className={cn('size-4', favorite && 'fill-current text-accent-ink')} />
        </button>
      </span>
      <span role="cell" className="min-w-0">
        {wide ? (
          <button type="button" aria-pressed={selected} onClick={() => onSelect(asset)} className={target}>
            {asset.symbol}
          </button>
        ) : (
          <Link to={`/portafolio/mercado/${asset.id}`} state={returnState} className={cn(target, 'underline-offset-4 hover:underline')}>
            {asset.symbol}
          </Link>
        )}
        <span className="block truncate text-xs text-muted-foreground">
          {asset.name}
          {heldIds.includes(asset.id) && <span className="text-accent-ink"> · en tu portafolio</span>}
        </span>
      </span>
      <span role="cell" className="text-right sm:hidden">
        <span className="block font-mono tabular-nums">{pending ? '…' : formatUsd(quote?.price)}</span>
        {percent !== null && <span className={cn('block text-xs tabular-nums', tone(percent))}>{formatSignedPercent(percent)}</span>}
      </span>
      {number(formatUsd(quote?.price))}
      {number(change === null ? '—' : `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change).toFixed(2)}`, tone(change))}
      {number(formatSignedPercent(percent), tone(percent))}
      {number(formatUsd(quote?.previousClose), 'text-muted-foreground')}
      <span role="cell" className="hidden min-w-0 truncate text-xs text-muted-foreground xl:block">
        {ASSET_TYPE_LABEL[asset.type]} · {asset.exchange ?? '—'}
      </span>
    </div>
  )
}
