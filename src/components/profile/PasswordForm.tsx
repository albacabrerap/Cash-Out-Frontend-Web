import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useAuth } from '@/hooks/useAuth'
import { applyServerFieldErrors } from '@/lib/formErrors'
import { changePasswordSchema, type ChangePasswordValues } from '@/lib/validation'
import { userService } from '@/services/userService'
import { PasswordChecklist } from '@/components/forms/PasswordChecklist'
import { PasswordInput } from '@/components/forms/PasswordInput'
import { SettingsError, SettingsRow, SettingsSection } from '@/components/profile/SettingsSection'
import { Button } from '@/components/ui/button'

const EMPTY: ChangePasswordValues = { currentPassword: '', newPassword: '', confirmPassword: '' }

export function PasswordForm({ email }: { email: string }) {
  const { login, logout } = useAuth()
  const form = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema), defaultValues: EMPTY })
  const { errors, isSubmitting } = form.formState
  const newPassword = useWatch({ control: form.control, name: 'newPassword' })

  const onSubmit = async ({ currentPassword, newPassword: password }: ChangePasswordValues) => {
    try {
      await userService.changePassword({ currentPassword, newPassword: password })
    } catch (err) {
      const error = toApiError(err)
      // El backend responde 401 a una contrasena actual equivocada; el cliente ya descarto que sea la sesion.
      if (error.status === 401) {
        form.setError('currentPassword', { type: 'server', message: 'La contraseña actual no es correcta.' }, { shouldFocus: true })
      } else if (
        !applyServerFieldErrors(error, form.setError, ['currentPassword', 'newPassword'], {
          newPassword: 'La contraseña no cumple todos los requisitos.',
        })
      ) {
        toast.error(userMessage(error))
      }
      return
    }

    form.reset(EMPTY)
    // El cambio cierra todas las sesiones, tambien esta: se entra de nuevo con la contrasena nueva.
    try {
      await login({ email, password })
      toast.success('Contraseña actualizada', { description: 'Cerramos tu sesión en los demás dispositivos.' })
    } catch {
      toast.success('Contraseña actualizada', { description: 'Vuelve a iniciar sesión con tu contraseña nueva.' })
      await logout()
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <SettingsSection
        id="perfil-seguridad"
        title="Seguridad"
        description="Al cambiar la contraseña se cierra tu sesión en los demás dispositivos."
        footer={
          <Button type="submit" disabled={isSubmitting} className="ml-auto max-sm:w-full">
            {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
            {isSubmitting ? 'Cambiando…' : 'Cambiar contraseña'}
          </Button>
        }
      >
        <SettingsRow label="Contraseña actual" htmlFor="password-current" description="La que usas hoy para entrar.">
          <PasswordInput
            id="password-current"
            autoComplete="current-password"
            aria-invalid={!!errors.currentPassword}
            aria-describedby="password-current-error"
            {...form.register('currentPassword')}
          />
          <SettingsError id="password-current-error" message={errors.currentPassword?.message} />
        </SettingsRow>
        <SettingsRow label="Contraseña nueva" htmlFor="password-new" description="Tiene que ser distinta de la actual.">
          <PasswordInput
            id="password-new"
            autoComplete="new-password"
            aria-invalid={!!errors.newPassword}
            aria-describedby="password-rules password-new-error"
            {...form.register('newPassword')}
          />
          <PasswordChecklist id="password-rules" value={newPassword} />
          <SettingsError id="password-new-error" message={errors.newPassword?.message} />
        </SettingsRow>
        <SettingsRow label="Repite la contraseña nueva" htmlFor="password-confirm" description="Para descartar un error de tipeo.">
          <PasswordInput
            id="password-confirm"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby="password-confirm-error"
            {...form.register('confirmPassword')}
          />
          <SettingsError id="password-confirm-error" message={errors.confirmPassword?.message} />
        </SettingsRow>
      </SettingsSection>
    </form>
  )
}
