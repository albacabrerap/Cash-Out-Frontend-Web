import { loanSimulator } from '@/games/loanSimulator'
import { installment, loanTotal } from './loans'

// Calculados aparte con decimales exactos (Python, Decimal de 40 digitos), redondeando la cuota al centavo.
const EXPECTED = [
  { cheapest: 'Un banco', installments: [277.98, 111.57, 287.36], totals: [3335.76, 4016.52, 3448.32] },
  { cheapest: 'Una caja municipal', installments: [182.09, 186.91, 183.71], totals: [2365.08, 2242.92, 2348.52] },
  { cheapest: 'Una financiera', installments: [280.57, 266.71, 335.82], totals: [6733.68, 7001.04, 6494.76] },
  { cheapest: 'Una caja municipal', installments: [208.44, 201.6, 185.48], totals: [1250.64, 1224.6, 1142.88] },
]

describe('installment', () => {
  it('usa la TEA convertida a tasa mensual efectiva, no dividida entre 12', () => {
    expect(installment(3000, 0.22, 12)).toBe(277.98)
    expect(installment(1200, 0, 12)).toBe(100)
  })
})

describe('rondas del simulador', () => {
  it.each(loanSimulator.rounds.map((round, i) => [round.need, round, EXPECTED[i]] as const))(
    '%s: cuotas y totales exactos, con una sola oferta mas barata',
    (_, round, expected) => {
      expect(round.offers.map((o) => installment(round.principal, o.tea, o.months))).toEqual(expected.installments)
      const totals = round.offers.map((o) => loanTotal(round.principal, o))
      expect(totals).toEqual(expected.totals)

      const sorted = [...totals].sort((a, b) => a - b)
      expect(round.offers[totals.indexOf(sorted[0])].lender).toBe(expected.cheapest)
      expect(sorted[1] - sorted[0]).toBeGreaterThan(50)
    },
  )

  it('en la mayoria de rondas la cuota mas baja no es la mas barata: esa es la leccion', () => {
    const traps = loanSimulator.rounds.filter((round) => {
      const installments = round.offers.map((o) => installment(round.principal, o.tea, o.months))
      const totals = round.offers.map((o) => loanTotal(round.principal, o))
      return installments.indexOf(Math.min(...installments)) !== totals.indexOf(Math.min(...totals))
    })
    expect(traps).toHaveLength(3)
  })
})
