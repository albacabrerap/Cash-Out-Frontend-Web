import { useEffect, useId, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315]
const REVEAL_MS = 560

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/**
 * Sol que se vuelve luna. El cambio de tema se abre en un circulo desde el boton
 * (View Transitions) y la tecla D lo alterna, como en React Bits Pro.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const reducedMotion = useReducedMotion()
  const button = useRef<HTMLButtonElement>(null)
  const maskId = useId()
  const dark = resolvedTheme === 'dark'
  const next = dark ? 'light' : 'dark'

  const toggle = () => {
    const apply = () => setTheme(next)
    const el = button.current
    if (reducedMotion || !el || !document.startViewTransition) {
      apply()
      return
    }
    const box = el.getBoundingClientRect()
    const x = box.left + box.width / 2
    const y = box.top + box.height / 2
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const transition = document.startViewTransition(() => flushSync(apply))
    transition.ready
      .then(() =>
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: REVEAL_MS, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' },
        ),
      )
      .catch(() => {})
  }

  // La D cambia el tema, salvo que se este escribiendo.
  const shortcut = useRef(toggle)
  useEffect(() => {
    shortcut.current = toggle
  })
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'd' || event.ctrlKey || event.metaKey || event.altKey || event.repeat || isTyping(event.target)) return
      shortcut.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const motion = 'transition-[transform,opacity] duration-500 ease-[cubic-bezier(.65,0,.35,1)] motion-reduce:transition-none'

  return (
    <button
      ref={button}
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={`${dark ? 'Tema claro' : 'Tema oscuro'} (D)`}
      className={cn(
        'grid size-9 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
        <defs>
          <mask id={maskId}>
            <rect width="24" height="24" fill="white" />
            {/* La sombra que convierte el sol en luna entra desde arriba a la derecha. */}
            <circle cx="17" cy="7" r="6" fill="black" className={motion} style={{ transform: dark ? 'translate(0, 0)' : 'translate(9px, -9px)' }} />
          </mask>
        </defs>
        <circle
          cx="12"
          cy="12"
          fill="currentColor"
          mask={`url(#${maskId})`}
          r="5"
          className={motion}
          style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: dark ? 'scale(1.7)' : 'scale(1)' }}
        />
        <g
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={motion}
          style={{ transformOrigin: '12px 12px', transform: dark ? 'rotate(90deg) scale(0.4)' : 'rotate(0deg) scale(1)', opacity: dark ? 0 : 1 }}
        >
          {RAYS.map((angle) => (
            <line key={angle} x1="12" y1="2.5" x2="12" y2="4" transform={`rotate(${angle} 12 12)`} />
          ))}
        </g>
      </svg>
    </button>
  )
}
