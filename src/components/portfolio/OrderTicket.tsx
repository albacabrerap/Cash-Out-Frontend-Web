import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Loader2, Search, TriangleAlert, X } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useOrderForm, type OrderTarget } from '@/hooks/useOrderForm'
import { formatTokens } from '@/lib/format'
import { ASSET_TYPE_LABEL, formatQuantity } from '@/lib/market'
import { cn } from '@/lib/utils'
import { marketService } from '@/services/marketService'
import type { Asset, OrderSide, Position, TradeOrder } from '@/types/market'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { OrderFields, QuoteRow } from './OrderDialog'

export interface TicketAsset {
  assetId: number
  symbol: string
  name: string
}

interface OrderTicketProps {
  asset: TicketAsset | null
  side: OrderSide
  positions: Position[] | undefined
  onAssetChange: (asset: TicketAsset | null) => void
  onSideChange: (side: OrderSide) => void
  onDone: (order: TradeOrder) => void
}

/** Comprar o vender sin salir del portafolio: buscar el activo, armar la orden, revisarla y confirmar. */
export function OrderTicket({ asset, side, positions, onAssetChange, onSideChange, onDone }: OrderTicketProps) {
  const held = asset ? (positions?.find((position) => position.assetId === asset.assetId)?.quantity ?? 0) : 0

  return (
    <section aria-labelledby="portafolio-orden" className="rounded-2xl border bg-card p-5">
      <h2 id="portafolio-orden" className="text-base font-semibold">
        Nueva orden
      </h2>
      <AssetSearch
        onPick={(picked) => onAssetChange({ assetId: picked.id, symbol: picked.symbol, name: picked.name })}
        suggestions={positions}
        onPickPosition={(position) =>
          onAssetChange({ assetId: position.assetId, symbol: position.symbol, name: position.assetName })
        }
        showSuggestions={!asset}
      />

      {asset ? (
        <>
          <div className="mt-3.5 flex items-center gap-3 rounded-xl bg-muted/60 p-3">
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-accent font-bold text-accent-ink">
              {asset.symbol[0]}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate font-semibold">{asset.symbol}</strong>
              <span className="block truncate text-xs text-muted-foreground">{asset.name}</span>
            </span>
            <Button variant="ghost" size="icon-sm" aria-label="Quitar el activo" onClick={() => onAssetChange(null)}>
              <X aria-hidden="true" />
            </Button>
          </div>
          <div role="group" aria-label="Tipo de orden" className="mt-3.5 flex rounded-lg bg-muted p-0.5">
            {(['BUY', 'SELL'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={side === value}
                disabled={value === 'SELL' && held === 0}
                onClick={() => onSideChange(value)}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40',
                  side === value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {value === 'BUY' ? 'Comprar' : 'Vender'}
              </button>
            ))}
          </div>
          {held === 0 && <p className="mt-1.5 text-xs text-muted-foreground">No tienes {asset.symbol}: solo puedes comprar.</p>}
          <TicketForm
            key={`${asset.assetId}-${side}`}
            target={{ ...asset, side: held === 0 ? 'BUY' : side, held }}
            onDone={onDone}
          />
        </>
      ) : (
        <p className="mt-3 text-[13px] text-muted-foreground">
          Busca una acción, un ETF o una cripto por su nombre o su símbolo, o elige una de las tuyas.
        </p>
      )}
    </section>
  )
}

