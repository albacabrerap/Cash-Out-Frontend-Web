import type { SavingsGoal } from '@/types/goals'
import { todayIso } from './dates'
import { goalFormSchema } from './goalValidation'
import type { GoalPace } from './dashboard'
import {
  contributionsByMonth,
  daysUntil,
  deadlineText,
  goalAdvice,
  goalDateLine,
  goalMilestones,
  goalTimeText,
  groupGoals,
  monthlyPlan,
  remainingAmount,
} from './goals'

const goal = (overrides: Partial<SavingsGoal>): SavingsGoal => ({
  id: 1,
  name: 'Laptop',
  targetAmount: 3000,
  accumulatedAmount: 0,
  progressPercent: 0,
  deadline: '2026-12-31',
  status: 'IN_PROGRESS',
  completedAt: null,
  createdAt: '2026-10-01T15:00:00',
  ...overrides,
})

describe('remainingAmount', () => {
  it('resta en centimos, sin errores de punto flotante', () => {
    expect(remainingAmount({ targetAmount: 0.3, accumulatedAmount: 0.1 })).toBe(0.2)
    expect(remainingAmount({ targetAmount: 100, accumulatedAmount: 33.33 })).toBe(66.67)
  })

  it('nunca es negativo', () => {
    expect(remainingAmount({ targetAmount: 100, accumulatedAmount: 100 })).toBe(0)
  })
})

describe('plazos', () => {
  const today = '2026-10-03'

  it('cuenta dias calendario, sin depender de la hora', () => {
    expect(daysUntil('2026-10-04', today)).toBe(1)
    expect(daysUntil('2026-12-31', today)).toBe(89)
    expect(daysUntil('2026-09-30', today)).toBe(-3)
  })

  it.each([
    ['2026-10-15', 'Faltan 12 días'],
    ['2026-10-04', 'Vence mañana'],
    ['2026-10-03', 'Vence hoy'],
    ['2026-10-02', 'Venció ayer'],
    ['2026-09-30', 'Venció hace 3 días'],
  ])('%s → %s', (deadline, text) => {
    expect(deadlineText(deadline, today)).toBe(text)
  })
})

describe('goalTimeText', () => {
  it('una meta vencida dice cuando vencio aunque localmente aun sea ese dia', () => {
    expect(goalTimeText(goal({ status: 'EXPIRED', deadline: todayIso() }))).toMatch(/^Venció el /)
  })

  it('una cumplida dice cuando se cumplio', () => {
    expect(goalTimeText(goal({ status: 'COMPLETED', completedAt: '2026-10-03T15:00:00' }))).toMatch(/^Cumplida el /)
  })

  it('una en progreso dice cuanto falta', () => {
    expect(goalTimeText(goal({ deadline: '2999-01-01' }))).toMatch(/^Faltan \d+ días$/)
  })
})

describe('goalFormSchema', () => {
  it('exige una fecha limite posterior a hoy, como @Future', () => {
    const base = { name: 'Viaje', targetAmount: '500' }
    expect(goalFormSchema.safeParse({ ...base, deadline: todayIso() }).success).toBe(false)
    expect(goalFormSchema.safeParse({ ...base, deadline: '2999-01-01' }).success).toBe(true)
  })

  it('recorta el nombre y convierte el monto', () => {
    expect(goalFormSchema.parse({ name: '  Viaje  ', targetAmount: '1500,5', deadline: '2999-01-01' })).toEqual({
      name: 'Viaje',
      targetAmount: 1500.5,
      deadline: '2999-01-01',
    })
  })
})

describe('monthlyPlan', () => {
  it('reparte lo que falta en los meses que quedan, contando el dia limite', () => {
    expect(monthlyPlan(300, '2027-01-20', '2026-10-20')).toEqual({ months: 93 / 30.44, perMonth: 99 })
  })

  it('con menos de un mes pide todo de una vez', () => {
    expect(monthlyPlan(300, '2026-10-30', '2026-10-20')?.perMonth).toBe(300)
  })

  it('sin plazo o sin monto no hay plan', () => {
    expect(monthlyPlan(300, '2026-10-19', '2026-10-20')).toBeNull()
    expect(monthlyPlan(0, '2027-01-20', '2026-10-20')).toBeNull()
  })
})

