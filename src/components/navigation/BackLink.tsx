import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
      <Link to={to}>
        <ArrowLeft aria-hidden="true" />
        {children}
      </Link>
    </Button>
  )
}
