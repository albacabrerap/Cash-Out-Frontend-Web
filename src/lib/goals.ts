import { parseIsoDate, todayIso } from './dates'
import type { Contribution, ContributionSource, GoalStatus, SavingsGoal } from '@/types/goals'
import { toCents } from './amount'
import type { GoalPace } from './dashboard'
import { formatDate, formatServerDate, formatSoles, parseServerDateTime } from './format'
import { formatDayMonth } from './movements'

const percentFormat = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })

/** 37.5 → "38 %", acotado a 0-100. */
export function formatPercent(percent: number): string {
  return `${percentFormat.format(Math.min(100, Math.max(0, percent)))} %`
}

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Cumplida',
  EXPIRED: 'Vencida',
}

export const CONTRIBUTION_SOURCE_LABEL: Record<ContributionSource, string> = {
  MANUAL: 'Aporte manual',
  INCOME: 'Desde un ingreso',
  ADJUSTMENT: 'Ajuste',
}

/** Lo que falta para la meta, en soles (nunca negativo). */
export function remainingAmount(goal: Pick<SavingsGoal, 'targetAmount' | 'accumulatedAmount'>): number {
  return Math.max(0, toCents(goal.targetAmount) - toCents(goal.accumulatedAmount)) / 100
}

/** Dias desde hoy hasta la fecha limite: positivo si falta, negativo si ya paso. */
export function daysUntil(deadline: string, today = todayIso()): number {
  const ms = parseIsoDate(deadline).getTime() - parseIsoDate(today).getTime()
  return Math.round(ms / 86_400_000)
}

/** "Faltan 12 días", "Vence mañana", "Venció hace 3 días". */
export function deadlineText(deadline: string, today = todayIso()): string {
  const days = daysUntil(deadline, today)
  if (days > 1) return `Faltan ${days} días`
  if (days === 1) return 'Vence mañana'
  if (days === 0) return 'Vence hoy'
  if (days === -1) return 'Venció ayer'
  return `Venció hace ${-days} días`
}

/**
 * El plazo segun el estado que manda el backend: el vencimiento lo decide el
 * servidor con la fecha de Lima, y el navegador puede estar en otra zona.
 */
export function goalTimeText(goal: Pick<SavingsGoal, 'status' | 'deadline' | 'completedAt'>): string {
  if (goal.status === 'COMPLETED') return `Cumplida el ${formatServerDate(goal.completedAt)}`
  if (goal.status === 'EXPIRED') return `Venció el ${formatDate(goal.deadline)}`
  return deadlineText(goal.deadline)
}

const MONTH_DAYS = 30.44

/** Cuanto apartar al mes para juntar `amount` antes de que termine el dia limite; null si la fecha ya paso. */
export function monthlyPlan(amount: number, deadline: string, today = todayIso()): { months: number; perMonth: number } | null {
  const days = daysUntil(deadline, today) + 1
  if (days <= 0 || amount <= 0) return null
  const months = days / MONTH_DAYS
  return { months, perMonth: Math.ceil(amount / Math.max(months, 1)) }
}

export type MilestoneState = 'done' | 'next' | 'pending'

export interface Milestone {
  /** 0.25, 0.5, 0.75 o 1. */
  share: number
  amount: number
  state: MilestoneState
}

/** Los cuartos de la meta: los ya alcanzados y el que sigue. */
export function goalMilestones(goal: Pick<SavingsGoal, 'targetAmount' | 'accumulatedAmount'>): Milestone[] {
  const saved = toCents(goal.accumulatedAmount)
  let nextFound = false
  return [0.25, 0.5, 0.75, 1].map((share) => {
    const amount = Math.round(goal.targetAmount * share * 100) / 100
    let state: MilestoneState = 'pending'
    if (saved >= toCents(amount)) state = 'done'
    else if (!nextFound) {
      state = 'next'
      nextFound = true
    }
    return { share, amount, state }
  })
}

export type GoalGrouping = 'estado' | 'fecha'

export interface GoalColumn {
  key: string
  title: string
  goals: SavingsGoal[]
}

