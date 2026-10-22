/** Quita los parametros vacios para no mandar filtros que no se usan. */
export function compactParams(params: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
}
