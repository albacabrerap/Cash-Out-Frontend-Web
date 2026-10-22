import { z } from 'zod'
import { amountField } from './amount'
import { todayIso } from './dates'

// Replica SavingsGoalRequest y ContributionRequest.
export const goalFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'Ponle un nombre a tu meta.' })
    .max(120, { error: 'El nombre no puede tener más de 120 caracteres.' }),
  targetAmount: amountField,
  deadline: z
    .string()
    .min(1, { error: 'Elige la fecha límite.' })
    .refine((value) => value > todayIso(), { error: 'La fecha límite tiene que ser posterior a hoy.' }),
})

export const contributionFormSchema = z.object({
  amount: amountField,
})

export type GoalFormValues = z.input<typeof goalFormSchema>
export type GoalFormOutput = z.output<typeof goalFormSchema>
export type ContributionFormValues = z.input<typeof contributionFormSchema>
export type ContributionFormOutput = z.output<typeof contributionFormSchema>

/**
 * Los errores por campo del backend vienen con el mensaje por defecto de Bean
 * Validation, en ingles. Estos lo reemplazan.
 */
export const GOAL_FIELD_MESSAGES = {
  name: 'Revisa el nombre de la meta.',
  targetAmount: 'Revisa el monto objetivo.',
  deadline: 'La fecha límite tiene que ser posterior a hoy.',
}