/** Las columnas del tablero: por estado, o las en curso segun el año en que vencen. */
export function groupGoals(goals: SavingsGoal[], grouping: GoalGrouping, today = todayIso()): GoalColumn[] {
  const inProgress = goals.filter((g) => g.status === 'IN_PROGRESS').sort((a, b) => a.deadline.localeCompare(b.deadline))
  const completed = goals
    .filter((g) => g.status === 'COMPLETED')
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  const expired = goals.filter((g) => g.status === 'EXPIRED').sort((a, b) => b.deadline.localeCompare(a.deadline))

  if (grouping === 'estado') {
    return [
      { key: 'en-curso', title: 'En curso', goals: inProgress },
      { key: 'cumplidas', title: 'Cumplidas', goals: completed },
      { key: 'vencidas', title: 'Vencidas', goals: expired },
    ]
  }
  const year = today.slice(0, 4)
  return [
    { key: 'este-anio', title: `Vencen en ${year}`, goals: inProgress.filter((g) => g.deadline.slice(0, 4) <= year) },
    { key: 'despues', title: `Vencen después de ${year}`, goals: inProgress.filter((g) => g.deadline.slice(0, 4) > year) },
    { key: 'terminadas', title: 'Terminadas', goals: [...completed, ...expired] },
  ]
}

export interface GoalAdvice {
  text: string
  tone: 'late' | 'ok' | 'done'
}

/** Que hacer con la meta, segun su estado y su ritmo. */
export function goalAdvice(goal: SavingsGoal, pace: GoalPace): GoalAdvice {
  if (goal.status === 'COMPLETED') {
    return {
      text: `La cumpliste el ${formatServerDate(goal.completedAt)}. Lo que reuniste ya no está reservado: volvió a tu saldo disponible.`,
      tone: 'done',
    }
  }
  if (goal.status === 'EXPIRED') {
    return {
      text: `Venció el ${formatDate(goal.deadline)} con ${formatPercent(goal.progressPercent)}. Lo que aportaste volvió a tu saldo disponible; si quieres seguir, crea una meta nueva.`,
      tone: 'done',
    }
  }
  const plan = pace.dueSoon
    ? `Para llegar al ${formatDate(goal.deadline)} te faltan ${formatSoles(pace.remaining)}.`
    : `Para llegar al ${formatDate(goal.deadline)} aparta ${formatSoles(pace.perMonth)} al mes.`
  if (pace.late) {
    const behind = Math.round((pace.elapsed - pace.progress) * 100)
    return { text: `Vas ${behind} ${behind === 1 ? 'punto' : 'puntos'} detrás del ritmo. ${plan}`, tone: 'late' }
  }
  return { text: `Vas a buen ritmo. ${plan}`, tone: 'ok' }
}

export interface ContributionMonth {
  /** yyyy-MM */
  month: string
  total: number
  parts: { goalId: number; amount: number }[]
}

/** Lo aportado en cada mes, separado por meta; el mes es el local de quien mira. */
export function contributionsByMonth(
  goals: { goalId: number; contributions: Contribution[] }[],
  months: string[],
): ContributionMonth[] {
  return months.map((month) => {
    const parts = goals
      .map(({ goalId, contributions }) => ({
        goalId,
        amount:
          contributions
            .filter((c) => localMonth(c.createdAt) === month)
            .reduce((sum, c) => sum + toCents(c.amount), 0) / 100,
      }))
      .filter((part) => part.amount > 0)
    return { month, total: parts.reduce((sum, part) => sum + toCents(part.amount), 0) / 100, parts }
  })
}

function localMonth(serverDateTime: string): string {
  const date = parseServerDateTime(serverDateTime)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** "vence 20 dic" si sigue en curso; si termino, el dia en que se cumplio o vencio: "el 28 ago". */
export function goalDateLine(goal: Pick<SavingsGoal, 'status' | 'deadline' | 'completedAt'>): string {
  if (goal.status === 'COMPLETED' && goal.completedAt) {
    const date = parseServerDateTime(goal.completedAt)
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return `el ${formatDayMonth(iso)}`
  }
  return `${goal.status === 'EXPIRED' ? 'el' : 'vence'} ${formatDayMonth(goal.deadline)}`
}

export type GoalTone = 'late' | 'ok' | 'done' | 'expired'

/** Como va la meta en una palabra: en curso depende del ritmo; si no, de como termino. */
export function goalStatusTone(goal: Pick<SavingsGoal, 'status'>, pace: Pick<GoalPace, 'late'>): { label: string; tone: GoalTone } {
  if (goal.status === 'COMPLETED') return { label: 'Cumplida', tone: 'done' }
  if (goal.status === 'EXPIRED') return { label: 'Vencida', tone: 'expired' }
  return pace.late ? { label: 'Atrasada', tone: 'late' } : { label: 'A tiempo', tone: 'ok' }
}
