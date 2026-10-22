import { NavLink } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SectionTab {
  to: string
  label: string
  icon: LucideIcon
  /** Solo activa con la ruta exacta (para la pestana que es la raiz de la seccion). */
  end?: boolean
}

/** Pestanas entre las paginas de una seccion; cada una es una ruta propia. */
export function SectionTabs({ label, tabs }: { label: string; tabs: readonly SectionTab[] }) {
  return (
    <nav aria-label={label}>
      <ul className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {tabs.map(({ to, label: text, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                  isActive ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              <Icon className="size-4" aria-hidden="true" />
              {text}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
