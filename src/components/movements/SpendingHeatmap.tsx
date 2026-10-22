import { useState } from 'react'
import { ArrowDownLeft, ChevronLeft, ChevronRight, ListFilter } from 'lucide-react'
import { CATEGORY_META } from '@/lib/categories'
import { todayIso } from '@/lib/dates'
import { formatSoles } from '@/lib/format'
import { formatMonthLong } from '@/lib/cashFlow'
import {
  currentMonth,
  daysInMonth,
  formatMonthTitle,
  leadingBlanks,
  shiftMonth,
  type DaySummary,
  type MonthSummary,
} from '@/lib/monthOverview'
import { formatLongDate } from '@/lib/movements'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const LEGEND = [16, 35, 55, 75, 90]

interface SpendingHeatmapProps {
  month: string
  summary: MonthSummary | undefined
  onMonthChange: (month: string) => void
  onShowDay: (date: string) => void
  className?: string
}

/** Cada dia del mes, mas oscuro mientras mas se gasto; al lado, lo que paso ese dia. */
export function SpendingHeatmap({ month, summary, onMonthChange, onShowDay, className }: SpendingHeatmapProps) {
  const today = todayIso()
  const isCurrent = month === currentMonth(today)
  const [active, setActive] = useState<{ month: string; date: string }>()
  const fallback = isCurrent ? today : (summary?.priciestDay?.date ?? `${month}-01`)
  const activeDate = active?.month === month ? active.date : fallback

  const maxSpent = Math.max(0, ...[...(summary?.days.values() ?? [])].map((day) => day.spent))
  const days = Array.from({ length: daysInMonth(month) }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
  const activeDay = summary?.days.get(activeDate)
  const monthName = formatMonthLong(month)

  return (
    <section aria-labelledby="movimientos-calor" className={cn('rounded-2xl border bg-card p-5 lg:p-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Mes anterior" onClick={() => onMonthChange(shiftMonth(month, -1))}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <p className="text-xs tracking-wider text-muted-foreground uppercase">{formatMonthTitle(month)}</p>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Mes siguiente"
              disabled={isCurrent}
              onClick={() => onMonthChange(shiftMonth(month, 1))}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <h2 id="movimientos-calor" className="mt-1 text-base font-semibold">
            Cada día, pintado según cuánto gastaste
          </h2>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-hidden="true">
          menos
          {LEGEND.map((level) => (
            <span key={level} className="size-3 rounded-[3px]" style={{ background: heat(level) }} />
          ))}
          más
        </span>
      </div>

      <div className="mt-5 grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-7">
        <div className="mx-auto w-full max-w-[22rem] sm:w-[20.5rem]">
          <div className="grid grid-cols-7 gap-1.5 pb-1.5" aria-hidden="true">
            {WEEKDAYS.map((label, i) => (
              <span key={i} className="text-center text-[11px] text-muted-foreground">
                {label}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: leadingBlanks(month) }, (_, i) => (
              <span key={`blank-${i}`} aria-hidden="true" />
            ))}
            {days.map((date) => {
              const day = summary?.days.get(date)
              const label = Number(date.slice(8))
              if (date > today) {
                return (
                  <span
                    key={date}
                    aria-hidden="true"
                    className="relative aspect-square rounded-[10px] border border-dashed opacity-50"
                  >
                    <span className="absolute top-1 left-1.5 text-[10.5px] text-muted-foreground">{label}</span>
                  </span>
                )
              }
              if (!summary) return <Skeleton key={date} className="aspect-square rounded-[10px]" />
              const level = day && day.spent > 0 ? 16 + 74 * (day.spent / maxSpent) : 0
              return (
                <button
                  key={date}
                  type="button"
                  aria-label={dayLabel(date, day)}
                  aria-pressed={date === activeDate}
                  onMouseEnter={() => setActive({ month, date })}
                  onFocus={() => setActive({ month, date })}
                  onClick={() => setActive({ month, date })}
                  className={cn(
                    'relative aspect-square rounded-[10px] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring',
                    level === 0 && 'bg-muted',
                    date === activeDate && 'ring-2 ring-foreground ring-offset-2 ring-offset-card',
                  )}
                  style={level > 0 ? { background: heat(level) } : undefined}
                >
                  <span
                    className={cn(
                      'absolute top-1 left-1.5 text-[10.5px]',
                      level > 60 ? 'text-primary-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {label}
                  </span>
                  {day && day.earned > 0 && (
                    <span className="absolute right-1.5 bottom-1.5 size-1.5 rounded-full bg-income" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-col" aria-live="polite">
          <p className="text-xs text-muted-foreground first-letter:uppercase">
            {formatLongDate(activeDate).replace(/ de \d{4}$/, '')}
            {activeDate === today && ' · hoy'}
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight tabular-nums">
              {summary ? (
                formatSoles(activeDay?.spent ?? 0)
              ) : (
                <span className="inline-block h-8 w-28 animate-pulse rounded-md bg-muted align-middle" />
              )}
            </span>
            <span className="text-[13px] text-muted-foreground">{countLabel(activeDay?.movements.length ?? 0)}</span>
          </p>
          {activeDay && (
            <ul className="mt-3.5 space-y-2">
              {activeDay.movements.slice(0, 4).map((movement) => {
                const income = movement.kind === 'INCOME'
                const Icon = income ? ArrowDownLeft : CATEGORY_META[movement.category ?? 'OTHER'].icon
                return (
                  <li key={`${movement.kind}-${movement.id}`} className="flex items-center gap-2.5 text-[13px]">
                    <span
                      aria-hidden="true"
                      className={cn('grid size-7 shrink-0 place-items-center rounded-lg bg-muted', income && 'text-income')}
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{movement.label || 'Sin descripción'}</span>
                    <span className={cn('tabular-nums', income && 'text-income')}>
                      {income ? '+' : '−'}
                      {formatSoles(movement.amount)}
                    </span>
                  </li>
                )
              })}
              {activeDay.movements.length > 4 && (
                <li className="text-xs text-muted-foreground">y {activeDay.movements.length - 4} más</li>
              )}
            </ul>
          )}
          {activeDay && (
            <Button variant="outline" size="sm" className="mt-3 self-start" onClick={() => onShowDay(activeDate)}>
              <ListFilter aria-hidden="true" />
              Ver en la lista
            </Button>
          )}
          <p className="mt-auto pt-4 text-[13px] leading-relaxed text-muted-foreground">
            {summary?.priciestDay
              ? `Tu día más caro de ${monthName} fue el ${Number(summary.priciestDay.date.slice(8))} (${formatSoles(summary.priciestDay.spent)}). Pasa el mouse o toca un día para ver qué pasó.`
              : summary
                ? `No registraste gastos en ${monthName}.`
                : null}
          </p>
        </div>
      </div>
    </section>
  )
}

/** El mismo tono del gasto, mas o menos transparente: una sola escala, de claro a oscuro. */
function heat(percent: number): string {
  return `color-mix(in oklab, var(--expense) ${percent.toFixed(0)}%, transparent)`
}

function countLabel(count: number): string {
  if (count === 0) return 'sin movimientos'
  return count === 1 ? '1 movimiento' : `${count} movimientos`
}

function dayLabel(date: string, day: DaySummary | undefined): string {
  const when = formatLongDate(date).replace(/ de \d{4}$/, '')
  if (!day) return `${when}: sin movimientos`
  const parts = [day.spent > 0 ? `gastaste ${formatSoles(day.spent)}` : 'sin gastos']
  if (day.earned > 0) parts.push(`entraron ${formatSoles(day.earned)}`)
  return `${when}: ${parts.join(', ')}`
}
