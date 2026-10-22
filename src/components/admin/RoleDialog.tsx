import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { ROLE_SETS, roleSetOf } from '@/lib/users'
import { userService } from '@/services/userService'
import type { User } from '@/types/auth'
import { FormDialogContent } from '@/components/forms/FormDialog'
import { Dialog } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface RoleDialogProps {
  user: User | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function RoleDialog({ user, onOpenChange, onSaved }: RoleDialogProps) {
  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      {user && <RoleForm user={user} onSaved={onSaved} />}
    </Dialog>
  )
}

function RoleForm({ user, onSaved }: { user: User; onSaved: () => void }) {
  const current = roleSetOf(user.roles)
  const [choice, setChoice] = useState(current ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chosen = ROLE_SETS.find((set) => set.id === choice)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!chosen) return
    setPending(true)
    setError(null)
    try {
      await userService.setRoles(user.id, chosen.roles)
      toast.success(`${user.name} ahora es ${chosen.label.toLowerCase()}`)
      onSaved()
    } catch (err) {
      setError(userMessage(toApiError(err)))
    } finally {
      setPending(false)
    }
  }

  return (
    <FormDialogContent
      title={`Rol de ${user.name}`}
      description="Se aplica cuando su sesión se renueva: como mucho en 15 minutos, o en cuanto vuelva a entrar."
      formId="role-form"
      submitLabel="Cambiar rol"
      pendingLabel="Cambiando…"
      pending={pending}
      error={error}
      submitDisabled={!chosen || choice === current}
    >
      <form id="role-form" noValidate onSubmit={onSubmit}>
        <Field>
          <FieldLabel htmlFor="role-select">Rol</FieldLabel>
          <Select value={choice} onValueChange={setChoice}>
            <SelectTrigger id="role-select" className="w-full">
              <SelectValue placeholder="Elige un rol" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_SETS.map((set) => (
                <SelectItem key={set.id} value={set.id}>
                  {set.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>{chosen ? chosen.description : 'Tiene una combinación de roles que la web no usa.'}</FieldDescription>
        </Field>
      </form>
    </FormDialogContent>
  )
}
