import { cn } from '@/lib/utils'
import { Reveal } from './Reveal'

interface SectionHeadingProps {
  id?: string
  title: string
  /** Segunda linea, en cursiva. */
  accent: string
  description?: string
  align?: 'center' | 'start'
  className?: string
}

export function SectionHeading({ id, title, accent, description, align = 'center', className }: SectionHeadingProps) {
  return (
    <div className={cn('flex flex-col gap-4', align === 'center' ? 'items-center text-center' : 'items-start', className)}>
      <h2 id={id} className="font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">
        <Reveal as="span" className="block">
          {title}
        </Reveal>{' '}
        <Reveal as="span" delay={120} className="block">
          <em className="text-accent-ink">{accent}</em>
        </Reveal>
      </h2>
      {description && (
        <Reveal as="p" delay={240} className="max-w-xl text-pretty text-muted-foreground">
          {description}
        </Reveal>
      )}
    </div>
  )
}
