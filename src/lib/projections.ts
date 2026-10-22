import { z } from 'zod'
import type { Projection, ProjectionParams } from '@/types/projections'
import { amountOrZeroField, amountToField, toCents } from './amount'
import { todayIso } from './dates'
import { formatSoles } from './format'
import { daysUntil } from './goals'

// Replica ProjectionPreviewRequest. La TEA se escribe en porcentaje; la API la recibe entre 0 y 1.
export const projectionParamsSchema = z
  .object({
    initialCapital: amountOrZeroField,
    monthlyContribution: amountOrZeroField,
    annualRatePercent: z
      .string()
      .trim()
      .min(1, { error: 'Ingresa la TEA; puede ser 0.' })
      .regex(/^\d{1,3}(?:[.,]\d{1,4})?$/, { error: 'Escribe la TEA con hasta 4 decimales, como 7.5.' })
      .transform((value) => Number(value.replace(',', '.')))
      .refine((value) => value <= 100, { error: 'La TEA no puede pasar de 100 %.' }),
    periods: z
      .string()
      .trim()
      .min(1, { error: 'Ingresa el plazo en meses.' })
      .regex(/^\d{1,3}$/, { error: 'El plazo es un número entero de meses.' })
      .transform(Number)
      .refine((value) => value >= 1 && value <= 600, { error: 'El plazo va de 1 a 600 meses (50 años).' }),
  })
  .transform(
    ({ annualRatePercent, ...rest }): ProjectionParams => ({ ...rest, annualRate: percentToRate(annualRatePercent) }),
  )

export type ProjectionParamsValues = z.input<typeof projectionParamsSchema>

export const saveProjectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'Ponle un nombre al escenario.' })
    .max(120, { error: 'El nombre no puede tener más de 120 caracteres.' }),
  /** "none" o el id de la meta: un Select no admite un valor vacio. */
  goal: z.string().transform((value) => (value === NO_GOAL ? null : Number(value))),
})

export const NO_GOAL = 'none'

export type SaveProjectionValues = z.input<typeof saveProjectionSchema>
export type SaveProjectionOutput = z.output<typeof saveProjectionSchema>

export const SAVE_PROJECTION_FIELD_MESSAGES = {
  name: 'Revisa el nombre del escenario.',
}

export const DEFAULT_PROJECTION_VALUES: ProjectionParamsValues = {
  initialCapital: '500',
  monthlyContribution: '120',
  annualRatePercent: '7.5',
  periods: '24',
}

/** 7.5 → 0.075. El redondeo evita restos como 1.1 / 100 = 0.011000000000000001. */
export function percentToRate(percent: number): number {
  return Number((percent / 100).toFixed(6))
}

/** 0.075 → "7.5" */
export function rateToPercentText(rate: number): string {
  return String(Number((rate * 100).toFixed(4)))
}

/** Un escenario guardado, como lo muestran los campos de la calculadora. */
export function projectionToFields(projection: ProjectionParams): ProjectionParamsValues {
  return {
    initialCapital: amountToField(projection.initialCapital),
    monthlyContribution: amountToField(projection.monthlyContribution),
    annualRatePercent: rateToPercentText(projection.annualRate),
    periods: String(projection.periods),
  }
}

/** 24 → "2 años", 18 → "1 año y 6 meses", 1 → "1 mes". */
export function formatTerm(months: number): string {
  const years = Math.floor(months / 12)
  const rest = months % 12
  const yearsText = years === 1 ? '1 año' : `${years} años`
  const monthsText = rest === 1 ? '1 mes' : `${rest} meses`
  if (years === 0) return monthsText
  return rest === 0 ? yearsText : `${yearsText} y ${monthsText}`
}

/** "S/ 500.00 + S/ 120.00 al mes · TEA 7.5 % · 2 años" */
export function paramsSummary(projection: Pick<Projection, keyof ProjectionParams>): string {
  const contribution =
    projection.monthlyContribution > 0 ? ` + ${formatSoles(projection.monthlyContribution)} al mes` : ''
  return (
    `${formatSoles(projection.initialCapital)}${contribution} · ` +
    `TEA ${rateToPercentText(projection.annualRate)} % · ${formatTerm(projection.periods)}`
  )
}

