// Solo formato: los saldos los calcula el backend, nunca el cliente.
import { parseIsoDate } from './dates'

const soles = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const tokens = new Intl.NumberFormat('es-PE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateTime = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
const dateOnly = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' })
const percent1 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** 1234.5 → "S/ 1,234.50" */
export function formatSoles(amount: number | null | undefined): string {
  return soles.format(amount ?? 0)
}

/** 226.14 → "226.14 fichas" */
export function formatTokens(amount: number | null | undefined): string {
  return `${tokens.format(amount ?? 0)} fichas`
}

/**
 * El backend manda LocalDateTime sin zona, en la hora del servidor (UTC). Sin
 * marcarla como UTC el navegador la leeria como hora local, 5 horas corrida.
 */
export function parseServerDateTime(iso: string): Date {
  const hasZone = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(iso)
  return new Date(hasZone ? iso : `${iso}Z`)
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTime.format(parseServerDateTime(iso)) : '—'
}

/** Solo el dia de una fecha con hora del backend, ya en hora local. */
export function formatServerDate(iso: string | null | undefined): string {
  return iso ? dateOnly.format(parseServerDateTime(iso)) : '—'
}

/** Fecha sin hora (LocalDate del backend). */
export function formatDate(iso: string | null | undefined): string {
  return iso ? dateOnly.format(parseIsoDate(iso)) : '—'
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

/** "Ana María Torres" → "AT" */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** −11.1 → "−11.1 %": con un decimal basta para leerlo en un proyector. */
export function formatChange(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${percent1.format(Math.abs(value))} %`
}
