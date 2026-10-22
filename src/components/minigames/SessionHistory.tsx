import type { ApiError } from '@/api/errors'
import { formatMonthLong } from '@/lib/cashFlow'
import { todayIso } from '@/lib/dates'
import { formatTokens } from '@/lib/format'
import { formatSignedTokens } from '@/lib/market'
import type { PlayRecord } from '@/lib/minigames'
import { formatDayMonth } from '@/lib/movements'
import { localDate } from '@/lib/portfolioHistory'
import { cn } from '@/lib/utils'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'

const RACE_OUTCOME = { prize: 'Premio', refund: 'Cuota devuelta', none: 'Sin premio' } as const

interface SessionHistoryProps {
  /** undefined mientras cargan. */
  records: PlayRecord[] | undefined
  error: ApiError | undefined
  onRetry: () => void
}

/** Cada partida y cada carrera con lo que dejo en fichas; arriba, el neto del mes. */
export function SessionHistory({ records, error, onRetry }: SessionHistoryProps) {
  const month = todayIso().slice(0, 7)
  const thisMonth = (records ?? []).filter((record) => localDate(record.playedAt).slice(0, 7) === month)
  const net = thisMonth.reduce((sum, record) => sum + record.earned - record.spent, 0)
  const most = Math.max(...(records ?? []).map((record) => Math.abs(record.earned - record.spent)), 0.01)

  return (
    <section aria-labelledby="minijuegos-partidas" className="rounded-2xl border bg-card p-5 lg:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="minijuegos-partidas" className="text-base font-semibold">
          Tus partidas
        </h2>
        {thisMonth.length > 0 && (
          <p className="text-[13px] text-muted-foreground">
            Neto de {formatMonthLong(month)}:{' '}
            <strong className={cn('font-semibold', net > 0 && 'text-gain', net < 0 && 'text-loss')}>{formatSignedTokens(net)}</strong>
          </p>
        )}
      </div>
      {error && !records ? (
        <ErrorState error={error} onRetry={onRetry} title="No pudimos cargar tus partidas" className="mt-3" />
      ) : !records ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
          Todavía no jugaste. Tus partidas aparecerán aquí.
        </p>
      ) : (
        <ul aria-label="Tus partidas" className="mt-2.5">
          {records.map((record) => {
            const recordNet = record.earned - record.spent
            return (
              <li
                key={record.key}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-t py-2.5 text-[13px] sm:grid-cols-[3.5rem_minmax(0,1fr)_6rem_11rem]"
              >
                <span className="text-muted-foreground">{formatDayMonth(localDate(record.playedAt))}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{record.title}</span>
                  <span className="block text-xs text-muted-foreground sm:hidden">{detail(record)}</span>
                </span>
                <span className="hidden text-muted-foreground sm:block">{detail(record)}</span>
                <span className="flex items-center justify-end gap-2">
                  <span aria-hidden="true" className="hidden h-1.5 w-12 rounded-full bg-muted sm:block">
                    <span
                      className={cn('block h-full rounded-full', recordNet >= 0 ? 'bg-gain' : 'bg-loss')}
                      style={{ width: `${(Math.abs(recordNet) / most) * 100}%` }}
                    />
                  </span>
                  <span className="text-right">
                    <span className={cn('block font-medium tabular-nums', recordNet > 0 && 'text-gain', recordNet < 0 && 'text-loss')}>
                      {formatSignedTokens(recordNet)}
                    </span>
                    <span className="block text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                      {record.spent === 0 ? 'Gratis' : `Costó ${formatTokens(record.spent)}`}
                    </span>
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function detail(record: PlayRecord): string {
  return record.kind === 'game' ? `${record.score} / 100` : RACE_OUTCOME[record.outcome]
}
