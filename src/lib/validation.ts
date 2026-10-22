import { z } from 'zod'
import { todayIso } from './dates'

// Replica las reglas de RegisterUserRequest y LoginRequest del backend.

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 100

/** Juntas equivalen a la regex del backend: ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$ */
export const passwordRules = [
  { id: 'length', label: `Entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres`, test: (v: string) => v.length >= PASSWORD_MIN && v.length <= PASSWORD_MAX },
  { id: 'lower', label: 'Una letra minúscula', test: (v: string) => /[a-z]/.test(v) },
  { id: 'upper', label: 'Una letra mayúscula', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'digit', label: 'Un número', test: (v: string) => /\d/.test(v) },
  { id: 'special', label: 'Un símbolo, como ! ? # $', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const

const email = z
  .string()
  .trim()
  .min(1, { error: 'Ingresa tu correo.' })
  .max(180, { error: 'El correo no puede tener más de 180 caracteres.' })
  .pipe(z.email({ error: 'Ese correo no tiene un formato válido.' }))
  // Hibernate Validator limita la parte local a 64 caracteres; Zod no.
  .refine((value) => value.split('@')[0].length <= 64, {
    error: 'La parte antes de la @ no puede tener más de 64 caracteres.',
  })

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: 'Ingresa tu contraseña.' }),
})

export type LoginValues = z.infer<typeof loginSchema>

const name = z
  .string()
  .trim()
  .min(1, { error: 'Ingresa tu nombre.' })
  .max(120, { error: 'El nombre no puede tener más de 120 caracteres.' })

const newPassword = z.string().refine((value) => passwordRules.every((rule) => rule.test(value)), {
  error: 'La contraseña no cumple todos los requisitos.',
})

// Opcional; si viene, tiene que ser pasada (@Past).
const birthDate = z.string().refine((value) => value === '' || value < todayIso(), {
  error: 'La fecha de nacimiento tiene que ser anterior a hoy.',
})

export const registerSchema = z.object({ name, email, password: newPassword, birthDate })

export type RegisterValues = z.infer<typeof registerSchema>

// Solo del front: el backend no guarda esta confirmacion.
export const registerFormSchema = registerSchema.extend({
  accepted: z.boolean().refine((value) => value, { error: 'Marca la casilla para continuar.' }),
})

export type RegisterFormValues = z.infer<typeof registerFormSchema>

export const profileSchema = z.object({ name, birthDate })

export type ProfileValues = z.infer<typeof profileSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: 'Ingresa tu contraseña actual.' }),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.confirmPassword === values.newPassword, {
    path: ['confirmPassword'],
    error: 'Las contraseñas no coinciden.',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    error: 'La contraseña nueva tiene que ser distinta de la actual.',
  })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
