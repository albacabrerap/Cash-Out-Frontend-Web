import { gameInitials } from '@/lib/minigames'
import { cn } from '@/lib/utils'

const TONES = [
  'bg-primary text-primary-foreground',
  'bg-secondary text-secondary-foreground',
  'bg-accent text-accent-foreground',
]

/** Las iniciales del juego; el color sale del id para que sea el mismo en todas las pantallas. */
export function GameThumb({ id, title, className }: { id: number; title: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-12 shrink-0 place-items-center rounded-xl text-base font-bold tracking-tight',
        TONES[id % TONES.length],
        className,
      )}
    >
      {gameInitials(title)}
    </span>
  )
}
