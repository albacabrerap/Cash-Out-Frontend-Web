const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** yyyy-MM-dd en la zona horaria del usuario. */
export function todayIso(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

/** "2026-10-03" + 1 → "2026-10-04", en fechas calendario. */
export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso)
  date.setDate(date.getDate() + days)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

/** Fecha real con formato yyyy-MM-dd (rechaza "2026-02-30"). */
export function isIsoDate(value: string | null | undefined): value is string {
  if (!value || !ISO_DATE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/** El rango solo vale completo y en orden, como lo exige el backend. */
export function validRange(from: string, to: string): { from: string; to: string } | undefined {
  return isIsoDate(from) && isIsoDate(to) && from <= to ? { from, to } : undefined
}

/** "2026-10-03" como fecha local, sin pasar por UTC (que la correria un dia en Lima). */
export function parseIsoDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Tope del selector de fecha de nacimiento: el backend exige una fecha pasada. */
export function yesterdayIso(): string {
  return addDays(todayIso(), -1)
}