describe('goalMilestones', () => {
  it('marca los cuartos alcanzados y el siguiente', () => {
    expect(goalMilestones({ targetAmount: 2400, accumulatedAmount: 1180 }).map((m) => [m.amount, m.state])).toEqual([
      [600, 'done'],
      [1200, 'next'],
      [1800, 'pending'],
      [2400, 'pending'],
    ])
  })

  it('una meta completa tiene todos los hitos', () => {
    expect(goalMilestones({ targetAmount: 250, accumulatedAmount: 250 }).every((m) => m.state === 'done')).toBe(true)
  })
})

describe('groupGoals', () => {
  const laptop = goal({ id: 1, deadline: '2027-03-31' })
  const viaje = goal({ id: 2, name: 'Viaje', deadline: '2026-12-20' })
  const audifonos = goal({ id: 3, name: 'Audífonos', status: 'COMPLETED', completedAt: '2026-08-28T15:00:00' })
  const concierto = goal({ id: 4, name: 'Concierto', status: 'EXPIRED', deadline: '2026-09-30' })
  const all = [laptop, audifonos, viaje, concierto]

  it('por estado, las en curso van por fecha limite', () => {
    expect(groupGoals(all, 'estado').map((column) => [column.title, column.goals.map((g) => g.id)])).toEqual([
      ['En curso', [2, 1]],
      ['Cumplidas', [3]],
      ['Vencidas', [4]],
    ])
  })

  it('por fecha, separa las que vencen este año y junta las terminadas', () => {
    expect(groupGoals(all, 'fecha', '2026-10-20').map((column) => [column.title, column.goals.map((g) => g.id)])).toEqual([
      ['Vencen en 2026', [2]],
      ['Vencen después de 2026', [1]],
      ['Terminadas', [3, 4]],
    ])
  })
})

describe('goalAdvice', () => {
  const pace = (overrides: Partial<GoalPace>): GoalPace => ({
    elapsed: 0.5,
    progress: 0.5,
    late: false,
    remaining: 1200,
    perMonth: 240,
    dueSoon: false,
    ...overrides,
  })

  it('a buen ritmo dice cuanto apartar al mes', () => {
    expect(goalAdvice(goal({ deadline: '2027-03-31' }), pace({}))).toEqual({
      text: expect.stringMatching(/^Vas a buen ritmo\. Para llegar al 31 mar\. 2027 aparta S\/\s240\.00 al mes\.$/),
      tone: 'ok',
    })
  })

  it('atrasada dice cuantos puntos y, si vence pronto, cuanto falta', () => {
    const advice = goalAdvice(goal({ deadline: '2026-10-30' }), pace({ elapsed: 0.9, progress: 0.4, late: true, dueSoon: true }))
    expect(advice.tone).toBe('late')
    expect(advice.text).toMatch(/^Vas 50 puntos detrás del ritmo\. Para llegar al 30 oct\. 2026 te faltan S\/\s1,200\.00\.$/)
  })

  it('una vencida no da plan', () => {
    expect(goalAdvice(goal({ status: 'EXPIRED', progressPercent: 41 }), pace({})).text).toMatch(/^Venció el .* con 41 %/)
  })
})

describe('contributionsByMonth', () => {
  it('suma por mes y por meta, en centimos', () => {
    const months = contributionsByMonth(
      [
        {
          goalId: 1,
          contributions: [
            { id: 1, amount: 0.1, source: 'MANUAL', createdAt: '2026-10-05T15:00:00' },
            { id: 2, amount: 0.2, source: 'INCOME', createdAt: '2026-10-06T15:00:00' },
          ],
        },
        { goalId: 2, contributions: [{ id: 3, amount: 50, source: 'MANUAL', createdAt: '2026-09-20T15:00:00' }] },
      ],
      ['2026-09', '2026-10'],
    )
    expect(months).toEqual([
      { month: '2026-09', total: 50, parts: [{ goalId: 2, amount: 50 }] },
      { month: '2026-10', total: 0.3, parts: [{ goalId: 1, amount: 0.3 }] },
    ])
  })
})

describe('goalDateLine', () => {
  it('en curso dice cuando vence; terminada, el dia en que termino', () => {
    expect(goalDateLine(goal({ deadline: '2026-12-20' }))).toMatch(/^vence 20 dic/)
    expect(goalDateLine(goal({ status: 'EXPIRED', deadline: '2026-09-30' }))).toMatch(/^el 30 set/)
    expect(goalDateLine(goal({ status: 'COMPLETED', completedAt: '2026-08-28T15:00:00' }))).toMatch(/^el 28 ago/)
  })
})
