import { useState } from 'react'
import { Link } from 'react-router'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, TriangleAlert } from 'lucide-react'
import { toApiError, userMessage } from '@/api/errors'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { yesterdayIso } from '@/lib/dates'
import { applyServerFieldErrors } from '@/lib/formErrors'
import { cn } from '@/lib/utils'
import { registerFormSchema, type RegisterFormValues } from '@/lib/validation'
import { PasswordInput } from '@/components/forms/PasswordInput'
import { PasswordStrength } from '@/components/forms/PasswordStrength'
import { PARTICLE_COLORS } from '@/components/landing/palettes'
import { RisingParticles } from '@/components/landing/RisingParticles'
import { CheckYourEmail } from '@/components/auth/CheckYourEmail'
import { GoogleSignIn } from '@/components/auth/GoogleSignIn'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AUTH_FORM_ENTER, AUTH_INPUT, AuthHeading } from './AuthGlassFrame'

const FIELDS = ['name', 'email', 'password', 'birthDate'] as const

export default function RegisterPage() {
  const { register: registerAccount } = useAuth()
  const { resolvedTheme } = useTheme()
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { name: '', email: '', password: '', birthDate: '', accepted: false },
  })
  const { errors, isSubmitting, isValid } = form.formState
  const password = useWatch({ control: form.control, name: 'password' })

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null)
    try {
      const result = await registerAccount({
        name: values.name,
        email: values.email,
        password: values.password,
        birthDate: values.birthDate || undefined,
      })
      // Sin verificacion pendiente, GuestOnly redirige al abrirse la sesion.
      if (result.verificationRequired) setPendingEmail(result.user.email)
    } catch (err) {
      const error = toApiError(err)
      if (error.status === 409) {
        form.setError('email', { type: 'server', message: userMessage(error) }, { shouldFocus: true })
      } else if (!applyServerFieldErrors(error, form.setError, FIELDS)) {
        setFormError(userMessage(error))
      }
    }
  }

  // -mt-14 mete las particulas bajo la barra de vidrio de PublicLayout.
  return (
    <div className="relative isolate -mt-14 flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden px-4 pt-26 pb-12 sm:pt-30 sm:pb-16">
      <RisingParticles {...PARTICLE_COLORS[resolvedTheme]} className="absolute inset-0 -z-10 size-full" />

      <p className="text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Inicia sesión
        </Link>
      </p>

      <div className="w-full max-w-md rounded-[28px] border border-foreground/10 bg-background/60 p-6 shadow-[0_40px_80px_-36px_rgb(63_64_88/0.45)] backdrop-blur-xl backdrop-saturate-150 sm:p-8 dark:shadow-[0_40px_80px_-30px_rgb(0_0_0/0.6)]">
        <div className="flex flex-col gap-6">
          <AuthHeading
            align="start"
            title="Crea tu"
            accent="cuenta"
            description="Registra tus ingresos y gastos, ahorra para tus metas y aprende a invertir sin arriesgar dinero real."
          />

          {formError && (
            <Alert variant="destructive">
              <TriangleAlert aria-hidden="true" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {pendingEmail ? (
            <div className="flex flex-col gap-4">
              <CheckYourEmail email={pendingEmail} title="Tu cuenta está creada" />
              <Button asChild variant="outline">
                <Link to="/login">Ya lo confirmé: iniciar sesión</Link>
              </Button>
            </div>
          ) : (
            <>
            <GoogleSignIn onError={setFormError} />

            <form noValidate onSubmit={form.handleSubmit(onSubmit)} className={cn(AUTH_FORM_ENTER, 'flex flex-col gap-6')}>
              <FieldGroup>
                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="register-name">Nombre completo</FieldLabel>
                  <Input
                    id="register-name"
                    autoComplete="name"
                    maxLength={120}
                    placeholder="Ana Torres"
                    className={AUTH_INPUT}
                    aria-invalid={!!errors.name}
                    {...form.register('name')}
                  />
                  <FieldError errors={[errors.name]} />
                </Field>
                <Field data-invalid={!!errors.email}>
                  <FieldLabel htmlFor="register-email">Correo</FieldLabel>
                  <Input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    maxLength={180}
                    placeholder="tu@correo.com"
                    className={AUTH_INPUT}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? undefined : 'register-email-hint'}
                    {...form.register('email')}
                  />
                  {errors.email ? (
                    <FieldError errors={[errors.email]} />
                  ) : (
                    <FieldDescription id="register-email-hint">Con este correo vas a iniciar sesión.</FieldDescription>
                  )}
                </Field>
                <Field data-invalid={!!errors.password}>
                  <FieldLabel htmlFor="register-password">Contraseña</FieldLabel>
                  <PasswordInput
                    id="register-password"
                    autoComplete="new-password"
                    maxLength={100}
                    placeholder="Crea una contraseña"
                    className={AUTH_INPUT}
                    aria-invalid={!!errors.password}
                    aria-describedby="register-password-rules"
                    {...form.register('password')}
                  />
                  <PasswordStrength id="register-password-rules" value={password} />
                  <FieldError errors={[errors.password]} />
                </Field>
                <Field data-invalid={!!errors.birthDate}>
                  <FieldLabel htmlFor="register-birth">
                    Fecha de nacimiento <span className="font-normal text-muted-foreground">(opcional)</span>
                  </FieldLabel>
                  <Input
                    id="register-birth"
                    type="date"
                    autoComplete="bday"
                    max={yesterdayIso()}
                    className={cn(AUTH_INPUT, 'dark:scheme-dark')}
                    aria-invalid={!!errors.birthDate}
                    {...form.register('birthDate')}
                  />
                  <FieldError errors={[errors.birthDate]} />
                </Field>
                <Field data-invalid={!!errors.accepted}>
                  <label htmlFor="register-accepted" className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <input
                      id="register-accepted"
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 accent-primary"
                      aria-invalid={!!errors.accepted}
                      {...form.register('accepted')}
                    />
                    <span>
                      Entiendo que Cash-Out es un <strong className="font-semibold text-foreground">proyecto académico</strong>{' '}
                      y que invierto con <strong className="font-semibold text-foreground">fichas</strong>, no con dinero
                      real.
                    </span>
                  </label>
                  <FieldError errors={[errors.accepted]} />
                </Field>
              </FieldGroup>
              {/* Se ve apagado hasta completar el formulario, pero se puede presionar para ver que falta. */}
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                aria-disabled={!isValid}
                className="h-12 w-full rounded-xl text-[15px] aria-disabled:bg-primary/40 aria-disabled:hover:bg-primary/40"
              >
                {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                {isSubmitting ? 'Creando tu cuenta…' : 'Crear cuenta'}
              </Button>
            </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
