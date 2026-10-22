import type { ReactNode } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface FormDialogContentProps {
  title: string
  description: string
  formId: string
  submitLabel: string
  pendingLabel: string
  pending: boolean
  error: string | null
  /** Para cuando el formulario no se puede enviar todavia (p. ej. sin saldo). */
  submitDisabled?: boolean
  children: ReactNode
}

/** Contenido de un dialogo con formulario. Mientras se guarda no se puede cerrar. */
export function FormDialogContent({
  title,
  description,
  formId,
  submitLabel,
  pendingLabel,
  pending,
  error,
  submitDisabled = false,
  children,
}: FormDialogContentProps) {
  const blockWhilePending = (event: Event) => {
    if (pending) event.preventDefault()
  }

  return (
    <DialogContent
      showCloseButton={!pending}
      onEscapeKeyDown={blockWhilePending}
      onInteractOutside={blockWhilePending}
      className="sm:max-w-lg"
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {children}
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" disabled={pending}>
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" form={formId} disabled={pending || submitDisabled}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {pending ? pendingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
