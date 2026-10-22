import { useState } from 'react'
import { NavLink } from 'react-router'
import { Menu } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { navItemsFor } from '@/routes/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'

function linkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
  )
}

export function MainNav({ className }: { className?: string }) {
  const { user } = useAuth()
  const items = navItemsFor(user)

  return (
    <nav aria-label="Principal" className={className}>
      <ul className="flex items-center gap-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={linkClass}>
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function MobileNav({ homePath }: { homePath: string }) {
  const { user } = useAuth()
  const items = navItemsFor(user)
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle asChild>
            <div>
              <Logo to={homePath} />
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">Secciones de Cash-Out</SheetDescription>
        </SheetHeader>
        <nav aria-label="Principal" className="px-4">
          <ul className="flex flex-col gap-1">
            {items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={linkClass} onClick={() => setOpen(false)}>
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
