import { useApiQuery } from '@/hooks/useApiQuery'
import { formatSignedPercent } from '@/lib/market'
import { changeClass } from '@/lib/news'
import { cn } from '@/lib/utils'
import { marketService } from '@/services/marketService'
import type { Position } from '@/types/market'

interface HoldingChipsProps {
  positions: readonly Position[]
  active: string | undefined
  onSymbol(symbol: string | undefined): void
}

/** Lo que tiene el usuario, con su dia; tocar uno filtra el mural por ese activo. */
export function HoldingChips({ positions, active, onSymbol }: HoldingChipsProps) {
  const ids = positions.map((position) => position.assetId)
  const quotes = useApiQuery(['holding-quotes', ids], (signal) => marketService.quotes(ids, signal))

  return (
    <div role="group" aria-label="Tus activos" className="flex flex-wrap gap-1.5 sm:justify-end">
      {positions.map((position) => {
        const change = quotes.data?.find((quote) => quote.symbol === position.symbol)?.changePercent ?? null
        const pressed = active === position.symbol
        return (
          <button
            key={position.assetId}
            type="button"
            aria-pressed={pressed}
            onClick={() => onSymbol(pressed ? undefined : position.symbol)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
              pressed && 'border-accent-ink bg-accent hover:bg-accent',
            )}
          >
            <strong className="font-semibold">{position.symbol}</strong>{' '}
            {change !== null && <span className={changeClass(change)}>{formatSignedPercent(change)}</span>}
          </button>
        )
      })}
    </div>
  )
}
