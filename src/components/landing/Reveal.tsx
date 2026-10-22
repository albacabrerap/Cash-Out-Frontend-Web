import { useCallback, useState, type ReactNode } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

interface RevealProps {
  as?: 'div' | 'li' | 'p' | 'span'
  /** Milisegundos; escalona los elementos que entran juntos. */
  delay?: number
  className?: string
  children: ReactNode
}

/** Aparece subiendo y enfocandose la primera vez que entra en pantalla. */
export function Reveal({ as: Tag = 'div', delay = 0, className, children }: RevealProps) {
  // Sin IntersectionObserver (jsdom o navegadores viejos) se muestra de entrada.
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')
  const reduced = useReducedMotion()
  const shown = seen || reduced

  const observe = useCallback((node: HTMLElement | null) => {
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setSeen(true)
        observer.disconnect()
      },
      { rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={observe}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        'transition-[opacity,translate,filter] duration-700 ease-out',
        !shown && 'translate-y-6 opacity-0 blur-xs',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
