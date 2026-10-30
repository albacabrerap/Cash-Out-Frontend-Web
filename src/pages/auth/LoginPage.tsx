import { useState } from 'react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Info, Loader2, TriangleAlert } from 'lucide-react'
import { toApiError, userMessage } from '@/api/errors'
import type { SessionEndReason } from '@/api/tokenStore'
import { useAuth } from '@/hooks/useAuth'
import { applyServerFieldErrors } from '@/lib/formErrors'
import { googleClientId } from '@/lib/googleIdentity'
import { cn } from '@/lib/utils'
import { loginSchema, type LoginValues } from '@/lib/validation'
import { PasswordInput } from '@/components/forms/PasswordInput'
import { CheckYourEmail } from '@/components/auth/CheckYourEmail'
import { GoogleSignIn } from '@/components/auth/GoogleSignIn'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AUTH_FORM_ENTER, AUTH_INPUT, AuthGlassFrame, AuthHeading } from './AuthGlassFrame'

const END_REASON_MESSAGES: Record<SessionEndReason, string> = {
  logout: 'Cerraste sesión. ¡Hasta pronto!',
  expired: 'Tu sesión expiró. Inicia sesión de nuevo para continuar donde estabas.',
  'other-tab': 'Cerraste sesión en otra pestaña.',
}

export default function LoginPage() {
  const { login, endReason } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [unverified, setUnverified] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const { isSubmitting } = form.formState

  const onSubmit = async (values: LoginValues) => {
    setFormError(null)
    setUnverified(null)
    try {
      // GuestOnly redirige al abrirse la sesion.
      await login(values)
    } catch (err) {
      const error = toApiError(err)
      if (error.status === 403) {
        // La contrasena era correcta: falta confirmar el correo.
        setUnverified(values.email)
      } else if (error.status === 401) {
        // El backend no distingue correo de contrasena para no revelar que correos existen.
        setFormError(
          googleClientId()
            ? 'Correo o contraseña incorrectos. Si creaste tu cuenta con Google, entra con el botón de Google.'
            : 'Correo o contraseña incorrectos.',
        )
        form.resetField('password', { keepError: false })
        form.setFocus('password')
      } else if (!applyServerFieldErrors(error, form.setError, ['email', 'password'])) {
        setFormError(userMessage(error))
      }
    }
  }

  return (
    <AuthGlassFrame>
      <div className="flex flex-col gap-7">
        <AuthHeading
          title="Hola de"
          accent="nuevo"
          description="Entra para ver tu ahorro, tus metas y tu portafolio."
        />

        {endReason && !formError && (
          <Alert>
            <Info aria-hidden="true" />
            <AlertDescription>{END_REASON_MESSAGES[endReason]}</AlertDescription>
          </Alert>
        )}
        {formError && (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden="true" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        {unverified && <CheckYourEmail email={unverified} title="Falta confirmar tu correo" />}

        <GoogleSignIn onError={setFormError} />

        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className={cn(AUTH_FORM_ENTER, 'flex flex-col gap-6')}>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.email}>
              <FieldLabel htmlFor="login-email">Correo</FieldLabel>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="tu@correo.com"
                className={AUTH_INPUT}
                aria-invalid={!!form.formState.errors.email}
                {...form.register('email')}
              />
              <FieldError errors={[form.formState.errors.email]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.password}>
              <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
              <PasswordInput
                id="login-password"
                autoComplete="current-password"
                placeholder="Tu contraseña"
                className={AUTH_INPUT}
                aria-invalid={!!form.formState.errors.password}
                {...form.register('password')}
              />
              <FieldError errors={[form.formState.errors.password]} />
            </Field>
          </FieldGroup>
          <Button type="submit" size="lg" disabled={isSubmitting} className="h-12 w-full rounded-full text-[15px]">
            {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
            {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-medium text-foreground underline-offset-4 hover:underline">
            Créala gratis
          </Link>
        </p>
      </div>
    </AuthGlassFrame>
  )
}
