import { useId, useState } from 'react'
import { Link } from 'react-router'
import { Check, HandCoins, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { toCents } from '@/lib/amount'
import { goalPace } from '@/lib/dashboard'
import { formatServerDate, formatSoles } from '@/lib/format'
import { CONTRIBUTION_SOURCE_LABEL, goalAdvice, goalMilestones, goalStatusTone, remainingAmount } from '@/lib/goals'
import { cn } from '@/lib/utils'
import { goalService } from '@/services/goalService'
import type { Contribution, SavingsGoal } from '@/types/goals'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { announceContribution } from './announceContribution'
import { DeleteGoalDescription } from './DeleteGoalDescription'
import { TONE_FILL, TONE_TEXT } from './goalStyles'

const QUICK_AMOUNTS = [20, 50, 100]
const SHOWN_CONTRIBUTIONS = 5

interface GoalDetailPanelProps {
  goal: SavingsGoal
  /** Del mas reciente al mas antiguo; undefined mientras cargan. */
  contributions: Contribution[] | undefined
  /** Saldo que todavia no esta reservado. */
  available: number | undefined
  onChanged: () => void
  onEdit: (goal: SavingsGoal) => void
  onOtherAmount: (goal: SavingsGoal) => void
}

/** La meta elegida en el tablero: como va, sus hitos, sus aportes y lo que se puede hacer con ella. */
export function GoalDetailPanel({ goal, contributions, available, onChanged, onEdit, onOtherAmount }: GoalDetailPanelProps) {
  const [confirming, setConfirming] = useState(false)
  const confirmTitle = useId()
  const pace = goalPace(goal, new Date())
  const { label, tone } = goalStatusTone(goal, pace)
  const advice = goalAdvice(goal, pace)
  const inProgress = goal.status === 'IN_PROGRESS'
  const remaining = remainingAmount(goal)
  const limit = Math.min(toCents(remaining), toCents(available ?? 0))

  const contribute = useAsyncAction(async (amount: number) => {
    try {
      await goalService.contribute(goal.id, { amount, source: 'MANUAL' })
      announceContribution(goal, toCents(amount) === toCents(remaining))
      onChanged()
    } catch (err) {
      toast.error(userMessage(toApiError(err)))
    }
  })

  const remove = useAsyncAction(async () => {
    try {
      await goalService.remove(goal.id)
      toast.success('Meta eliminada')
      onChanged()
    } catch (err) {
      setConfirming(false)
      toast.error(userMessage(toApiError(err)))
    }
  })

  const quick = QUICK_AMOUNTS.filter((amount) => toCents(amount) < toCents(remaining))
  const canFinish = available !== undefined && toCents(remaining) > 0 && toCents(remaining) <= toCents(available)

  return (
    <aside aria-labelledby="meta-detalle" className="rounded-2xl border bg-card p-5 lg:sticky lg:top-20 lg:p-6">
      <p className="text-xs tracking-wider text-muted-foreground uppercase">Detalle de la meta</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <h2 id="meta-detalle" className="text-lg font-semibold break-words">
          {goal.name}
        </h2>
        <span className={cn('mt-1 shrink-0 rounded-full border border-current px-2 py-px text-[11.5px]', TONE_TEXT[tone])}>
          {label}
        </span>
      </div>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[1.75rem] leading-tight font-semibold tracking-tight tabular-nums">
          {formatSoles(goal.accumulatedAmount)}
        </span>
        <span className="text-[13px] text-muted-foreground">de {formatSoles(goal.targetAmount)}</span>
      </p>
      <span className="relative mt-3 block h-2 rounded-full bg-muted">
        <span
          className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-500', TONE_FILL[tone])}
          style={{ width: `${pace.progress * 100}%` }}
        />
        {inProgress && (
          <span
            aria-hidden="true"
            className="absolute -inset-y-1 w-0.5 rounded-sm bg-foreground/55"
            style={{ left: `${pace.elapsed * 100}%` }}
          />
        )}
      </span>
      <p className={cn('mt-2.5 text-[13px] leading-relaxed', advice.tone === 'late' ? 'text-destructive' : 'text-muted-foreground')}>
        {advice.text}
      </p>

      <h3 className="mt-5 text-xs tracking-wider text-muted-foreground uppercase">Hitos</h3>
      <ul className="mt-2 space-y-1.5">
        {goalMilestones(goal).map((milestone) => (
          <li
            key={milestone.share}
            className={cn('flex items-center gap-2.5 text-[13px]', milestone.state === 'pending' && 'text-muted-foreground')}
          >
            <span
              aria-hidden="true"
              className={cn(
                'grid size-5 place-items-center rounded-full border text-[11px]',
                milestone.state === 'done' && 'border-transparent bg-gain text-white',
                milestone.state === 'next' && 'border-accent-ink text-accent-ink',
              )}
            >
              {milestone.state === 'done' ? <Check className="size-3" /> : milestone.state === 'next' ? '•' : null}
            </span>
            <span className="flex-1">
              {milestone.share === 1 ? 'Meta cumplida' : `${milestone.share * 100} % ahorrado`}
              <span className="sr-only">{milestone.state === 'done' ? ' (logrado)' : milestone.state === 'next' ? ' (el siguiente)' : ''}</span>
            </span>
            <span className="font-mono text-xs tabular-nums">{formatSoles(milestone.amount)}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-5 text-xs tracking-wider text-muted-foreground uppercase">Aportes</h3>
      {!contributions ? (
        <div className="mt-2 space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      ) : contributions.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted-foreground">Todavía no hay aportes.</p>
      ) : (
        <>
          <ul className="mt-1.5">
            {contributions.slice(0, SHOWN_CONTRIBUTIONS).map((contribution) => (
              <li key={contribution.id} className="flex items-center gap-2.5 border-b py-1.5 text-[12.5px] last:border-b-0">
                <span className="w-24 text-muted-foreground">{formatServerDate(contribution.createdAt)}</span>
                <span className="flex-1">{CONTRIBUTION_SOURCE_LABEL[contribution.source]}</span>
                <span className="font-mono text-income tabular-nums">+{formatSoles(contribution.amount)}</span>
              </li>
            ))}
          </ul>
          {contributions.length > SHOWN_CONTRIBUTIONS && (
            <Link to={`/metas/${goal.id}`} className="mt-1.5 inline-block text-[12.5px] font-medium underline-offset-4 hover:underline">
              Ver los {contributions.length} aportes
            </Link>
          )}
        </>
      )}

      {inProgress && (
        <div className="mt-5">
          <p className="text-[12.5px] text-muted-foreground">
            Aportar desde lo disponible
            {available !== undefined && <> · tienes {formatSoles(available)}</>}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quick.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={contribute.isPending || toCents(amount) > limit}
                onClick={() => contribute.run(amount)}
              >
                + {formatSoles(amount).replace(/\.00$/, '')}
              </Button>
            ))}
            {canFinish && (
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                disabled={contribute.isPending}
                onClick={() => contribute.run(remaining)}
              >
                Lo que falta ({formatSoles(remaining)})
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onOtherAmount(goal)}>
              <HandCoins aria-hidden="true" />
              Otro monto
            </Button>
          </div>
        </div>
      )}

      <p className="mt-4 rounded-xl bg-accent px-3.5 py-3 text-[12.5px] leading-relaxed">
        {goal.status === 'COMPLETED'
          ? 'Por cumplirla ganaste fichas para invertir en el mercado simulado.'
          : goal.status === 'EXPIRED'
            ? 'Una meta vencida ya no se puede aportar ni editar.'
            : 'Cuando la cumplas ganas fichas para invertir en el mercado simulado.'}
      </p>

      {confirming ? (
        <div role="group" aria-labelledby={confirmTitle} className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5">
          <p id={confirmTitle} className="text-sm font-semibold">
            ¿Eliminar esta meta?
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            <DeleteGoalDescription goal={goal} />
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" autoFocus onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" disabled={remove.isPending} onClick={() => remove.run()}>
              Eliminar meta
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          {inProgress && (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(goal)}>
              <Pencil aria-hidden="true" />
              Editar
            </Button>
          )}
          <Button variant="outline" size="sm" className="flex-1 text-destructive" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden="true" />
            Eliminar
          </Button>
        </div>
      )}
    </aside>
  )
}
