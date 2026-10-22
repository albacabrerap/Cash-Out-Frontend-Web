import { useState } from 'react'
import { UserX } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useAuth } from '@/hooks/useAuth'
import { userService } from '@/services/userService'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { SettingsRow, SettingsSection } from '@/components/profile/SettingsSection'

export function DeactivateAccount() {
  const { logout } = useAuth()
  const [confirming, setConfirming] = useState(false)

  const deactivate = useAsyncAction(async () => {
    try {
      await userService.deleteMe()
    } catch (err) {
      setConfirming(false)
      toast.error(userMessage(toApiError(err)))
      return
    }
    toast.success('Tu cuenta quedó dada de baja')
    await logout()
  })

  return (
    <SettingsSection
      id="perfil-baja"
      title="Zona de riesgo"
      description="Lo que hagas aquí no se puede deshacer."
      className="border-destructive/30"
    >
      <SettingsRow
        label="Dar de baja la cuenta"
        description="Tu cuenta queda inactiva y se cierran todas tus sesiones. Tu historial se conserva, pero ya no podrás iniciar sesión ni registrarte de nuevo con este correo."
      >
        <div className="flex md:justify-end">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive max-sm:w-full"
            onClick={() => setConfirming(true)}
          >
            <UserX aria-hidden="true" />
            Dar de baja mi cuenta
          </Button>
        </div>
      </SettingsRow>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿Dar de baja tu cuenta?"
        description="No podrás volver a iniciar sesión con este correo. Si solo quieres salir, usa «Cerrar sesión»."
        confirmLabel="Dar de baja"
        pendingLabel="Dando de baja…"
        onConfirm={() => void deactivate.run()}
        pending={deactivate.isPending}
      />
    </SettingsSection>
  )
}
