import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Loader2, TriangleAlert } from 'lucide-react'
import { toApiError, userMessage } from '@/api/errors'
import { useAuth } from '@/hooks/useAuth'
import { homePathFor } from '@/routes/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AuthGlassFrame, AuthHeading } from './AuthGlassFrame'

/** Adonde lleva el enlace del correo: confirma la cuenta y entra. */
export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const { verifyEmail } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(token ? null : 'El enlace está incompleto. Ábrelo de nuevo desde el correo.')
  // El enlace sirve una vez: el doble efecto de StrictMode no puede gastarlo dos veces.
  const started = useRef(false)

  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    verifyEmail(token)
      .then((user) => navigate(homePathFor(user), { replace: true }))
      .catch((err: unknown) => setError(userMessage(toApiError(err))))
  }, [token, verifyEmail, navigate])

  return (
    <AuthGlassFrame>
      <div className="flex flex-col gap-6">
        <AuthHeading title="Confirmando tu" accent="correo" description="Un momento: estamos validando el enlace." />
        {error ? (
          <>
            <Alert variant="destructive">
              <TriangleAlert aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              Si el enlace venció, inicia sesión con tu correo y contraseña: ahí puedes pedir uno nuevo.
            </p>
            <Button asChild>
              <Link to="/login">Ir a iniciar sesión</Link>
            </Button>
          </>
        ) : (
          <p role="status" className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Confirmando…
          </p>
        )}
      </div>
    </AuthGlassFrame>
  )
}
