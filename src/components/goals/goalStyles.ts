import type { GoalTone } from '@/lib/goals'

/** Los mismos colores que la tarjeta de metas del resumen. */
export const TONE_TEXT: Record<GoalTone, string> = {
  late: 'text-destructive',
  ok: 'text-gain',
  done: 'text-success',
  expired: 'text-muted-foreground',
}

export const TONE_FILL: Record<GoalTone, string> = {
  late: 'bg-destructive',
  ok: 'bg-accent-ink',
  done: 'bg-success',
  expired: 'bg-muted-foreground',
}

export const TONE_STROKE: Record<GoalTone, string> = {
  late: 'var(--destructive)',
  ok: 'var(--accent-ink)',
  done: 'var(--success)',
  expired: 'var(--muted-foreground)',
}
