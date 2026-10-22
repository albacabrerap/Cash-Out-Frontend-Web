import { formatSignedPercent } from '@/lib/market'
import type { RaceRacer } from '@/types/race'
import { cn } from '@/lib/utils'

const ROW = 52

interface RaceRankingProps {
  ranking: RaceRacer[]
  /** Mostrar cuanto tiene invertido cada uno: en el proyector ayuda a leer las estrategias. */
  showInvested?: boolean
}

/**
 * Las filas se dibujan siempre en el mismo orden y se mueven con `top`: si
 * React las reordenara en el DOM, el cambio de puesto no se animaria.
 */
export function RaceRanking({ ranking, showInvested = true }: RaceRankingProps) {
  const rows = [...ranking].sort((a, b) => a.id - b.id)

  return (
    <ol className="relative" style={{ height: ranking.length * ROW }} aria-label="Ranking de la carrera">
      {rows.map((racer) => (
        <li
          key={racer.id}
          className={cn(
            'absolute inset-x-0 flex items-center gap-3 rounded-xl px-3 transition-[top] duration-500 ease-out motion-reduce:transition-none',
            racer.me && 'bg-accent/60',
          )}
          style={{ top: (racer.rank - 1) * ROW, height: ROW - 4 }}
          aria-label={`Puesto ${racer.rank}: ${racer.name}, ${formatSignedPercent(racer.returnPercent)}`}
        >
          <span className="w-6 font-mono text-sm text-muted-foreground tabular-nums">{racer.rank}</span>
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
          >
            {racer.name.charAt(0).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">
              {racer.name}
              {racer.me && <span className="ml-1.5 text-xs text-muted-foreground">(tú)</span>}
            </span>
            {showInvested && (
              <span className="text-xs text-muted-foreground tabular-nums">
                Invertido {Math.round(racer.investedPercent)} %
              </span>
            )}
          </span>
          <span
            className={cn(
              'ml-auto font-mono text-sm font-medium tabular-nums',
              racer.returnPercent >= 0 ? 'text-gain' : 'text-loss',
            )}
          >
            {formatSignedPercent(racer.returnPercent)}
          </span>
        </li>
      ))}
    </ol>
  )
}
