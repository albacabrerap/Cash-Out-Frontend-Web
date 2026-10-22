import { useState } from 'react'
import type { ApiQuery } from '@/hooks/useApiQuery'
import { CASH_FLOW_RANGES, formatMonthLong, formatMonthShort, type CashFlowRange } from '@/lib/cashFlow'
import { formatSoles } from '@/lib/format'
import type { MonthlyFlows } from '@/types/movements'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

interface CashFlowBarsProps {
  query: ApiQuery<MonthlyFlows>
  range: CashFlowRange
  onRangeChange(range: CashFlowRange): void
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** Ingresos y gastos por mes. Al pasar sobre un mes (o enfocarlo) se ve su detalle arriba. */
export function CashFlowBars({ query, range, onRangeChange }: CashFlowBarsProps) {
  const [picked, setPicked] = useState<string>()
  const months = query.data?.months ?? []
  const active = months.find((m) => m.month === picked) ?? months.at(-1)
  const activeIndex = active ? months.indexOf(active) : -1
  const previous = activeIndex > 0 ? months[activeIndex - 1] : undefined
  const isCurrent = active?.month === query.data?.to
  const top = Math.max(1, ...months.map((m) => Math.max(m.income, m.expense))) * 1.08

  let comparison: { text: string; good: boolean | null } | undefined
  if (active && isCurrent) {
    const today = new Date()
    const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    comparison = { text: `Vas ${today.getDate()} de ${days} días`, good: null }
  } else if (active && previous && previous.expense > 0) {
    const change = ((active.expense - previous.expense) / previous.expense) * 100
    comparison = {
      text: `Gastos ${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(0)} % vs. ${formatMonthShort(previous.month)}`,
      good: change <= 0,
    }
  }

  return (
    <section aria-labelledby="resumen-flujo" className="flex min-h-[28rem] flex-col rounded-2xl border bg-card p-5 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="resumen-flujo" className="font-semibold">
            Ingresos y gastos
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Pasa el mouse sobre un mes para ver el detalle.</p>
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={range}
          onValueChange={(value) => value && onRangeChange(value as CashFlowRange)}
          aria-label="Rango del gráfico"
        >
          {CASH_FLOW_RANGES.map((r) => (
            <ToggleGroupItem key={r.key} value={r.key} aria-label={r.description} className="px-3">
              {r.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {query.error && !query.data ? (
        <ErrorState error={query.error} onRetry={query.reload} title="No pudimos cargar tus ingresos y gastos" className="mt-4 flex-1" />
      ) : !active ? (
        <Skeleton className="mt-6 flex-1" />
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2" aria-live="polite">
            <div>
              <p className="text-xs text-muted-foreground">
                {capitalize(formatMonthLong(active.month))}
                {isCurrent && ' · en curso'}
              </p>
              <p className="mt-0.5 flex items-baseline gap-2 whitespace-nowrap">
                <span className={cn('text-3xl font-semibold tracking-tight tabular-nums', active.net < 0 && 'text-expense')}>
                  {formatSoles(active.net)}
                </span>
                <span className="text-[13px] text-muted-foreground">te quedó</span>
              </p>
            </div>
            <p className="mb-1.5 flex gap-4 text-[13px] whitespace-nowrap">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-sm bg-income" />
                Ingresos <strong className="font-mono font-medium tabular-nums">{formatSoles(active.income)}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2 rounded-sm bg-expense" />
                Gastos <strong className="font-mono font-medium tabular-nums">{formatSoles(active.expense)}</strong>
              </span>
            </p>
            {comparison && (
              <span
                className={cn(
                  'mb-1.5 ml-auto rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap',
                  comparison.good === null ? 'text-muted-foreground' : comparison.good ? 'text-gain' : 'text-destructive',
                )}
              >
                {comparison.text}
              </span>
            )}
          </div>

          <div className="relative mt-5 flex min-h-48 flex-1 items-stretch gap-1.5 border-b">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 border-t border-dashed" />
            <span aria-hidden="true" className="absolute inset-x-0 top-1/2 border-t border-dashed" />
            {months.map((m, i) => {
              const on = m === active
              const name = formatMonthLong(m.month)
              return (
                <button
                  key={m.month}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${capitalize(name)}: ingresos ${formatSoles(m.income)}, gastos ${formatSoles(m.expense)}`}
                  onMouseEnter={() => setPicked(m.month)}
                  onFocus={() => setPicked(m.month)}
                  onClick={() => setPicked(m.month)}
                  className={cn(
                    'relative flex flex-1 items-end justify-center gap-1 rounded-lg pt-2 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    on && 'bg-muted/70',
                  )}
                >
                  {[
                    { value: m.income, color: 'bg-income' },
                    { value: m.expense, color: 'bg-expense' },
                  ].map((bar) => (
                    <span
                      key={bar.color}
                      className={cn('w-full max-w-7 origin-bottom rounded-t-md rounded-b-sm transition-opacity', bar.color, !on && 'opacity-40')}
                      style={{ height: `${(bar.value / top) * 100}%`, animation: `grow-y .8s cubic-bezier(.2,.7,.2,1) ${i * 0.05}s both` }}
                    />
                  ))}
                </button>
              )
            })}
          </div>
          <div aria-hidden="true" className="mt-2 flex gap-1.5">
            {months.map((m) => (
              <span
                key={m.month}
                className={cn('flex-1 text-center text-xs', m === active ? 'font-semibold' : 'text-muted-foreground')}
              >
                {formatMonthShort(m.month)}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
