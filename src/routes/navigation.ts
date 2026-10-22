import {
  ArrowLeftRight,
  Calculator,
  ChartCandlestick,
  Gamepad2,
  LayoutDashboard,
  LayoutGrid,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Role, User } from '@/types/auth'

/** Solo las secciones ya construidas: un enlace a una pantalla pendiente parece un error. */
export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles: Role[]
  /** Activo solo en la ruta exacta, no en sus hijas. */
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/resumen', label: 'Resumen', icon: LayoutDashboard, roles: ['USER'] },
  { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight, roles: ['USER'] },
  { to: '/metas', label: 'Metas', icon: Target, roles: ['USER'] },
  { to: '/proyeccion', label: 'Proyección', icon: Calculator, roles: ['USER'] },
  { to: '/portafolio', label: 'Portafolio', icon: ChartCandlestick, roles: ['USER'] },
  { to: '/minijuegos', label: 'Minijuegos', icon: Gamepad2, roles: ['USER'] },
  { to: '/admin', label: 'Panel', icon: LayoutGrid, roles: ['ADMIN'], end: true },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users, roles: ['ADMIN'] },
  { to: '/admin/minijuegos', label: 'Minijuegos', icon: Gamepad2, roles: ['ADMIN'] },
  { to: '/admin/activos', label: 'Activos', icon: ChartCandlestick, roles: ['ADMIN'] },
]

export function navItemsFor(user: User | null): NavItem[] {
  if (!user) return []
  return NAV_ITEMS.filter((item) => item.roles.some((role) => user.roles.includes(role)))
}

export function homePathFor(user: User | null): string {
  return navItemsFor(user)[0]?.to ?? '/resumen'
}

export interface RouteHandle {
  crumb?: string
  /** Vale el de la ruta activa mas profunda. */
  title?: string
}
