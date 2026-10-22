import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

const MAX_PARTICLES = 140

// Semilla fija: las particulas arrancan en el mismo lugar en cada carga.
let seed = 11
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647

const SEEDS = Array.from({ length: MAX_PARTICLES }, () => {
  const roll = random()
  return {
    x: random(),
    start: random(),
    speed: 14 + random() * 38,
    radius: roll > 0.92 ? 3.2 + random() * 2.4 : 1.1 + random() * 1.9,
    sway: 6 + random() * 22,
    swayRate: 0.25 + random() * 0.6,
    phase: random() * Math.PI * 2,
    twinkle: random() * Math.PI * 2,
    kind: roll < 0.5 ? 0 : roll < 0.82 ? 1 : 2,
    depth: 0.4 + random() * 0.6,
  }
})

/** Punto difuso pre-dibujado: pintar una imagen por particula es mucho mas barato que un degradado. */
function sprite(color: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, color)
    gradient.addColorStop(0.3, `${color}80`)
    gradient.addColorStop(1, `${color}00`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
  }
  return canvas
}

export interface RisingParticlesProps {
  /** 3 colores en hex de 6 digitos; se reparten 50, 32 y 18 % de las particulas. */
  colors: readonly string[]
  /** Hex de 6 digitos del brillo que sube desde la base. */
  glow: string
  /** Particulas en una pantalla de 1280 px; en pantallas angostas salen menos. */
  count?: number
  className?: string
}

/** Particulas que suben despacio, titilan y se corren un poco con el puntero. */
export function RisingParticles({ colors, glow, count = 80, className }: RisingParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Fuera del efecto para que cambiar de tema no reinicie el recorrido.
  const timeRef = useRef(12)
  const reduced = useReducedMotion()
  const palette = colors.join()

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const sprites = palette.split(',').map(sprite)
    const pointer = { x: 0.5, y: 0.5 }
    const target = { x: 0.5, y: 0.5 }
    let width = 0
    let height = 0
    let halo: CanvasGradient | null = null
    let frame = 0
    let last = 0

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.max(1, Math.round(width * ratio))
      canvas.height = Math.max(1, Math.round(height * ratio))
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      halo = ctx.createRadialGradient(width / 2, height * 1.05, 0, width / 2, height * 1.05, Math.max(width, height) * 0.8)
      halo.addColorStop(0, `${glow}e6`)
      halo.addColorStop(0.55, `${glow}40`)
      halo.addColorStop(1, `${glow}00`)
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height)
      if (halo) {
        ctx.globalAlpha = 0.7 + 0.15 * Math.sin(t * 0.35)
        ctx.fillStyle = halo
        ctx.fillRect(0, 0, width, height)
      }
      const span = height + 120
      const shiftX = (pointer.x - 0.5) * -40
      const shiftY = (pointer.y - 0.5) * -24
      const visible = Math.round(count * Math.min(1, Math.max(0.45, width / 1280)))
      for (const p of SEEDS.slice(0, visible)) {
        const travel = (p.start * span + t * p.speed) % span
        const life = travel / span
        const fade = Math.min(1, life / 0.12) * Math.min(1, (1 - life) / 0.4)
        const size = p.radius * 6
        const x = p.x * width + Math.sin(t * p.swayRate + p.phase) * p.sway + shiftX * p.depth
        const y = height + 60 - travel + shiftY * p.depth
        ctx.globalAlpha = fade * (0.7 + 0.3 * Math.sin(t * 1.6 + p.twinkle)) * (0.5 + p.depth * 0.5)
        ctx.drawImage(sprites[p.kind], x - size / 2, y - size / 2, size, size)
      }
      ctx.globalAlpha = 1
    }

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      target.x = (event.clientX - rect.left) / rect.width
      target.y = (event.clientY - rect.top) / rect.height
    }

    const tick = (now: number) => {
      if (last) timeRef.current += Math.min(now - last, 100) / 1000
      last = now
      pointer.x += (target.x - pointer.x) * 0.05
      pointer.y += (target.y - pointer.y) * 0.05
      draw(timeRef.current)
      frame = requestAnimationFrame(tick)
    }

    const resizeObserver = new ResizeObserver(() => {
      resize()
      draw(timeRef.current)
    })
    resizeObserver.observe(canvas)
    resize()
    draw(timeRef.current)

    if (!reduced) {
      frame = requestAnimationFrame(tick)
      window.addEventListener('pointermove', onMove)
    }

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener('pointermove', onMove)
    }
  }, [reduced, palette, glow, count])

  return <canvas ref={canvasRef} aria-hidden="true" className={cn('pointer-events-none block', className)} />
}
