import { toast } from 'sonner'
import type { SavingsGoal } from '@/types/goals'

/** Cumplir una meta paga fichas: ese aporte se celebra aparte. */
export function announceContribution(goal: Pick<SavingsGoal, 'name'>, completed: boolean) {
  if (completed) {
    toast.success(`¡Cumpliste tu meta "${goal.name}"!`, {
      description: 'Ganaste fichas para invertir en el mercado simulado.',
    })
  } else {
    toast.success('Aporte registrado')
  }
}
