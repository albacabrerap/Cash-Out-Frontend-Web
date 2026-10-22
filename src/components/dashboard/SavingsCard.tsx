import { TrendingUp } from 'lucide-react'
import type { ApiQuery } from '@/hooks/useApiQuery'
import { formatSoles } from '@/lib/format'
import type { Savings } from '@/types/finance'
import type { MonthlyFlows } from '@/types/movements'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { SavingsBeams } from '@/components/dashboard/SavingsBeams'
import { cn } from '@/lib/utils'

interface SavingsCardProps {
  savings: ApiQuery<Savings>
  year: ApiQuery<MonthlyFlows>
  /** Metas en curso, para explicar lo reservado; undefined mientras cargan. */
  goalsInProgress: number | undefined
}

/** Tu ahorro: el total, como se reparte y, a la derecha, como se fue sumando mes a mes este año. */
export function SavingsCard({ savings, year, goalsInProgress }: SavingsCardProps) {
  const s = savings.data
  // Los meses antes del primer movimiento no cuentan nada: los haces empiezan cuando empezo la cuenta.
  const firstActive = year.data?.months.findIndex((m) => m.income > 0 || m.expense > 0) ?? -1
  const activeMonths = year.data && (firstActive === -1 ? [] : year.data.months.slice(firstActive))
  const reservedHint =
    goalsInProgress === undefined
      ? 'Apartado para tus metas'
      : goalsInProgress === 0
        ? 'No tienes metas en curso'
        : `En ${goalsInProgress} ${goalsInProgress === 1 ? 'meta' : 'metas'} en curso`

  return (
    <section
      aria-labelledby="resumen-ahorro"
      className="grid overflow-hidden rounded-2xl border bg-card lg:min-h-100 lg:grid-cols-[440px_minmax(0,1fr)]"
    >
      <div className="relative z-10 flex flex-col p-6 lg:p-7">
        <p className="flex items-center gap-2 text-xs tracking-wider text-muted-foreground uppercase">
          <TrendingUp className="size-3.5" aria-hidden="true" />
          Tu ahorro
        </p>
        {savings.error && !s ? (
          <ErrorState error={savings.error} onRetry={savings.reload} title="No pudimos cargar tu ahorro" className="mt-4" />
        ) : (
          <>
            <h2 id="resumen-ahorro" className="mt-3 font-display text-4xl leading-tight">
              {s ? (
                <>
                  Tienes <em className="text-accent-ink">{formatSoles(s.currentBalance)}</em> ahorrados.
                </>
              ) : (
                <span className="inline-block h-10 w-72 animate-pulse rounded-md bg-muted" />
              )}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Así se fue sumando este año: cada haz es lo que te quedó en un mes después de tus gastos.
            </p>
            <dl className="mt-8 grid grid-cols-2 lg:mt-auto">
              <div>
                <dt className="text-sm text-muted-foreground">Disponible</dt>
                <dd
                  className={cn(
                    'mt-1.5 text-[1.75rem] leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums',
                    s && s.availableBalance < 0 && 'text-expense',
                  )}
                >
                  {s ? formatSoles(s.availableBalance) : <Skeleton className="h-8 w-32" />}
                </dd>
                <dd className="mt-1 text-xs text-muted-foreground">Para usar sin tocar tus metas</dd>
              </div>
              <div className="border-l pl-5">
                <dt className="text-sm text-muted-foreground">Reservado para metas</dt>
                <dd className="mt-1.5 text-[1.75rem] leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums">
                  {s ? formatSoles(s.committedAmount) : <Skeleton className="h-8 w-28" />}
                </dd>
                <dd className="mt-1 text-xs text-muted-foreground">{reservedHint}</dd>
              </div>
            </dl>
          </>
        )}
      </div>
      <div className="relative h-56 lg:mr-2 lg:h-auto lg:py-7">
        {activeMonths && activeMonths.length > 0 ? (
          <SavingsBeams months={activeMonths} currentMonth={year.data?.to ?? ''} />
        ) : activeMonths ? (
          <p className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
            Todavía no hay movimientos este año.
          </p>
        ) : year.error ? (
          <p className="grid h-full place-items-center px-6 text-center text-sm text-muted-foreground">
            No pudimos cargar tus meses.
          </p>
        ) : (
          <Skeleton className="m-6 h-[calc(100%-3rem)]" />
        )}
      </div>
    </section>
  )
}
