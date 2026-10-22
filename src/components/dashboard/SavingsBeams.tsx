import { formatMonthShort } from '@/lib/cashFlow'
import { savingsBeams } from '@/lib/dashboard'
import type { MonthlyFlow } from '@/types/movements'

const amount = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })
const EASE = 'cubic-bezier(.2,.7,.2,1)'

/** Haces de luz, uno por mes: lo que quedo despues de los gastos. Los meses en rojo quedan cortos. */
export function SavingsBeams({ months, currentMonth }: { months: readonly MonthlyFlow[]; currentMonth: string }) {
  const beams = savingsBeams(months)

  return (
    <div
      aria-hidden="true"
      className="relative h-full min-h-52"
      style={{ maskImage: 'linear-gradient(90deg, transparent 0, #000 16%)' }}
    >
      <svg viewBox="0 0 700 200" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-hidden">
        <defs>
          <linearGradient id="haz-ahorro" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="600" y2="0">
            <stop offset="0" style={{ stopColor: 'var(--accent-ink)', stopOpacity: 0 }} />
            <stop offset="0.65" style={{ stopColor: 'var(--accent-ink)', stopOpacity: 0.55 }} />
            <stop offset="1" style={{ stopColor: 'var(--foreground)', stopOpacity: 1 }} />
          </linearGradient>
          <filter id="haz-brillo" x="-10%" y="-200%" width="120%" height="500%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        {beams.map((beam, i) => {
          const saved = beam.net > 0
          const animation = { animation: `draw 1.1s ${EASE} ${0.15 + i * 0.08}s both` }
          return (
            <g key={beam.month}>
              <line
                x1={-480} y1={100} x2={beam.x} y2={beam.y}
                pathLength={1} strokeDasharray={1}
                stroke={saved ? 'var(--accent-ink)' : 'var(--expense)'} strokeWidth={6} strokeOpacity={0.28}
                filter="url(#haz-brillo)" style={animation}
              />
              <line
                x1={-480} y1={100} x2={beam.x} y2={beam.y}
                pathLength={1} strokeDasharray={1} strokeLinecap="round"
                stroke={saved ? 'url(#haz-ahorro)' : 'var(--expense)'} strokeWidth={1.6}
                style={animation}
              />
            </g>
          )
        })}
      </svg>
      {beams.map((beam, i) => (
        <span
          key={beam.month}
          className="absolute flex -translate-y-1/2 animate-in items-baseline gap-1.5 whitespace-nowrap duration-500 fade-in fill-mode-both"
          style={{ left: `${((beam.x + 16) / 700) * 100}%`, top: `${(beam.y / 200) * 100}%`, animationDelay: `${0.75 + i * 0.08}s` }}
        >
          <span
            className={beam.net > 0 ? 'size-1.5 self-center rounded-full bg-foreground' : 'size-1.5 self-center rounded-full bg-expense'}
            style={{ marginLeft: -12, boxShadow: '0 0 10px currentColor' }}
          />
          <strong className={beam.net > 0 ? 'text-[13px] font-semibold' : 'text-[13px] font-semibold text-expense'}>
            {beam.net < 0 ? '−' : ''}S/ {amount.format(Math.abs(beam.net))}
          </strong>
          <span className="text-[11.5px] text-muted-foreground">
            {formatMonthShort(beam.month)}
            {beam.month === currentMonth && ' · en curso'}
          </span>
        </span>
      ))}
    </div>
  )
}
