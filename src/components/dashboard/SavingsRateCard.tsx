import type { ApiQuery } from '@/hooks/useApiQuery'
import { savingsRate } from '@/lib/dashboard'
import type { MonthlyFlows } from '@/types/movements'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// El medidor llega hasta 40 %; la regla 50/30/20 pone la referencia en 20.
const SCALE = 40
const TARGET = 20
const ARC = 'M20 118 A90 90 0 0 1 200 118'

/** Que parte de lo que entro este año se guardo. Sin ingresos, muestra hasta donde apuntar. */
export function SavingsRateCard({ year }: { year: ApiQuery<MonthlyFlows> }) {
  const rate = year.data ? savingsRate(year.data) : undefined
  const shown = rate === null || rate === undefined ? null : Math.max(0, rate)
  const angle = shown === null ? -90 : -90 + (Math.min(shown, SCALE) / SCALE) * 180

  return (
    <section aria-labelledby="resumen-tasa" className="flex flex-col rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 id="resumen-tasa" className="text-sm font-medium text-muted-foreground">
          Tasa de ahorro
        </h2>
        <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">este año</span>
      </div>
      {rate === undefined ? (
        <Skeleton className="mx-auto mt-6 h-36 w-56" />
      ) : (
        <div className="mt-4 flex flex-col items-center">
          <svg aria-hidden="true" width="236" height="137" viewBox="0 0 220 128" className="max-w-full">
            <path d={ARC} fill="none" stroke="var(--border)" strokeWidth={12} strokeLinecap="round" />
            {shown === null ? (
              <path
                d={ARC} fill="none" stroke="var(--accent-ink)" strokeOpacity={0.55} strokeWidth={12} strokeLinecap="round"
                pathLength={1} strokeDasharray={`${TARGET / SCALE} 1`}
              />
            ) : (
              <path
                d={ARC} fill="none" stroke="var(--accent-ink)" strokeWidth={12} strokeLinecap="round"
                pathLength={1} strokeDasharray={`${Math.min(shown, SCALE) / SCALE} 1`}
              />
            )}
            <line x1={110} y1={20} x2={110} y2={36} stroke="var(--foreground)" strokeWidth={2} opacity={0.5} />
            <text x={110} y={14} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)">
              {TARGET} %
            </text>
            {shown !== null && (
              <>
                <line
                  x1={110} y1={118} x2={110} y2={42}
                  stroke="var(--foreground)" strokeWidth={2.5} strokeLinecap="round"
                  style={{
                    transformBox: 'view-box',
                    transformOrigin: '110px 118px',
                    transform: `rotate(${angle}deg)`,
                    animation: 'needle 1.8s cubic-bezier(.3,1.5,.5,1) .3s both',
                  }}
                />
                <circle cx={110} cy={118} r={6} fill="var(--foreground)" />
              </>
            )}
          </svg>
          <p className="mt-2 flex items-baseline gap-2">
            <span
              className={cn(
                'text-4xl font-semibold tracking-tight tabular-nums',
                shown === null && 'text-muted-foreground',
                rate !== null && rate < 0 && 'text-expense',
              )}
            >
              {rate === null ? TARGET : Math.trunc(rate)} %
            </span>
            <span className="text-xs text-muted-foreground">{shown === null ? 'tu meta para empezar' : 'de lo que ganas'}</span>
          </p>
        </div>
      )}
      <p className="mt-auto pt-4 text-[13px] text-muted-foreground">
        {rate === undefined
          ? ' '
          : shown === null
            ? `Todavía no hay ingresos este año. Apunta a guardar S/ ${TARGET} de cada S/ 100, como sugiere la regla 50/30/20.`
            : rate !== null && rate < 0
              ? 'Este año gastaste más de lo que entró. La regla 50/30/20 sugiere guardar 20 de cada 100.'
              : `De cada S/ 100 que ganaste este año guardaste S/ ${Math.floor(shown)}. La regla 50/30/20 sugiere apartar ${TARGET}.`}
      </p>
    </section>
  )
}
