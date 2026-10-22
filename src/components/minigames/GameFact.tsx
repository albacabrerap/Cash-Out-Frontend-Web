import { cn } from '@/lib/utils'

export function GameFact({ label, value, tone }: { label: string; value: string; tone?: 'gain' | 'loss' }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-lg font-semibold tabular-nums', tone === 'gain' && 'text-gain', tone === 'loss' && 'text-loss')}>
        {value}
      </dd>
    </div>
  )
}
