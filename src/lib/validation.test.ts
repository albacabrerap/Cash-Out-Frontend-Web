import { describe, expect, it } from 'vitest'
import { loginSchema, passwordRules, registerSchema } from './validation'

// Si estas reglas y las del backend discrepan, la web deja pasar algo que el servidor rechaza con 400.
const BACKEND_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/

const valid = {
  name: 'Ana Torres',
  email: 'ana@utec.edu.pe',
  password: 'Secreto123!',
  birthDate: '',
}

describe('contrasena: misma regla que el backend', () => {
  const samples = [
    'Secreto123!', 'secreto123!', 'SECRETO123!', 'Secreto!!!!', 'Secreto1234',
    'Sec1!', 'Áéíóú1aA!', 'Pass word1', 'a'.repeat(101) + 'A1!',
  ]

  it.each(samples)('"%s"', (password) => {
    const inBackend =
      password.length >= 8 && password.length <= 100 && BACKEND_PASSWORD.test(password)
    const inWeb = passwordRules.every((rule) => rule.test(password))
    expect(inWeb).toBe(inBackend)
  })
})

describe('registro', () => {
  it('acepta un registro valido, con fecha de nacimiento opcional vacia', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it('rechaza una fecha de nacimiento de hoy o futura, como @Past', () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(registerSchema.safeParse({ ...valid, birthDate: today }).success).toBe(false)
    expect(registerSchema.safeParse({ ...valid, birthDate: '2001-05-14' }).success).toBe(true)
  })

  it('rechaza un correo mal formado', () => {
    expect(registerSchema.safeParse({ ...valid, email: 'ana.utec.edu.pe' }).success).toBe(false)
  })

  it('limite total de 180 caracteres, como @Size(max = 180): 180 entra, 181 no', () => {
    // Etiquetas de dominio de hasta 63 caracteres, como exige DNS.
    const at180 = `${'a'.repeat(63)}@${'x'.repeat(60)}.${'y'.repeat(52)}.pe`
    expect(at180).toHaveLength(180)
    expect(registerSchema.safeParse({ ...valid, email: at180 }).success).toBe(true)
    expect(registerSchema.safeParse({ ...valid, email: `a${at180}` }).success).toBe(false)
  })

  it('parte local de hasta 64 caracteres, como el @Email del backend', () => {
    expect(registerSchema.safeParse({ ...valid, email: `${'a'.repeat(64)}@utec.pe` }).success).toBe(true)
    expect(registerSchema.safeParse({ ...valid, email: `${'a'.repeat(65)}@utec.pe` }).success).toBe(false)
  })

  it('recorta espacios del nombre y del correo antes de validar', () => {
    const parsed = registerSchema.parse({ ...valid, name: '  Ana  ', email: '  ana@utec.edu.pe ' })
    expect(parsed.name).toBe('Ana')
    expect(parsed.email).toBe('ana@utec.edu.pe')
  })
})

describe('login', () => {
  it('pide correo y contrasena', () => {
    const result = loginSchema.safeParse({ email: '', password: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((i) => i.path[0])).toEqual(['email', 'password'])
  })
})
