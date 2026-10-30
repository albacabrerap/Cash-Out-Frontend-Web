import type { UpDownChoice } from '@/types/updown'

/** El backend corta en 2 %: "Igual" gana si el mes termino entre −2 % y +2 %. */
export const FLAT_BAND = 2

export const UPDOWN_CHOICES: { value: UpDownChoice; label: string; icon: string; tone: string }[] = [
  { value: 'UP', label: 'Sube', icon: '▲', tone: 'text-gain' },
  { value: 'FLAT', label: 'Igual', icon: '▬', tone: 'text-accent-ink' },
  { value: 'DOWN', label: 'Baja', icon: '▼', tone: 'text-loss' },
]

export function choiceMeta(choice: UpDownChoice) {
  return UPDOWN_CHOICES.find((option) => option.value === choice)!
}

/** La apuesta minima es 10, o todo lo que quede si son menos. */
export function minBet(points: number, min: number): number {
  return Math.min(min, points)
}

export function clampBet(bet: number, points: number, min: number): number {
  return Math.max(minBet(points, min), Math.min(points, Math.round(bet)))
}

/** Atajos de 10 %, 25 %, 50 % y todo, redondeados a 10. */
export function betChips(points: number, min: number): { label: string; value: number }[] {
  return [
    { label: '10 %', share: 0.1 },
    { label: '25 %', share: 0.25 },
    { label: '50 %', share: 0.5 },
    { label: 'Todo', share: 1 },
  ].map(({ label, share }) => ({
    label,
    value: share === 1 ? points : clampBet(Math.round((points * share) / 10) * 10, points, min),
  }))
}

/** El link que lleva el QR: el celular entra directo a la sala. */
export function updownJoinUrl(code: string): string {
  return `${window.location.origin}/minijuegos/sube-o-baja/${code}`
}
