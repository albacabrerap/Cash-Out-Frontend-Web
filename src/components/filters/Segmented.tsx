import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Segmented({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex max-w-full overflow-x-auto rounded-lg bg-muted p-0.5 [scrollbar-width:none]', className)}>
      {children}
    </div>
  )
}

export function SegmentButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'rounded-md px-2.5 py-1 text-[12.5px] whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring',
        pressed ? 'bg-card font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
