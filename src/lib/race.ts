import type { RaceView } from '@/types/race'

export const RACE_FEES = [0, 10, 20, 50] as const
export const RACE_START_CAPITAL = 10_000
/** El backend da 4 pasos por segundo. */
export const RACE_STEPS_PER_SECOND = 4

/**
 * Junta una vista nueva con la anterior. Los ticks no traen la serie de precios
 * para no reenviarla entera 4 veces por segundo: el precio del paso se agrega a
 * la que ya se tenia.
 */
export function mergeRaceView(prev: RaceView | null, next: RaceView): RaceView {
  if (next.prices) return next
  const known = prev?.code === next.code ? (prev.prices ?? []) : []
  const prices = next.step >= known.length ? [...known, next.price] : known.slice(0, next.step + 1)
  return { ...next, prices }
}

/** "2020-03-12" → "12 de marzo de 2020". */
export function formatRaceDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  )
}

/** El link que lleva el QR: el celular entra directo a la sala. */
export function raceJoinUrl(code: string): string {
  return `${window.location.origin}/carrera/${code}`
}
