import { formatRaceDate } from '@/lib/race'
import { formatChange } from '@/lib/format'
import { choiceMeta } from '@/lib/updown'
import type { UpDownOption, UpDownPlayer, UpDownReveal } from '@/types/updown'
import { cn } from '@/lib/utils'

const BAR: Record<string, string> = { UP: 'bg-gain', FLAT: 'bg-accent-ink', DOWN: 'bg-loss' }
const points = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })

/** Cuanto vota la sala por cada opcion; al revelar se marca la que gano. */
export function VoteTally({ options, answered, winner }: { options: UpDownOption[]; answered: number; winner?: string }) {
  return (
    <ul className="space-y-3">
      {options.map((option) => {
        const meta = choiceMeta(option.choice)
        const share = answered ? Math.round((option.votes / answered) * 100) : 0
        return (
          <li key={option.choice}>
            <div className="flex justify-between text-sm">
              <span className={cn('font-semibold', meta.tone)}>
                {meta.icon} {meta.label}
                {winner === option.choice && <span className="ml-1.5 text-xs font-normal text-muted-foreground">· ganó</span>}
              </span>
              <span className="font-mono text-muted-foreground tabular-nums">{share} %</span>
            </div>
            <div aria-hidden="true" className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-[width] duration-500', BAR[option.choice], winner && winner !== option.choice && 'opacity-35')}
                style={{ width: `${share}%` }}
              />
            </div>
            {option.votes > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {option.votes} {option.votes === 1 ? 'voto' : 'votos'} · apuesta promedio {points.format(option.averageBet)} pts
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Que era, que hizo el mes siguiente y por que. */
export function LessonCard({ reveal, className }: { reveal: UpDownReveal; className?: string }) {
  const meta = choiceMeta(reveal.outcome)

  return (
    <div className={cn('grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-[auto_1fr] sm:items-center', className)}>
      <div className="text-center">
        <p className={cn('font-mono text-3xl font-semibold tabular-nums', meta.tone)}>
          {formatChange(reveal.changePercent)}
        </p>
        <p className="text-xs text-muted-foreground">
          {meta.icon} {meta.label} · el mes siguiente
        </p>
      </div>
      <div>
        <p className="font-medium">
          Era {reveal.name}, el {formatRaceDate(reveal.date)}.
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{reveal.lesson}</p>
      </div>
    </div>
  )
}

interface UpDownRankingProps {
  ranking: UpDownPlayer[]
  /** Muestra lo que gano o perdio cada uno en la ronda revelada. */
  showDelta?: boolean
  limit?: number
}

export function UpDownRanking({ ranking, showDelta = false, limit }: UpDownRankingProps) {
  const rows = limit ? ranking.slice(0, limit) : ranking

  return (
    <ol className="space-y-1" aria-label="Ranking">
      {rows.map((player) => (
        <li
          key={player.id}
          className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm', player.me && 'bg-accent/60')}
        >
          <span className="w-5 font-mono text-muted-foreground tabular-nums">{player.rank}</span>
          <span className="min-w-0 flex-1 truncate font-medium">
            {player.name}
            {player.me && <span className="ml-1.5 text-xs text-muted-foreground">(tú)</span>}
          </span>
          {showDelta && player.delta !== 0 && (
            <span className={cn('font-mono text-xs tabular-nums', player.delta > 0 ? 'text-gain' : 'text-loss')}>
              {player.delta > 0 ? '+' : '−'}
              {points.format(Math.abs(player.delta))}
            </span>
          )}
          <span className="font-mono font-medium tabular-nums">{points.format(player.points)}</span>
        </li>
      ))}
    </ol>
  )
}
