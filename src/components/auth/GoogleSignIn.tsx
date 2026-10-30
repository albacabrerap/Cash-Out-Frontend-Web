import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toApiError, userMessage, type ApiError } from '@/api/errors'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { googleClientId, loadGoogleIdentity } from '@/lib/googleIdentity'

interface GoogleSignInProps {
  /** El mensaje va al aviso de la pagina, junto a los errores del formulario. */
  onError(message: string | null): void
}

/**
 * "Continuar con Google", con el boton oficial de Google y un separador hacia
 * el formulario. Sin client ID configurado no se muestra nada.
 */
export function GoogleSignIn({ onError }: GoogleSignInProps) {
  const clientId = googleClientId()
  const { loginWithGoogle } = useAuth()
  const { resolvedTheme } = useTheme()
  const slot = useRef<HTMLDivElement>(null)
  const [pending, setPending] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  // El callback de Google se registra una vez; asi siempre llama a la version actual.
  const handlers = useRef({ loginWithGoogle, onError })
  useEffect(() => {
    handlers.current = { loginWithGoogle, onError }
  })

  useEffect(() => {
    if (!clientId) return
    let active = true
    loadGoogleIdentity()
      .then((google) => {
        if (!active || !slot.current) return
        google.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          auto_select: false,
          itp_support: true,
          callback: async ({ credential }) => {
            handlers.current.onError(null)
            setPending(true)
            try {
              // GuestOnly redirige al abrirse la sesion.
              await handlers.current.loginWithGoogle(credential)
            } catch (err) {
              handlers.current.onError(googleErrorMessage(toApiError(err)))
              setPending(false)
            }
          },
        })
        slot.current.replaceChildren()
        google.renderButton(slot.current, {
          type: 'standard',
          theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'center',
          width: Math.min(400, Math.max(200, slot.current.clientWidth)),
          locale: 'es',
        })
      })
      .catch(() => active && setUnavailable(true))
    return () => {
      active = false
    }
  }, [clientId, resolvedTheme])

  if (!clientId) return null

  return (
    <div className="flex flex-col gap-5">
      <div className="relative flex min-h-11 items-center justify-center">
        <div ref={slot} className="flex w-full justify-center" aria-busy={pending} />
        {pending && (
          <div className="absolute inset-0 grid place-items-center rounded-full bg-background/70 text-sm">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Entrando con Google…
            </span>
          </div>
        )}
        {unavailable && <p className="text-center text-xs text-muted-foreground">No pudimos cargar el botón de Google. Usa tu correo.</p>}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />o con tu correo
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}

// Aqui un 401 es un token de Google rechazado, no una sesion vencida; y el 503 explica que falta configurarlo.
function googleErrorMessage(error: ApiError): string {
  if (error.status === 401 || error.status === 503) {
    return error.serverMessage ?? 'No pudimos entrar con Google. Usa tu correo y contraseña.'
  }
  return userMessage(error)
}
