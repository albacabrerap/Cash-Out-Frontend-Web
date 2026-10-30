import { formatChange } from '@/lib/format'
import { formatScore, SECTOR_COLORS } from '@/lib/portfolioGame'
import type { PortfolioGamePlayer, PortfolioResult, PortfolioSector, Weights } from '@/types/portfolioGame'
import { cn } from '@/lib/utils'

const points = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })

/** El reparto como una barra apilada, en el orden de los sectores. */
export function MixBar({ weights, sectors, className }: { weights: Weights; sectors: PortfolioSector[]; className?: string }) {
  const parts = sectors.filter((sector) => (weights[sector.key] ?? 0) > 0)
  const label = parts.map((sector) => `${sector.name} ${weights[sector.key]} %`).join(', ')

  return (
    <div role="img" aria-label={label || 'Sin reparto'} className={cn('flex h-2 overflow-hidden rounded-full bg-muted', className)}>
      {parts.map((sector) => (
        <span key={sector.key} style={{ width: `${weights[sector.key]}%`, background: SECTOR_COLORS[sector.key] }} />
      ))}
    </div>
  )
}

/** Lo que rindio cada sector en la etapa, en verde o rojo. */
export function SectorReturns({ sectors, returns }: { sectors: PortfolioSector[]; returns: Record<string, number> }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {sectors.map((sector) => {
        const value = returns[sector.key] ?? 0
        return (
          <li
            key={sector.key}
            className={cn('rounded-xl border px-3 py-2.5', value >= 0 ? 'border-gain/30 bg-gain/10' : 'border-loss/30 bg-loss/10')}
          >
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: SECTOR_COLORS[sector.key] }} />
              {sector.name}
            </p>
            <p className={cn('font-mono text-lg font-semibold tabular-nums', value >= 0 ? 'text-gain' : 'text-loss')}>
              {formatChange(value)}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

interface PortfolioBoardProps {
  ranking: PortfolioGamePlayer[]
  sectors: PortfolioSector[]
  benchmark: PortfolioResult | null
}

/** Ranking con valor, retorno, riesgo y puntaje; la referencia del S&P 500 va aparte, sin puesto. */
export function PortfolioBoard({ ranking, sectors, benchmark }: PortfolioBoardProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          <th scope="col" className="w-6 pb-2 font-normal">
            #
          </th>
          <th scope="col" className="pb-2 font-normal">
            Jugador
          </th>
          <th scope="col" className="pb-2 text-right font-normal">
            Valor
          </th>
          <th scope="col" className="pb-2 text-right font-normal">
            Retorno
          </th>
          <th scope="col" className="hidden pb-2 text-right font-normal sm:table-cell">
            Riesgo
          </th>
          <th scope="col" className="pb-2 text-right font-normal">
            Puntaje
          </th>
        </tr>
      </thead>
      <tbody>
        {ranking.map((player) => (
          <tr key={player.id} className={cn('border-t', player.me && 'bg-accent/60')}>
            <td className="py-2 font-mono text-muted-foreground">{player.rank}</td>
            <td className="py-2 pr-3">
              <span className="font-medium">{player.name}</span>
              {player.weights && <MixBar weights={player.weights} sectors={sectors} className="mt-1 h-1.5 max-w-40" />}
            </td>
            <ResultCells result={player.result} />
          </tr>
        ))}
        {benchmark && (
          <tr className="border-t border-dashed text-muted-foreground">
            <td />
            <td className="py-2 pr-3">
              <span className="sm:hidden">S&P 500</span>
              <span className="hidden sm:inline">Referencia: todo en el S&P 500</span>
            </td>
            <ResultCells result={benchmark} />
          </tr>
        )}
      </tbody>
    </table>
  )
}

function ResultCells({ result }: { result: PortfolioResult | null }) {
  if (!result) return <td colSpan={4} />
  const number = 'py-2 pl-2 text-right font-mono whitespace-nowrap tabular-nums'
  return (
    <>
      <td className={number}>{points.format(result.value)}</td>
      <td className={cn(number, result.returnPercent >= 0 ? 'text-gain' : 'text-loss')}>{formatChange(result.returnPercent)}</td>
      <td className={cn(number, 'hidden sm:table-cell')}>{result.risk === null ? '—' : formatChange(result.risk).replace('+', '')}</td>
      <td className={cn(number, 'font-semibold')}>{formatScore(result.score)}</td>
    </>
  )
}