/** TEA → tasa mensual equivalente, la misma que usa el backend: (1 + TEA)^(1/12) − 1. */
export function monthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1
}

export interface CurvePoint {
  month: number
  /** Capital mas los aportes hechos hasta ese mes. */
  contributed: number
  simple: number
  compound: number
}

/**
 * Mes a mes, con las formulas del backend. Solo sirve para dibujar la curva:
 * los montos finales que se muestran como resultado los calcula el servidor.
 */
export function projectionCurve(params: ProjectionParams): CurvePoint[] {
  const rate = monthlyRate(params.annualRate)
  const { initialCapital: capital, monthlyContribution: monthly } = params
  return Array.from({ length: params.periods + 1 }, (_, month) => {
    const growth = Math.pow(1 + rate, month)
    return {
      month,
      contributed: capital + monthly * month,
      simple: capital * (1 + rate * month) + monthly * (month + (rate * month * (month - 1)) / 2),
      compound: rate === 0 ? capital + monthly * month : capital * growth + (monthly * (growth - 1)) / rate,
    }
  })
}

export interface ProjectionYear {
  /** 1, 2, 3… */
  year: number
  /** Meses que cubre: 12, salvo quizas el ultimo. */
  months: number
  contributed: number
  /** Interes compuesto ganado solo en ese periodo. */
  interest: number
  total: number
}

/** La curva cortada en años: lo aportado al cierre y el interes ganado en cada uno. */
export function yearlyBreakdown(curve: CurvePoint[]): ProjectionYear[] {
  const years: ProjectionYear[] = []
  const last = curve.length - 1
  for (let start = 0; start < last; start += 12) {
    const end = Math.min(start + 12, last)
    const interestAt = (point: CurvePoint) => point.compound - point.contributed
    years.push({
      year: years.length + 1,
      months: end - start,
      contributed: curve[end].contributed,
      interest: interestAt(curve[end]) - interestAt(curve[start]),
      total: curve[end].compound,
    })
  }
  return years
}

export interface GoalReach {
  /** El primer mes en que el compuesto llega al objetivo; 0 si el capital ya alcanza, null si en 50 años no llega. */
  reachMonth: number | null
  /** Aporte mensual que hace falta para llegar justo al plazo; 0 si el capital ya alcanza. */
  needed: number
}

/** Si estos parametros llegan a un monto antes de un plazo en meses, y cuanto aportar si no. */
export function goalReach(params: ProjectionParams, target: number, deadlineMonths: number): GoalReach {
  const rate = monthlyRate(params.annualRate)
  const valueAt = (month: number) => {
    const growth = Math.pow(1 + rate, month)
    return rate === 0
      ? params.initialCapital + params.monthlyContribution * month
      : params.initialCapital * growth + (params.monthlyContribution * (growth - 1)) / rate
  }
  let reachMonth: number | null = null
  for (let month = 0; month <= 600; month++) {
    if (valueAt(month) >= target) {
      reachMonth = month
      break
    }
  }
  const months = Math.max(deadlineMonths, 1)
  const growth = Math.pow(1 + rate, months)
  const annuity = rate === 0 ? months : (growth - 1) / rate
  const needed = Math.max(0, Math.ceil((target - params.initialCapital * growth) / annuity))
  return { reachMonth, needed }
}

/** Meses completos entre hoy y la fecha limite, como cuenta el grafico. */
export function monthsUntil(deadline: string, today = todayIso()): number {
  return Math.max(0, Math.floor((daysUntil(deadline, today) + 1) / 30.44))
}

/** Tasas de referencia para probar rapido; no son ofertas reales. */
export const RATE_PRESETS = [
  { label: 'Cuenta de ahorros', percent: 2 },
  { label: 'Depósito a plazo', percent: 5 },
  { label: 'Fondo mutuo', percent: 8 },
]

/** Mismos datos, comparando montos en centimos. */
export function sameParams(a: ProjectionParams, b: ProjectionParams): boolean {
  return (
    toCents(a.initialCapital) === toCents(b.initialCapital) &&
    toCents(a.monthlyContribution) === toCents(b.monthlyContribution) &&
    Math.abs(a.annualRate - b.annualRate) < 1e-9 &&
    a.periods === b.periods
  )
}
