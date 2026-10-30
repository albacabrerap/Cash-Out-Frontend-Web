import type { ReactNode } from 'react'
import { parseServerDateTime } from '@/lib/format'
import { formatQuantity, formatSignedTokens, formatUsd } from '@/lib/market'
import { dayTitle, groupByDay, signedTokens, type OrderKind } from '@/lib/orders'
import { cn } from '@/lib/utils'
import type { TradeOrder } from '@/types/market'
import { SearchInput } from '@/components/filters/SearchInput'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderStatusPill } from './OrderStatusPill'
import { SegmentButton, Segmented } from '@/components/filters/Segmented'

const KINDS: { value: OrderKind; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'compras', label: 'Compras' },
  { value: 'ventas', label: 'Ventas' },
  { value: 'rechazadas', label: 'Rechazadas' },
]
// Con el comprobante al lado (lg) no caben siete columnas: se esconden la hora y el precio, que tambien estan en el comprobante.
const COLUMNS =
  'grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[3.25rem_minmax(7rem,1fr)_4.75rem_5.5rem_6rem_7.5rem] lg:grid-cols-[minmax(7rem,1fr)_4.75rem_5.5rem_6rem_7.5rem] xl:grid-cols-[3.25rem_minmax(6rem,1fr)_4.75rem_5.5rem_6.5rem_6rem_7.5rem]'
const TIME_CELL = 'hidden md:block lg:hidden xl:block'
const time = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })

export type Density = 'comoda' | 'compacta'

interface OrderHistoryProps {
  /** La pagina visible, ya filtrada; undefined mientras carga. */
  orders: TradeOrder[] | undefined
  counts: Record<OrderKind, number> | undefined
  kind: OrderKind
  onKindChange: (kind: OrderKind) => void
  search: string
  onSearch: (value: string) => void
  density: Density
  onDensityChange: (density: Density) => void
  names: Record<number, string>
  selectedId: number | undefined
  onSelect: (order: TradeOrder) => void
  empty: ReactNode
  footer: ReactNode
}

/** El historial agrupado por dia; elegir una fila abre su comprobante. */
export function OrderHistory(props: OrderHistoryProps) {
  const { orders, counts, kind, onKindChange, search, onSearch, density, onDensityChange, names, selectedId, onSelect } = props
  const compact = density === 'compacta'

  return (
    <section aria-labelledby="ordenes-historial" className="min-w-0 overflow-hidden rounded-2xl border bg-card">
      <h2 id="ordenes-historial" className="sr-only">
        Historial de órdenes
      </h2>
      <div className="flex flex-wrap items-center gap-2.5 border-b p-4">
        <Segmented label="Tipo de orden">
          {KINDS.map((option) => (
            <SegmentButton key={option.value} pressed={kind === option.value} onClick={() => onKindChange(option.value)}>
              {option.label}
              {counts && <span className="ml-1 text-muted-foreground tabular-nums">{counts[option.value]}</span>}
            </SegmentButton>
          ))}
        </Segmented>
        <SearchInput
          className="min-w-40 flex-1"
          defaultValue={search}
          onSearch={onSearch}
          label="Buscar por símbolo"
          placeholder="Buscar símbolo…"
        />
        <Segmented label="Densidad" className="hidden md:inline-flex">
          <SegmentButton pressed={!compact} onClick={() => onDensityChange('comoda')}>
            Cómoda
          </SegmentButton>
          <SegmentButton pressed={compact} onClick={() => onDensityChange('compacta')}>
            Compacta
          </SegmentButton>
        </Segmented>
      </div>

      <div aria-hidden="true" className={cn('hidden gap-2.5 border-b px-4 py-2.5 text-xs text-muted-foreground md:grid', COLUMNS)}>
        <span className={TIME_CELL}>Hora</span>
        <span>Activo</span>
        <span>Operación</span>
        <span className="text-right">Cantidad</span>
        <span className="hidden text-right xl:block">Precio</span>
        <span className="text-right">Fichas</span>
        <span>Estado</span>
      </div>

      {!orders ? (
        <div aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-b px-4 py-3">
              <Skeleton className="size-7 rounded-lg" />
              <Skeleton className="h-4 max-w-48 flex-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        props.empty
      ) : (
        groupByDay(orders).map((group) => (
          <div key={group.day}>
            <div className="flex justify-between gap-3 border-b bg-muted/50 px-4 py-2 text-xs">
              <strong className="font-semibold">{dayTitle(group.day)}</strong>
              <span className="text-muted-foreground tabular-nums">
                {group.orders.length} {group.orders.length === 1 ? 'orden' : 'órdenes'} ·{' '}
                {group.net === null ? 'sin mover fichas' : formatSignedTokens(group.net)}
              </span>
            </div>
            <ul aria-label={dayTitle(group.day)}>
              {group.orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  name={names[order.assetId]}
                  compact={compact}
                  selected={order.id === selectedId}
                  onSelect={() => onSelect(order)}
                />
              ))}
            </ul>
          </div>
        ))
      )}
      <div className="px-4 py-3">{props.footer}</div>
    </section>
  )
}

