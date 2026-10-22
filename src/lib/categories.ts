import {
  Bus,
  GraduationCap,
  HeartPulse,
  Lightbulb,
  PartyPopper,
  Shapes,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/types/movements'

export const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: LucideIcon; color: string }> = {
  FOOD: { label: 'Comida', icon: UtensilsCrossed, color: 'var(--series-1)' },
  TRANSPORT: { label: 'Transporte', icon: Bus, color: 'var(--series-2)' },
  SERVICES: { label: 'Servicios', icon: Lightbulb, color: 'var(--series-3)' },
  EDUCATION: { label: 'Educación', icon: GraduationCap, color: 'var(--series-4)' },
  LEISURE: { label: 'Ocio', icon: PartyPopper, color: 'var(--series-5)' },
  HEALTH: { label: 'Salud', icon: HeartPulse, color: 'var(--series-6)' },
  OTHER: { label: 'Otros', icon: Shapes, color: 'var(--series-7)' },
}

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string' && (EXPENSE_CATEGORIES as readonly string[]).includes(value)
}
