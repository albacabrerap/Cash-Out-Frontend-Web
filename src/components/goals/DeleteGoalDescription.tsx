import { formatSoles } from '@/lib/format'
import type { SavingsGoal } from '@/types/goals'

/** Que pasa con el dinero al borrar la meta: solo una en progreso tiene algo reservado. */
export function DeleteGoalDescription({ goal }: { goal: SavingsGoal }) {
  return (
    <>
      Se eliminará <strong>{goal.name}</strong> con su historial de aportes.{' '}
      {goal.status === 'IN_PROGRESS' && goal.accumulatedAmount > 0 && (
        <>Lo que aportaste ({formatSoles(goal.accumulatedAmount)}) vuelve a tu saldo disponible. </>
      )}
      Esta acción no se puede deshacer.
    </>
  )
}
