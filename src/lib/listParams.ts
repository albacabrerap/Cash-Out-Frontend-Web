export const PAGE_SIZES = [10, 25, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 10

export interface ListConfig<F extends string> {
  /** Valores de sort permitidos por el backend ("campo,asc|desc"). */
  sorts: readonly string[]
  defaultSort: string
  filters: readonly F[]
}

export interface ListState<F extends string> {
  /** 1-based, como lo ve el usuario. El backend cuenta desde 0. */
  page: number
  size: number
  sort: string
  filters: Record<F, string>
}

export type ListChanges<F extends string> = Partial<Omit<ListState<F>, 'filters'> & Record<F, string>>

/** Parametros que no son del listado y nunca deben sobrevivir a un cambio de pagina o filtro. */
const TRANSIENT = ['nuevo']

function positiveInt(raw: string | null): number | undefined {
  if (!raw || !/^\d{1,6}$/.test(raw)) return undefined
  const value = Number(raw)
  return value >= 1 ? value : undefined
}

/** Lee la URL tolerando cualquier cosa: un valor invalido cae en el de por defecto. */
export function parseListParams<F extends string>(params: URLSearchParams, config: ListConfig<F>): ListState<F> {
  const size = positiveInt(params.get('size'))
  const sort = params.get('sort')
  return {
    page: positiveInt(params.get('page')) ?? 1,
    size: size !== undefined && (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE,
    sort: sort && config.sorts.includes(sort) ? sort : config.defaultSort,
    filters: Object.fromEntries(config.filters.map((name) => [name, params.get(name)?.trim() ?? ''])) as Record<
      F,
      string
    >,
  }
}

/**
 * Aplica cambios a la URL. Cualquier cambio que no sea de pagina vuelve a la 1:
 * la pagina 4 de un filtro nuevo puede no existir. Los valores por defecto se
 * quitan para que la URL quede corta.
 */
export function applyListChanges<F extends string>(
  params: URLSearchParams,
  changes: ListChanges<F>,
  config: ListConfig<F>,
): URLSearchParams {
  const next = new URLSearchParams(params)
  TRANSIENT.forEach((key) => next.delete(key))

  for (const [key, value] of Object.entries(changes) as [string, string | number | undefined][]) {
    const isDefault =
      value === undefined ||
      value === '' ||
      (key === 'page' && value === 1) ||
      (key === 'size' && value === DEFAULT_PAGE_SIZE) ||
      (key === 'sort' && value === config.defaultSort)
    if (isDefault) next.delete(key)
    else next.set(key, String(value))
  }

  if (!('page' in changes)) next.delete('page')
  return next
}

export type PageItem = number | 'ellipsis-start' | 'ellipsis-end'

/** Paginas a mostrar: siempre la primera, la ultima y las vecinas de la actual. */
export function pageWindow(current: number, total: number, siblings = 1): PageItem[] {
  if (total <= 0) return []
  const slots = siblings * 2 + 5
  if (total <= slots) return Array.from({ length: total }, (_, i) => i + 1)

  const start = Math.max(2, current - siblings)
  const end = Math.min(total - 1, current + siblings)
  const items: PageItem[] = [1]

  if (start > 3) items.push('ellipsis-start')
  else for (let p = 2; p < start; p++) items.push(p)

  for (let p = start; p <= end; p++) items.push(p)

  if (end < total - 2) items.push('ellipsis-end')
  else for (let p = end + 1; p < total; p++) items.push(p)

  items.push(total)
  return items
}
