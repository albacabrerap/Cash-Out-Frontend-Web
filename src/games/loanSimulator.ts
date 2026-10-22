import type { LoanPack } from './types'

const NONE = { fee: 0, monthlyInsurance: 0 }

export const loanSimulator: LoanPack = {
  type: 'SIMULATION',
  description: 'Elige un préstamo y mira cuánto terminas pagando de verdad.',
  rules:
    'En cada una de las 4 rondas eliges el préstamo que te cuesta menos en total. Ojo: la cuota más baja no siempre es la más barata.',
  rounds: [
    {
      need: 'una laptop',
      principal: 3000,
      offers: [
        { lender: 'Un banco', tea: 0.22, months: 12, ...NONE },
        { lender: 'Una caja municipal', tea: 0.22, months: 36, ...NONE },
        { lender: 'Una financiera', tea: 0.3, months: 12, ...NONE },
      ],
      explanation:
        'Con la misma tasa, alargar el plazo baja la cuota pero triplica los intereses: pagas intereses durante 36 meses en vez de 12.',
    },
    {
      need: 'un curso de especialización',
      principal: 2000,
      offers: [
        { lender: 'Un banco', tea: 0.18, months: 12, fee: 180, monthlyInsurance: 0 },
        { lender: 'Una caja municipal', tea: 0.24, months: 12, ...NONE },
        { lender: 'Una financiera', tea: 0.2, months: 12, fee: 0, monthlyInsurance: 12 },
      ],
      explanation:
        'La TEA más baja no basta: comisiones y seguros también se pagan. Por eso se compara la TCEA, que suma la tasa y todos los costos.',
    },
    {
      need: 'empezar un negocio',
      principal: 5000,
      offers: [
        { lender: 'Un banco', tea: 0.35, months: 24, ...NONE },
        { lender: 'Una caja municipal', tea: 0.28, months: 24, fee: 0, monthlyInsurance: 25 },
        { lender: 'Una financiera', tea: 0.28, months: 18, fee: 0, monthlyInsurance: 25 },
      ],
      explanation:
        'A igual tasa y seguro, el plazo más corto paga menos meses de intereses y de seguro. La cuota más baja resultó la más cara.',
    },
    {
      need: 'una emergencia',
      principal: 1000,
      offers: [
        { lender: 'Una app de préstamos', tea: 1.2, months: 6, ...NONE },
        { lender: 'Tu tarjeta de crédito, en efectivo', tea: 0.95, months: 6, fee: 15, monthlyInsurance: 0 },
        { lender: 'Una caja municipal', tea: 0.45, months: 6, fee: 30, monthlyInsurance: 0 },
      ],
      explanation:
        'El crédito inmediato sale caro: la app te cobra casi el doble que la caja municipal. Un fondo de emergencia evita pedir prestado con apuro.',
    },
  ],
}
