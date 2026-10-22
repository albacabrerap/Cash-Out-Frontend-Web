import { z } from 'zod'

// El tope de 9 cifras es solo del cliente: la columna admite mas, pero un monto
// asi es casi seguro un error de tipeo.
const AMOUNT_PATTERN = /^\d{1,9}(?:[.,]\d{1,2})?$/

function amountString(missing: string) {
  return z
    .string()
    .trim()
    .min(1, { error: missing })
    .regex(AMOUNT_PATTERN, { error: 'Escribe un monto con hasta 2 decimales, como 25.50.' })
    .transform((value) => Number(value.replace(',', '.')))
}

/** Monto en soles escrito por el usuario ("25,5" o "25.50") convertido a numero. */
export const amountField = amountString('Ingresa el monto.').refine((value) => value > 0, {
  error: 'El monto tiene que ser mayor que cero.',
})

/** Igual, pero admite cero: un escenario puede no tener capital inicial o aportes. */
export const amountOrZeroField = amountString('Ingresa el monto; puede ser 0.')

/** El monto como lo escribe el usuario en el campo: 1500 → "1500.00". */
export function amountToField(value: number): string {
  return value.toFixed(2)
}

/** Para comparar montos sin errores de redondeo de punto flotante. */
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}
