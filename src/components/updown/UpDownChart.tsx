import { useId } from 'react'
import { FLAT_BAND } from '@/lib/updown'
import type { UpDownChoice } from '@/types/updown'
import { cn } from '@/lib/utils'

const W = 1000
const H = 300
/** Un mes de bolsa: el corte queda siempre en el mismo lugar, revelado o no. */
const FUTURE_DAYS = 21

const TONE: Record<UpDownChoice, string> = { UP: 'text-gain', FLAT: 'text-accent-ink', DOWN: 'text-loss' }

interface UpDownChartProps {
  past: number[]
  future: number[] | null
  outcome?: UpDownChoice
  /** Sin etiquetas: para el celular. */
  compact?: boolean
  className?: string
}

/** Los cierres hasta la noticia y, tapado hasta revelar, el mes siguiente con la franja de "Igual". */
export function UpDownChart({ past, future, outcome, compact = false, className }: UpDownChartProps) {
  const patternId = useId()
  const clipId = useId()
  const total = past.length - 1 + FUTURE_DAYS
  const values = [...past, ...(future ?? []), 100 - FLAT_BAND, 100 + FLAT_BAND]
  const low = Math.min(...values)
  const high = Math.max(...values)
  const pad = (high - low) * 0.08 || 1
  const x = (i: number) => (i / total) * W
  const y = (v: number) => H - ((v - (low - pad)) / (high - low + 2 * pad)) * H
  const line = (points: number[], offset: number) =>
    points.map((v, i) => `${i ? 'L' : 'M'}${x(i + offset).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const pastLine = line(past, 0)
  const cut = x(past.length - 1)
  const cutPercent = `${(cut / W) * 100}%`
  const revealed = future !== null

  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
        role="img"
        aria-label={
          revealed && future
            ? `Precio: el mes siguiente terminó en ${future.at(-1)!.toFixed(1)}, partiendo de 100.`
            : 'Precio hasta el día de la noticia; el mes siguiente está tapado.'
        }
      >
        <defs>
          <pattern id={patternId} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="14" className="stroke-border" strokeWidth="6" />
          </pattern>
          <clipPath id={clipId}>
            <rect
              x={cut}
              width={W - cut}
              height={H}
              className="origin-left [transform-box:fill-box] motion-safe:animate-[updown-wipe_1.2s_ease-out_both]"
            />
          </clipPath>
        </defs>
        <rect
          x={cut}
          width={W - cut}
          y={y(100 + FLAT_BAND)}
          height={y(100 - FLAT_BAND) - y(100 + FLAT_BAND)}
          className="fill-accent-ink/10"
        />
        <path d={`${pastLine} L${cut} ${H} L0 ${H} Z`} className="fill-accent-ink/10" />
        <path d={pastLine} fill="none" className="stroke-accent-ink" strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
        {revealed ? (
          <path
            d={line(future, past.length - 1)}
            fill="none"
            clipPath={`url(#${clipId})`}
            className={cn('stroke-current', outcome && TONE[outcome])}
            strokeWidth="2.8"
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <rect x={cut} width={W - cut} height={H} fill={`url(#${patternId})`} opacity="0.6" />
        )}
      </svg>
      <div aria-hidden="true" className="absolute inset-y-0 border-l-2 border-dashed border-foreground/30" style={{ left: cutPercent }} />
      {!compact && (
        <>
          <span
            aria-hidden="true"
            className="absolute top-1 -translate-x-1/2 rounded-full border bg-card px-2.5 py-0.5 text-xs whitespace-nowrap"
            style={{ left: cutPercent }}
          >
            Día de la noticia
          </span>
          {!revealed && (
            <span
              aria-hidden="true"
              className="absolute inset-y-0 right-0 grid place-items-center font-display text-6xl text-muted-foreground"
              style={{ left: cutPercent }}
            >
              ?
            </span>
          )}
        </>
      )}
    </div>
  )
}
