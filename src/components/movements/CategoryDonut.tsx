import { useState } from 'react'
import { Link } from 'react-router'
import { CATEGORY_META } from '@/lib/categories'
import { formatMonthLong } from '@/lib/cashFlow'
import { formatSoles } from '@/lib/format'
import { monthRange, type CategoryTotal, type MonthSummary } from '@/lib/monthOverview'
import { cn } from '@/lib/utils'
import type { ExpenseCategory } from '@/types/movements'
import { Skeleton } from '@/components/ui/skeleton'

const RADIUS = 70
// Hueco entre porciones, en centesimas de la vuelta.
const GAP = 0.8

interface CategoryDonutProps {
  month: string
  summary: MonthSummary | undefined
  className?: string
}

/** El gasto del mes por categoria; cada fila lleva a esos gastos filtrados. */
export function CategoryDonut({ month, summary, className }: CategoryDonutProps) {
  const [hovered, setHovered] = useState<ExpenseCategory | null>(null)
  const categories = summary?.categories ?? []
  const spent = summary?.spent ?? 0
  const top = categories[0]?.total ?? 0
  const focus = categories.find((item) => item.category === hovered)
  const monthName = formatMonthLong(month)
  const range = monthRange(month)

  const slices = categories.reduce<(CategoryTotal & { share: number; length: number; start: number })[]>(
    (done, item) => {
      const previous = done.at(-1)
      const share = (item.total / spent) * 100
      const start = previous ? previous.start + previous.share : 0
      return [...done, { ...item, share, length: Math.max(share - GAP, 0.2), start }]
    },
    [],
  )

  return (
    <section aria-labelledby="movimientos-categorias" className={cn('rounded-2xl border bg-card p-5 lg:p-6', className)}>
      <p className="text-xs tracking-wider text-muted-foreground uppercase">Gastos por categoría</p>
      <h2 id="movimientos-categorias" className="mt-1.5 text-base font-semibold">
        ¿En qué se va tu plata?
      </h2>

      <div className="relative mx-auto mt-4 size-44">
        <svg viewBox="0 0 180 180" className="size-full -rotate-90" aria-hidden="true">
          <circle cx={90} cy={90} r={RADIUS} fill="none" stroke="var(--muted)" strokeWidth={18} />
          {slices.map((slice) => (
            <circle
              key={slice.category}
              cx={90}
              cy={90}
              r={RADIUS}
              fill="none"
              pathLength={100}
              stroke={CATEGORY_META[slice.category].color}
              strokeWidth={hovered === slice.category ? 24 : 18}
              strokeDasharray={`${slice.length} ${100 - slice.length}`}
              strokeDashoffset={-slice.start}
              className="transition-[stroke-width,opacity] duration-200"
              style={{ opacity: hovered && hovered !== slice.category ? 0.35 : 1 }}
              onMouseEnter={() => setHovered(slice.category)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {summary ? (
            <>
              <span className="text-xl font-semibold tracking-tight tabular-nums">{formatSoles(focus?.total ?? spent)}</span>
              <span className="max-w-28 text-xs text-muted-foreground">
                {focus
                  ? `${CATEGORY_META[focus.category].label} · ${Math.round((focus.total / spent) * 100)} % del mes`
                  : `gastado en ${monthName}`}
              </span>
            </>
          ) : (
            <Skeleton className="h-6 w-24" />
          )}
        </div>
      </div>

      {summary && categories.length === 0 ? (
        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          Sin gastos en {monthName}. Cuando registres alguno, verás aquí en qué se te va el dinero.
        </p>
      ) : (
        <ul className="mt-4 space-y-1">
          {slices.map((slice) => {
            const { label, icon: Icon, color } = CATEGORY_META[slice.category]
            const params = new URLSearchParams({ category: slice.category, ...range, mes: month })
            return (
              <li key={slice.category}>
                <Link
                  to={`/movimientos/gastos?${params}`}
                  aria-label={`${label}: ${formatSoles(slice.total)}, ${Math.round(slice.share)} %. Ver estos gastos`}
                  onMouseEnter={() => setHovered(slice.category)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(slice.category)}
                  onBlur={() => setHovered(null)}
                  className={cn(
                    'grid grid-cols-[1.25rem_minmax(0,1fr)_5rem] items-center gap-2 rounded-lg px-1.5 py-1 text-[13px] outline-none transition-opacity hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                    hovered && hovered !== slice.category && 'opacity-50',
                  )}
                >
                  <Icon className="size-4" style={{ color }} aria-hidden="true" />
                  <span>
                    <span className="flex justify-between">
                      <span>{label}</span>
                      <span className="text-muted-foreground tabular-nums">{Math.round(slice.share)} %</span>
                    </span>
                    <span className="mt-1 block h-1 rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${(slice.total / top) * 100}%`, background: color }}
                      />
                    </span>
                  </span>
                  <span className="text-right tabular-nums">{formatSoles(slice.total)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
