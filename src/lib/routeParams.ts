/** Un id de ruta valido es un entero positivo; cualquier otra cosa es un 404. */
export function parseId(raw: string | undefined): number | null {
  if (!raw || !/^\d{1,15}$/.test(raw)) return null
  const id = Number(raw)
  return id > 0 ? id : null
}

/** El listado (ruta y filtros) desde el que se abrio un detalle, para volver a el. */
export interface ListReturnState {
  from?: string
}

export function returnPath(state: unknown, fallback: string): string {
  const from = (state as ListReturnState | null)?.from
  return typeof from === 'string' && from.startsWith('/movimientos/') ? from : fallback
}
