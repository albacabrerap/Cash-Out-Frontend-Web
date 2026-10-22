import { z } from 'zod'
import type { ExpenseCategory } from '@/types/movements'
import { isExpenseCategory } from './categories'
import { amountField } from './amount'
import { todayIso } from './dates'

// Replica ExpenseRequest e IncomeRequest.
const amount = amountField

const date = z
  .string()
  .min(1, { error: 'Elige la fecha.' })
  .refine((value) => value <= todayIso(), { error: 'La fecha no puede ser futura.' })

const description = z
  .string()
  .trim()
  .max(255, { error: 'La descripción no puede tener más de 255 caracteres.' })
  .transform((value) => value || null)

export const expenseFormSchema = z.object({
  category: z
    .string()
    .refine(isExpenseCategory, { error: 'Elige una categoría.' })
    .transform((value) => value as ExpenseCategory),
  amount,
  date,
  description,
})

export const incomeFormSchema = z.object({
  source: z
    .string()
    .trim()
    .min(1, { error: 'Indica de dónde vino el ingreso.' })
    .max(100, { error: 'El origen no puede tener más de 100 caracteres.' }),
  amount,
  date,
  description,
})

export type ExpenseFormValues = z.input<typeof expenseFormSchema>
export type IncomeFormValues = z.input<typeof incomeFormSchema>
export type ExpenseFormOutput = z.output<typeof expenseFormSchema>
export type IncomeFormOutput = z.output<typeof incomeFormSchema>
