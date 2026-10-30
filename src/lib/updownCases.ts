import { z } from 'zod'
import { todayIso } from '@/lib/dates'
import type { UpDownChoice } from '@/types/updown'
import type { UpDownCase } from '@/types/updownCases'

/** Una partida tiene 8 rondas; con menos casos activos sale mas corta. */
export const ROUNDS_PER_GAME = 8

const text = (max: number, empty: string) =>
  z
    .string()
    .trim()
    .min(1, { error: empty })
    .max(max, { error: `Máximo ${max} caracteres.` })

export const updownCaseFormSchema = z.object({
  symbol: z
    .string()
    .trim()
    .regex(/^[A-Za-z][A-Za-z.]{0,11}$/, { error: 'Escribe el símbolo, como SPY o BRK.B.' })
    .transform((symbol) => symbol.toUpperCase()),
  cutoff: z
    .string()
    .min(1, { error: 'Elige el día de la noticia.' })
    .refine((day) => day < todayIso(), { error: 'Tiene que ser un día pasado.' }),
  sector: text(60, 'Escribe la pista, como "Índice tecnológico".'),
  name: text(160, 'Escribe qué se revela al final.'),
  context: text(300, 'Escribe la noticia de ese día.'),
  lesson: text(600, 'Escribe por qué se movió así.'),
  active: z.boolean(),
})

export type UpDownCaseFormValues = z.input<typeof updownCaseFormSchema>
export type UpDownCaseFormOutput = z.output<typeof updownCaseFormSchema>

/** Cuantos casos activos terminan en cada resultado, para ver si el banco esta parejo. */
export function caseBalance(cases: UpDownCase[]): { active: number } & Record<UpDownChoice, number> {
  const balance = { active: 0, UP: 0, FLAT: 0, DOWN: 0 }
  for (const item of cases) {
    if (!item.active) continue
    balance.active++
    if (item.outcome) balance[item.outcome]++
  }
  return balance
}
