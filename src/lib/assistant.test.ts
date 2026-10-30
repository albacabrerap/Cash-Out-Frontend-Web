import type { Draft } from '@/types/assistant'
import { confirmRequest, formFromDraft, formProblem } from './assistant'

const taxi: Draft = {
  kind: 'EXPENSE',
  description: 'Taxi',
  amount: 12,
  currency: 'PEN',
  date: '2026-10-27',
  paymentMethod: 'YAPE',
  category: 'TRANSPORT',
  confidence: 0.6,
  alternatives: [],
  source: 'KEYWORDS',
  warnings: [],
  ruc: null,
  receiptRef: null,
  alreadyRegisteredAt: null,
}

describe('assistant', () => {
  it('la tarjeta arranca con lo sugerido y el monto como se escribe', () => {
    expect(formFromDraft(taxi)).toEqual({ kind: 'EXPENSE', description: 'Taxi', amount: '12.00', date: '2026-10-27', category: 'TRANSPORT' })
    expect(formFromDraft({ ...taxi, amount: null, description: null }).amount).toBe('')
  })

  it('no deja guardar sin monto, con fecha futura o un gasto sin categoria', () => {
    const form = formFromDraft(taxi)
    expect(formProblem(form, '2026-10-28')).toBeNull()
    expect(formProblem({ ...form, amount: '' }, '2026-10-28')).toBe('Ingresa el monto.')
    expect(formProblem({ ...form, date: '2026-10-29' }, '2026-10-28')).toBe('La fecha no puede ser futura.')
    expect(formProblem({ ...form, category: null }, '2026-10-28')).toBe('Elige una categoría.')
    expect(formProblem({ ...form, kind: 'INCOME', category: null }, '2026-10-28')).toBeNull()
  })

  it('aprende solo si el usuario cambio el tipo o la categoria', () => {
    const form = formFromDraft(taxi)
    expect(confirmRequest(taxi, form)).toMatchObject({ amount: 12, category: 'TRANSPORT', learn: false })
    expect(confirmRequest(taxi, { ...form, category: 'LEISURE' }).learn).toBe(true)
    expect(confirmRequest(taxi, { ...form, kind: 'INCOME' })).toMatchObject({ kind: 'INCOME', category: undefined, learn: true })
    expect(confirmRequest(taxi, { ...form, amount: '12,5', description: '  ' })).toMatchObject({ amount: 12.5, description: undefined })
  })

  it('una boleta manda su RUC y su huella para no registrarse dos veces', () => {
    const receipt = { ...taxi, ruc: '20100070970', receiptRef: 'a'.repeat(64) }
    expect(confirmRequest(receipt, formFromDraft(receipt))).toMatchObject({ ruc: '20100070970', receiptRef: 'a'.repeat(64) })
  })
})
