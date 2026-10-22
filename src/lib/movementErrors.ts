import { toApiError, userMessage } from '@/api/errors'

/**
 * Borrar un ingreso descuenta su monto del ahorro, y el backend lo rechaza con
 * 400 si ese dinero ya esta reservado en una meta. Su mensaje habla de "gastar",
 * que aqui confunde, asi que se reemplaza por uno que dice que hacer.
 */
export function incomeDeleteErrorMessage(err: unknown): string {
  const error = toApiError(err)
  if (error.status === 400) {
    return 'No puedes eliminar este ingreso: parte de ese dinero está reservado en tus metas. Libera la meta primero o corrige el monto del ingreso.'
  }
  return userMessage(error)
}
