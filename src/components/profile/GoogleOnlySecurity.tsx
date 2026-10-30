import { SettingsRow, SettingsSection } from '@/components/profile/SettingsSection'

/** La seguridad de una cuenta creada con Google: no hay contrasena, se entra con Google. */
export function GoogleOnlySecurity({ email }: { email: string }) {
  return (
    <SettingsSection id="perfil-seguridad" title="Seguridad" description="Tu cuenta está vinculada a Google.">
      <SettingsRow
        label="Inicio de sesión"
        description={
          <>
            Entras con la cuenta de Google <strong className="font-medium text-foreground">{email}</strong>. Cash-Out no guarda
            una contraseña tuya: para entrar usa «Continuar con Google».
          </>
        }
      >
        <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">Google</span>
      </SettingsRow>
    </SettingsSection>
  )
}
