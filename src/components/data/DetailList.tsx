import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function DetailList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('grid gap-x-6 gap-y-5 sm:grid-cols-2', className)}>{children}</dl>
}

export function DetailItem({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}
