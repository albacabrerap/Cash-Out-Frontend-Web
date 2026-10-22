import { formatSoles } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ProjectionOutcome } from '@/types/projections'
import { Skeleton } from '@/components/ui/skeleton'

interface OutcomeCardsProps {
  /** Del backend; undefined mientras llega, null si los parametros no son validos. */
  outcome: ProjectionOutcome | null | undefined
  stale: boolean
}

/** Las tres formas de guardar la misma plata, con la del interes compuesto destacada. */
export function OutcomeCards({ outcome, stale }: OutcomeCardsProps) {
  if (outcome === null) return null
  if (outcome === undefined) {
    return (
      <div className="grid gap-5 md:grid-cols-3" aria-busy="true">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-52 rounded-2xl" />
        ))}
      </div>
    )
  }

  const simpleInterest = outcome.simpleFinalAmount - outcome.totalContributed
  const compoundInterest = outcome.compoundFinalAmount - outcome.totalContributed
  const most = Math.max(simpleInterest, compoundInterest, 0.01)
  const options = [
    {
      title: 'Sin interés',
      text: 'Guardarlo en casa o en una cuenta que no paga nada.',
      total: outcome.totalContributed,
      detail: 'solo lo que aportas',
      share: 0,
      fill: 'bg-muted-foreground',
      note: 'Es el punto de partida para comparar.',
      featured: false,
    },
    {
      title: 'Interés simple',
      text: 'El interés se calcula solo sobre lo que aportaste, nunca sobre el interés ganado.',
      total: outcome.simpleFinalAmount,
      detail: `${formatSoles(simpleInterest)} son interés`,
      share: simpleInterest / most,
      fill: 'bg-muted-foreground',
      note: `+${formatSoles(simpleInterest)} frente a no ganar interés`,
      featured: false,
    },
    {
      title: 'Interés compuesto',
      text: 'El interés de cada mes se suma al saldo y también gana interés.',
      total: outcome.compoundFinalAmount,
      detail: `${formatSoles(compoundInterest)} son interés`,
      share: compoundInterest / most,
      fill: 'bg-accent-ink',
      note: `+${formatSoles(outcome.difference)} más que con interés simple`,
      featured: true,
    },
  ]

  return (
    <div aria-busy={stale} className={cn('grid gap-5 transition-opacity md:grid-cols-3', stale && 'opacity-60')}>
      {options.map((option) => (
        <section
          key={option.title}
          aria-label={option.title}
          className={cn(
            'flex flex-col rounded-2xl border bg-card p-5 lg:p-6',
            option.featured && 'border-accent-ink shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent-ink)_15%,transparent)]',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{option.title}</h3>
            {option.featured && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[11.5px] text-accent-ink">Así crece tu ahorro</span>
            )}
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{option.text}</p>
          <p className="mt-auto pt-4 text-[1.75rem] leading-tight font-semibold tracking-tight tabular-nums">{formatSoles(option.total)}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{option.detail}</p>
          <span className="mt-4 block h-2 rounded-full bg-muted" aria-hidden="true">
            <span className={cn('block h-full rounded-full transition-[width]', option.fill)} style={{ width: `${option.share * 100}%` }} />
          </span>
          <p className={cn('mt-2.5 text-[13px]', option.featured ? 'text-gain' : 'text-muted-foreground')}>{option.note}</p>
        </section>
      ))}
    </div>
  )
}
