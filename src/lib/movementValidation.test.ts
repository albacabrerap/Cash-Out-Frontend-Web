import { todayIso } from './dates'
import { expenseFormSchema, incomeFormSchema } from './movementValidation'

const validExpense = { category: 'FOOD', amount: '25.50', date: '2026-09-01', description: '' }

function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message
}

describe('expenseFormSchema', () => {
  it('convierte lo que escribe el usuario en lo que espera el backend', () => {
    const result = expenseFormSchema.parse({ ...validExpense, amount: ' 25,5 ', description: '  Almuerzo  ' })
    expect(result).toEqual({ category: 'FOOD', amount: 25.5, date: '2026-09-01', description: 'Almuerzo' })
  })

  it('una descripcion vacia se manda como null', () => {
    expect(expenseFormSchema.parse(validExpense).description).toBeNull()
  })

  it.each([
    ['', 'Ingresa el monto.'],
    ['0', 'El monto tiene que ser mayor que cero.'],
    ['0.00', 'El monto tiene que ser mayor que cero.'],
    ['12.345', 'Escribe un monto con hasta 2 decimales, como 25.50.'],
    ['-5', 'Escribe un monto con hasta 2 decimales, como 25.50.'],
    ['1e5', 'Escribe un monto con hasta 2 decimales, como 25.50.'],
    ['1234567890', 'Escribe un monto con hasta 2 decimales, como 25.50.'],
  ])('rechaza el monto %j', (value, message) => {
    expect(firstError(expenseFormSchema.safeParse({ ...validExpense, amount: value }))).toBe(message)
  })

  it('acepta el minimo del backend, 0.01', () => {
    expect(expenseFormSchema.parse({ ...validExpense, amount: '0.01' }).amount).toBe(0.01)
  })

  it('exige una categoria del enum del backend', () => {
    expect(firstError(expenseFormSchema.safeParse({ ...validExpense, category: '' }))).toBe('Elige una categoría.')
    expect(firstError(expenseFormSchema.safeParse({ ...validExpense, category: 'CASINO' }))).toBe('Elige una categoría.')
  })

  it('acepta hoy y rechaza una fecha futura, como @PastOrPresent', () => {
    expect(expenseFormSchema.safeParse({ ...validExpense, date: todayIso() }).success).toBe(true)
    expect(firstError(expenseFormSchema.safeParse({ ...validExpense, date: '2999-01-01' }))).toBe(
      'La fecha no puede ser futura.',
    )
  })

  it('limita la descripcion a 255 caracteres', () => {
    expect(expenseFormSchema.safeParse({ ...validExpense, description: 'a'.repeat(255) }).success).toBe(true)
    expect(expenseFormSchema.safeParse({ ...validExpense, description: 'a'.repeat(256) }).success).toBe(false)
  })
})

describe('incomeFormSchema', () => {
  const validIncome = { source: 'Sueldo', amount: '1500', date: '2026-09-01', description: '' }

  it('exige el origen y lo recorta', () => {
    expect(incomeFormSchema.parse({ ...validIncome, source: '  Beca  ' }).source).toBe('Beca')
    expect(firstError(incomeFormSchema.safeParse({ ...validIncome, source: '   ' }))).toBe(
      'Indica de dónde vino el ingreso.',
    )
  })

  it('limita el origen a 100 caracteres, como @Size(max = 100)', () => {
    expect(incomeFormSchema.safeParse({ ...validIncome, source: 'a'.repeat(100) }).success).toBe(true)
    expect(incomeFormSchema.safeParse({ ...validIncome, source: 'a'.repeat(101) }).success).toBe(false)
  })
})
