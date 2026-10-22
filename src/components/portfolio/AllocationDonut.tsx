import { formatTokens } from '@/lib/format'
import type { Position } from '@/types/market'
import { Skeleton } from '@/components/ui/skeleton'

const RADIUS = 48
// Hueco entre porciones, en centesimas de la vuelta.
const GAP = 0.8

interface AllocationDonutProps {
  tokens: number | undefined
  positions: Position[] | undefined
  colorOf: (assetId: number) => string
}

/** Todo lo que tienes en fichas: lo libre y lo invertido en cada activo. */
export function AllocationDonut({ tokens, positions, colorOf }: AllocationDonutProps) {
  if (tokens === undefined || !positions) {
    return <Skeleton className="h-56 rounded-2xl" />
  }
  const slices = [
    { key: 'libres', label: 'Fichas libres', value: tokens, color: 'var(--muted-foreground)' },
    ...positions
      .filter((position) => (position.marketValue ?? 0) > 0)
      .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0))
      .map((position) => ({
        key: String(position.assetId),
        label: position.symbol,
        value: position.marketValue ?? 0,
        color: colorOf(position.assetId),
      })),
  ]
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const withShare = slices.reduce<((typeof slices)[number] & { share: number; start: number })[]>((done, slice) => {
    const previous = done.at(-1)
    const share = total > 0 ? (slice.value / total) * 100 : 0
    return [...done, { ...slice, share, start: previous ? previous.start + previous.share : 0 }]
  }, [])
  const biggest = withShare.slice(1).sort((a, b) => b.value - a.value)[0]

  return (
    <section aria-labelledby="portafolio-reparto" className="rounded-2xl border bg-card p-5">
      <h2 id="portafolio-reparto" className="text-base font-semibold">
        Cómo se reparte
      </h2>
      <div className="mt-3 flex items-center gap-5">
        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
            <circle cx={60} cy={60} r={RADIUS} fill="none" stroke="var(--muted)" strokeWidth={14} />
            {withShare
              .filter((slice) => slice.share > 0)
              .map((slice) => {
                const length = Math.max(slice.share - GAP, 0.2)
                return (
                  <circle
                    key={slice.key}
                    cx={60}
                    cy={60}
                    r={RADIUS}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={14}
                    pathLength={100}
                    strokeDasharray={`${length} ${100 - length}`}
                    strokeDashoffset={-slice.start}
                  />
                )
              })}
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] text-muted-foreground">Total</span>
            <strong className="text-sm font-semibold tabular-nums">{formatTokens(total).replace(' fichas', '')}</strong>
          </span>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5 text-[12.5px]">
          {withShare.map((slice) => (
            <li key={slice.key} className="flex items-center gap-2">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-[2px]" style={{ background: slice.color }} />
              <span className="min-w-0 flex-1 truncate">{slice.label}</span>
              <span className="text-muted-foreground tabular-nums">{Math.round(slice.share)} %</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
        {biggest
          ? `${biggest.label} es tu mayor inversión: ${Math.round(biggest.share)} % de todo lo que tienes. Tienes ${Math.round(withShare[0].share)} % en fichas sin invertir.`
          : 'Todavía no inviertes: todas tus fichas están libres.'}
      </p>
    </section>
  )
}
