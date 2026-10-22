import { Loader2, TriangleAlert } from 'lucide-react'
import { useGoalForm } from '@/hooks/useGoalForm'
import type { SavingsGoal } from '@/types/goals'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { GoalFields } from './GoalFormDialog'

interface NewGoalPanelProps {
  onCancel: () => void
  onCreated: (goal: SavingsGoal) => void
}

/** El alta de una meta en el panel de al lado, con la vista previa de cuanto apartar al mes. */
export function NewGoalPanel({ onCancel, onCreated }: NewGoalPanelProps) {
  const { form, submit, formError } = useGoalForm(undefined, onCreated)
  const pending = form.formState.isSubmitting

  return (
    <aside aria-labelledby="meta-nueva" className="rounded-2xl border bg-card p-5 lg:sticky lg:top-20 lg:p-6">
      <p className="text-xs tracking-wider text-muted-foreground uppercase">Nueva meta</p>
      <h2 id="meta-nueva" className="mt-2 text-lg font-semibold">
        ¿Para qué quieres ahorrar?
      </h2>
      {formError && (
        <Alert variant="destructive" className="mt-4">
          <TriangleAlert aria-hidden="true" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <form noValidate onSubmit={submit} className="mt-4">
        <GoalFields form={form} idPrefix="panel-goal" />
        <div className="mt-5 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" disabled={pending} onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {pending ? 'Guardando…' : 'Crear meta'}
          </Button>
        </div>
      </form>
    </aside>
  )
}
