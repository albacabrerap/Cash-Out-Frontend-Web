import { useState } from 'react'
import { formatMonthLong, formatMonthShort } from '@/lib/cashFlow'
import { formatSoles } from '@/lib/format'
import { contributionsByMonth } from '@/lib/goals'
import { currentMonth, shiftMonth } from '@/lib/monthOverview'
import { cn } from '@/lib/utils'
import type { Contribution, SavingsGoal } from '@/types/goals'
import { Skeleton } from '@/components/ui/skeleton'

const MONTHS = 6
const SERIES = 7

interface ContributionsChartProps {
  goals: SavingsGoal[]
  contributions: { goalId: number; contributions: Contribution[] }[] | undefined
}

/** Lo aportado en los ultimos meses, apilado por meta. */
export function ContributionsChart({ goals, contributions }: ContributionsChartProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const now = currentMonth()
  const months = Array.from({ length: MONTHS }, (_, i) => shiftMonth(now, i - (MONTHS - 1)))
  const data = contributions ? contributionsByMonth(contributions, months) : undefined

  // El color sigue a la meta (por antiguedad), no a su lugar en el mes; despues de la septima, gris.
  const byId = [...goals].sort((a, b) => a.id - b.id)
  const colorOf = (goalId: number) => {
    const index = byId.findIndex((goal) => goal.id === goalId)
    return index >= 0 && index < SERIES ? `var(--series-${index + 1})` : 'var(--muted-foreground)'
  }
  const nameOf = (goalId: number) => goals.find((goal) => goal.id === goalId)?.name ?? 'Meta eliminada'

  const max = Math.max(...(data ?? []).map((month) => month.total), 0)
  const inChart = new Set((data ?? []).flatMap((month) => month.parts.map((part) => part.goalId)))
  const focus = data?.find((month) => month.month === hovered)
  const best = data?.reduce((top, month) => (month.total > top.total ? month : top))
  const sum = (data ?? []).reduce((total, month) => total + month.total, 0)

  let caption = ''
  if (focus) {
    const top = focus.parts.reduce<(typeof focus.parts)[number] | undefined>(
      (most, part) => (!most || part.amount > most.amount ? part : most),
      undefined,
    )
    const name = formatMonthLong(focus.month)
    caption = top
      ? `${name[0].toUpperCase()}${name.slice(1)}: ${formatSoles(focus.total)} en ${focus.parts.length} ${focus.parts.length === 1 ? 'meta' : 'metas'} · más a ${nameOf(top.goalId)} (${formatSoles(top.amount)})`
      : `${name[0].toUpperCase()}${name.slice(1)}: sin aportes`
  } else if (best && best.total > 0) {
    caption = `${formatSoles(sum)} en ${MONTHS} meses · tu mejor mes fue ${formatMonthLong(best.month)} (${formatSoles(best.total)})`
  }

  return (
    <section aria-labelledby="metas-aportes" className="rounded-2xl border bg-card p-4 sm:p-5">
      <h2 id="metas-aportes" className="text-base font-semibold">
        Aportes por mes
      </h2>
      <p className="mt-1 min-h-5 text-[13px] text-muted-foreground" aria-live="polite">
        {data && sum === 0 ? 'Todavía no hay aportes en los últimos 6 meses.' : caption}
      </p>

      <ul
        aria-label={`Aportes de los últimos ${MONTHS} meses`}
        className="mt-4 grid h-44 grid-cols-6 items-end gap-2 sm:gap-3.5"
        onMouseLeave={() => setHovered(null)}
      >
        {months.map((month, i) => {
          const entry = data?.[i]
          const active = hovered === null || hovered === month
          return (
            <li
              key={month}
              tabIndex={0}
              aria-label={`${formatMonthLong(month)}: ${formatSoles(entry?.total ?? 0)}`}
              onMouseEnter={() => setHovered(month)}
              onFocus={() => setHovered(month)}
              onBlur={() => setHovered(null)}
              className={cn(
                'flex h-full flex-col items-center justify-end gap-1.5 rounded-lg outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring',
                !active && 'opacity-40',
              )}
            >
              {entry ? (
                <>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {entry.total > 0 ? formatSoles(entry.total).replace(/\.00$/, '') : ''}
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex w-full max-w-14 flex-col-reverse gap-0.5"
                    style={{ height: max > 0 ? `${(entry.total / max) * 7.5}rem` : 0 }}
                  >
                    {entry.parts.map((part) => (
                      <span
                        key={part.goalId}
                        className="min-h-[3px] rounded-[4px]"
                        style={{ flex: `${part.amount} 1 0`, background: colorOf(part.goalId) }}
                      />
                    ))}
                  </span>
                </>
              ) : (
                <Skeleton className="h-16 w-full max-w-14" />
              )}
              <span className={cn('text-xs', hovered === month ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {formatMonthShort(month)}
              </span>
            </li>
          )
        })}
      </ul>

      {inChart.size > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-3.5 gap-y-1.5 border-t pt-3" aria-label="Metas del gráfico">
          {byId
            .filter((goal) => inChart.has(goal.id))
            .map((goal) => (
              <li key={goal.id} className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <span aria-hidden="true" className="size-2 rounded-[2px]" style={{ background: colorOf(goal.id) }} />
                {goal.name}
              </li>
            ))}
        </ul>
      )}
    </section>
  )
}