function TicketForm({ target, onDone }: { target: OrderTarget; onDone: (order: TradeOrder) => void }) {
  const order = useOrderForm(target, onDone)
  const [review, setReview] = useState<{ quantity: number; tokens: number } | null>(null)
  const [placing, setPlacing] = useState(false)
  const verb = order.buying ? 'comprar' : 'vender'

  const confirm = async () => {
    if (!review) return
    setPlacing(true)
    const done = await order.place(review.quantity)
    setPlacing(false)
    setReview(null)
    if (done) order.form.reset({ value: '' })
  }

  return (
    <div className="mt-3.5 space-y-3.5">
      <QuoteRow order={order} />
      {order.formError && (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertDescription>{order.formError}</AlertDescription>
        </Alert>
      )}
      {review ? (
        <div className="space-y-3">
          <p className="rounded-xl border border-dashed p-3 text-[13px] leading-relaxed">
            Vas a {verb} ≈ {formatQuantity(review.quantity)} {target.symbol} por {formatTokens(review.tokens)}, al precio del momento.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={placing} onClick={() => setReview(null)}>
              Volver
            </Button>
            <Button className="flex-1" disabled={placing} onClick={confirm}>
              {placing && <Loader2 className="animate-spin" aria-hidden="true" />}
              {order.buying ? 'Confirmar compra' : 'Confirmar venta'}
            </Button>
          </div>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={order.form.handleSubmit(({ value }) => {
            const checked = order.check(value)
            if (checked) setReview(checked)
          })}
          className="space-y-3.5"
        >
          <OrderFields order={order} target={target} idPrefix="ticket" />
          <Button type="submit" className="w-full" disabled={!order.price}>
            {order.buying ? 'Revisar compra' : 'Revisar venta'}
          </Button>
        </form>
      )}
    </div>
  )
}

interface AssetSearchProps {
  onPick: (asset: Asset) => void
  suggestions: Position[] | undefined
  onPickPosition: (position: Position) => void
  showSuggestions: boolean
}

/** Un buscador estilo paleta de comandos: Ctrl K lo enfoca, las flechas recorren y Enter elige. */
function AssetSearch({ onPick, suggestions, onPickPosition, showSuggestions }: AssetSearchProps) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const listId = useId()
  const term = useDebouncedValue(text.trim(), 250)
  const results = useApiQuery(['asset-search', term], (signal) =>
    term ? marketService.searchAssets({ search: term, page: 0, size: 6 }, signal) : Promise.resolve(null),
  )
  const options = term ? (results.data?.content ?? []) : []

  useEffect(() => {
    const focus = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', focus)
    return () => window.removeEventListener('keydown', focus)
  }, [])

  const pick = (asset: Asset) => {
    onPick(asset)
    setText('')
    setOpen(false)
  }

  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (options.length ? (current + step + options.length) % options.length : 0))
    } else if (event.key === 'Enter' && options[active]) {
      event.preventDefault()
      pick(options[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const expanded = open && term.length > 0

  return (
    <div className="mt-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-label="Buscar activo"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && options[active] ? `${listId}-${options[active].id}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Buscar activo… (Ctrl K)"
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={keys}
          className="h-9 w-full rounded-md border border-input bg-transparent pr-3 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        {expanded && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Activos encontrados"
            className="absolute inset-x-0 top-11 z-20 max-h-72 overflow-auto rounded-xl border bg-popover p-1.5 shadow-lg"
          >
            {results.isLoading || (results.isRefreshing && options.length === 0) ? (
              <li className="px-2.5 py-2 text-[13px] text-muted-foreground">Buscando…</li>
            ) : options.length === 0 ? (
              <li className="px-2.5 py-2 text-[13px] text-muted-foreground">No encontramos «{term}».</li>
            ) : (
              options.map((asset, i) => (
                <li
                  key={asset.id}
                  id={`${listId}-${asset.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(asset)}
                  onMouseEnter={() => setActive(i)}
                  className={cn('flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-[13px]', i === active && 'bg-muted')}
                >
                  <span className="min-w-0 truncate">
                    <strong className="font-semibold">{asset.symbol}</strong> <span className="text-muted-foreground">{asset.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{ASSET_TYPE_LABEL[asset.type]}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {showSuggestions && suggestions && suggestions.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Tus activos">
          {suggestions.map((position) => (
            <button
              key={position.assetId}
              type="button"
              onClick={() => onPickPosition(position)}
              className="rounded-full border px-2.5 py-0.5 text-xs outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              {position.symbol}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
