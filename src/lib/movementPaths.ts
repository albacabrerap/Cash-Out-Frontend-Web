import type { Movement } from '@/types/movements'

/** El detalle de un movimiento vive en la ruta de su tipo. */
export function movementPath(movement: Pick<Movement, 'id' | 'kind'>): string {
  return `/movimientos/${movement.kind === 'INCOME' ? 'ingresos' : 'gastos'}/${movement.id}`
}

export function movementKey(movement: Pick<Movement, 'id' | 'kind'>): string {
  return `${movement.kind}-${movement.id}`
}