function OrderRow({ order, name, compact, selected, onSelect }: { order: TradeOrder; name: string | undefined; compact: boolean; selected: boolean; onSelect: () => void }) {
  const tokens = signedTokens(order)
  const buy = order.side === 'BUY'
  return (
    <li
      className={cn(
        'relative grid items-center gap-2.5 border-b px-4 transition-colors hover:bg-muted/50',
        COLUMNS,
        compact ? 'py-1.5 text-[12.5px]' : 'py-2.5 text-[13px]',
        selected && 'bg-muted/60 shadow-[inset_3px_0_0_var(--accent-ink)]',
      )}
    >
      <span className={cn(TIME_CELL, 'text-muted-foreground tabular-nums')}>{time.format(parseServerDateTime(order.createdAt))}</span>
      <span className="flex min-w-0 items-center gap-2 overflow-hidden">
        <span
          aria-hidden="true"
          className={cn('grid shrink-0 place-items-center rounded-lg bg-muted text-[11px] font-bold', compact ? 'size-[22px]' : 'size-7')}
        >
          {order.symbol[0]}
        </span>
        <span className="min-w-0">
          <button
            type="button"
            aria-pressed={selected}
            onClick={onSelect}
            className="block truncate text-left font-semibold outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
          >
            {order.symbol}
          </button>
          <span className={cn('block truncate text-[11.5px] text-muted-foreground', compact && 'md:hidden')}>
            <span className="md:hidden">
              {buy ? 'Compra' : 'Venta'} · {time.format(parseServerDateTime(order.createdAt))}
              {name && ' · '}
            </span>
            {name}
          </span>
        </span>
      </span>
      <span className="hidden md:block">
        <span className={cn('rounded-full border px-2 py-px text-[11.5px]', buy ? 'border-accent-ink text-accent-ink' : 'border-income text-income')}>
          {buy ? 'Compra' : 'Venta'}
        </span>
      </span>
      <span className="hidden text-right font-mono tabular-nums md:block">{formatQuantity(order.quantity)}</span>
      <span className="hidden text-right font-mono whitespace-nowrap text-muted-foreground tabular-nums xl:block">
        {formatUsd(order.executionPrice)}
      </span>
      <span className="text-right md:contents">
        <span className={cn('block text-right font-mono tabular-nums', tokens === null ? 'text-muted-foreground' : tokens > 0 && 'text-gain')}>
          {tokens === null ? '—' : formatSignedTokens(tokens).replace(/ fichas$/, '')}
        </span>
        <span className="mt-0.5 block min-w-0 md:mt-0 md:text-left">
          <OrderStatusPill status={order.status} />
          {order.rejectionReason && !compact && (
            <span className="mt-0.5 hidden truncate text-[11px] text-muted-foreground md:block">{order.rejectionReason}</span>
          )}
        </span>
      </span>
    </li>
  )
}
