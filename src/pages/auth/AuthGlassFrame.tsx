import { Fragment, type ReactNode } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { RIBBON_COLORS } from '@/components/landing/palettes'
import { SilkRibbons } from '@/components/landing/SilkRibbons'

export const AUTH_FORM_ENTER = 'animate-in fade-in slide-in-from-bottom-3 duration-700 fill-mode-both delay-700'
export const AUTH_INPUT = 'h-11 rounded-xl bg-background/70 dark:bg-background/40'

const WORD = 'inline-block animate-in fade-in blur-in-md slide-in-from-bottom-2 duration-700 fill-mode-both'

/** Cintas animadas de fondo y el contenido encima, en una tarjeta de vidrio. */
export function AuthGlassFrame({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme()

  // -mt-14 mete las cintas bajo la barra de vidrio de PublicLayout.
  return (
    <div className="relative isolate -mt-14 flex flex-1 items-center justify-center overflow-hidden px-4 pt-26 pb-12 sm:pt-30 sm:pb-16">
      <SilkRibbons colors={RIBBON_COLORS[resolvedTheme]} className="absolute inset-0 -z-10 size-full" />
      <div className="w-full max-w-md rounded-[28px] border border-foreground/10 bg-background/70 p-7 shadow-[0_40px_80px_-36px_rgb(63_64_88/0.45)] backdrop-blur-xl backdrop-saturate-150 sm:p-10 dark:shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)]">
        {children}
      </div>
    </div>
  )
}

interface AuthHeadingProps {
  title: string
  /** Ultima palabra, en cursiva. */
  accent: string
  description: string
  align?: 'center' | 'start'
}

/** Titulo que entra palabra por palabra, desenfocado al principio. */
export function AuthHeading({ title, accent, description, align = 'center' }: AuthHeadingProps) {
  const words = title.split(' ')

  return (
    <div className={cn('space-y-3', align === 'center' && 'text-center')}>
      <h1
        className={cn(
          'font-display leading-none tracking-tight',
          align === 'center' ? 'text-5xl' : 'text-[2.5rem]',
        )}
      >
        {words.map((word, i) => (
          <Fragment key={i}>
            <span className={WORD} style={{ animationDelay: `${100 + i * 100}ms` }}>
              {word}
            </span>{' '}
          </Fragment>
        ))}
        <em className={cn(WORD, 'text-accent-ink')} style={{ animationDelay: `${100 + words.length * 100}ms` }}>
          {accent}
        </em>
      </h1>
      <p className="animate-in fade-in slide-in-from-bottom-3 text-pretty text-muted-foreground duration-700 fill-mode-both delay-500">
        {description}
      </p>
    </div>
  )
}
