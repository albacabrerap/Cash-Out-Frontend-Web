import { useEffect, useState } from 'react'
import { Loader2, MailCheck } from 'lucide-react'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { authService } from '@/services/authService'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/** El backend no manda otro enlace antes de un minuto: el boton espera lo mismo. */
const RESEND_WAIT_SECONDS = 60

interface CheckYourEmailProps {
  email: string
  /** Lo que paso antes: "Te enviamos un enlace…" o "Tu correo no está confirmado". */
  title: string
}

/** Aviso para confirmar el correo, con la opcion de pedir otro enlace. */
export function CheckYourEmail({ email, title }: CheckYourEmailProps) {
  const [wait, setWait] = useState(RESEND_WAIT_SECONDS)
  const [sent, setSent] = useState(false)
  const resend = useAsyncAction(async () => {
    await authService.resendVerification(email).catch(() => undefined)
    setSent(true)
    setWait(RESEND_WAIT_SECONDS)
  })

  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  return (
    <Alert>
      <MailCheck aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          Abre el enlace que enviamos a <strong className="text-foreground">{email}</strong> para confirmar que es tuyo. Vence en
          24 horas. Si no lo ves, revisa la carpeta de spam.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => resend.run()} disabled={wait > 0 || resend.isPending}>
          {resend.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {wait > 0 ? `Reenviar en ${wait} s` : 'Reenviar el enlace'}
        </Button>
        {sent && (
          <p role="status" className="text-xs">
            Si la cuenta existe y falta confirmarla, te mandamos otro enlace.
          </p>
        )}
      </AlertDescription>
    </Alert>
  )
}
