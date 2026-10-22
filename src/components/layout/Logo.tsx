import { Link } from 'react-router'
import { cn } from '@/lib/utils'

export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link
      to={to}
      aria-label="Cash-Out, ir al inicio"
      className={cn('flex items-center gap-0.5 rounded-md font-bold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
    >
      <span className="font-[Radio_Canada_Big,Geist_Variable,ui-sans-serif,sans-serif]">CASH-</span>
      <img src="/cashout-chip.svg" alt="" aria-hidden="true" className="size-7 shrink-0" />
      <span className="font-[Radio_Canada_Big,Geist_Variable,ui-sans-serif,sans-serif]">UT</span>
    </Link>
  )
}
