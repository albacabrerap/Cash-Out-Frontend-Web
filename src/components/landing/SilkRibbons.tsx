import { useEffect, useId, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

const WIDTH = 1440
const HEIGHT = 800
const SAMPLES = 56

interface Pointer {
  x: number
  y: number
}

const CENTER: Pointer = { x: 0.5, y: 0.5 }

// [base, amplitud, largo de onda, fase, velocidad, cuanto la jala el puntero]
const LAYERS = [
  [200, 40, 300, 4.1, 0.6, 0.3],
  [330, 48, 260, 0, 0.75, 0.5],
  [450, 56, 210, 1.3, 0.9, 0.75],
  [590, 50, 180, 2.6, 1.1, 1],
] as const

const THREADS = Array.from({ length: 10 }, (_, k) => ({
  base: 440 + k * 10,
  amp: 60 - k * 2.5,
  len: 210 + k * 5,
  phase: 2.4 + k * 0.05,
  width: k % 3 === 0 ? 2 : 1,
  opacity: 0.42 - k * 0.035,
}))

function wave(base: number, amp: number, len: number, phase: number, t: number, pointer: Pointer, pull: number) {
  const bend = (pointer.y - 0.5) * 180 * pull
  const points: string[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const x = (i / SAMPLES) * WIDTH
    // La curva se dobla hacia el puntero solo cerca de su x.
    const near = Math.exp(-(((x / WIDTH - pointer.x) * 3) ** 2))
    const y =
      base +
      Math.sin(x / len + t * 0.9 + phase) * amp +
      Math.sin(x / (len * 0.47) - t * 0.6 + phase * 1.7) * amp * 0.45 +
      bend * near
    points.push(`${x.toFixed(1)} ${y.toFixed(1)}`)
  }
  return `M${points.join(' L')}`
}

function shapes(t: number, pointer: Pointer) {
  return [
    ...LAYERS.map(
      ([base, amp, len, phase, speed, pull]) =>
        `${wave(base, amp, len, phase, t * speed, pointer, pull)} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`,
    ),
    ...THREADS.map(({ base, amp, len, phase }) => wave(base, amp, len, phase, t, pointer, 0.85)),
  ]
}

const STILL = shapes(0, CENTER)

export interface SilkRibbonsProps {
  /** 6 colores, de la capa mas alta a la mas cercana. */
  colors: readonly string[]
  className?: string
}

/** Cintas de tela con hilos que ondulan y se doblan hacia el puntero. */
export function SilkRibbons({ colors, className }: SilkRibbonsProps) {
  const id = useId().replace(/[^\w-]/g, '')
  const svgRef = useRef<SVGSVGElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || reduced) return
    // Se escribe el d directo en el DOM: React no re-renderiza nada por cuadro.
    const paths = svg.querySelectorAll<SVGPathElement>('[data-ribbon]')
    const pointer = { ...CENTER }
    const target = { ...CENTER }
    let time = 0
    let last = 0
    let frame = 0

    const onMove = (event: PointerEvent) => {
      const rect = svg.getBoundingClientRect()
      target.x = (event.clientX - rect.left) / rect.width
      target.y = (event.clientY - rect.top) / rect.height
    }

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      // A ~30 fps basta para ondas lentas y el desenfoque cuesta la mitad.
      if (now - last < 33) return
      if (last) time += Math.min(now - last, 100) / 1000
      last = now
      pointer.x += (target.x - pointer.x) * 0.06
      pointer.y += (target.y - pointer.y) * 0.06
      shapes(time, pointer).forEach((d, i) => paths[i]?.setAttribute('d', d))
    }

    frame = requestAnimationFrame(tick)
    window.addEventListener('pointermove', onMove)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [reduced])

  const [s1, s2, s3, s4, s5, s6] = colors
  // La capa de arriba ya es un degradado: con desenfoque Chrome le marcaba un borde recto.
  const fills = [
    { fill: `url(#${id}-top)` },
    { fill: `url(#${id}-a)`, filter: `url(#${id}-soft)` },
    { fill: `url(#${id}-b)` },
    { fill: `url(#${id}-c)`, opacity: 0.95 },
  ]

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className={cn('pointer-events-none block', className)}
    >
      <defs>
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s1} stopOpacity="0" />
          <stop offset="1" stopColor={s1} stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={s1} />
          <stop offset="1" stopColor={s2} />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s2} />
          <stop offset="0.6" stopColor={s3} />
          <stop offset="1" stopColor={s4} />
        </linearGradient>
        <linearGradient id={`${id}-c`} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor={s4} />
          <stop offset="0.5" stopColor={s5} />
          <stop offset="1" stopColor={s6} />
        </linearGradient>
        <filter id={`${id}-soft`} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      {fills.map((props, i) => (
        <path key={`capa-${i}`} data-ribbon d={STILL[i]} {...props} />
      ))}
      {THREADS.map(({ width, opacity }, k) => (
        <path
          key={`hilo-${k}`}
          data-ribbon
          d={STILL[LAYERS.length + k]}
          fill="none"
          stroke="#ffffff"
          strokeWidth={width}
          strokeOpacity={opacity}
        />
      ))}
    </svg>
  )
}
