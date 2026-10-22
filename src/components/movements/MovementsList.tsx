import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router'
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  FilterX,
  HandCoins,
  Plus,
  Receipt,
  SearchX,
  type LucideIcon,
} from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useListParams } from '@/hooks/useListParams'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { CATEGORY_META, isExpenseCategory } from '@/lib/categories'
import { validRange } from '@/lib/dates'
import type { ListConfig } from '@/lib/listParams'
import { movementInsight, type MonthSummary } from '@/lib/monthOverview'
import { movementKey, movementPath } from '@/lib/movementPaths'
import { expenseToMovement, formatDayMonth, incomeToMovement } from '@/lib/movements'
import type { ListReturnState } from '@/lib/routeParams'
import { cn } from '@/lib/utils'
import { expenseService } from '@/services/expenseService'
import { incomeService } from '@/services/incomeService'
import { movementService } from '@/services/movementService'
import type { PageParams, PageResponse } from '@/types/api'
import { EXPENSE_CATEGORIES, type ExpenseFilters, type Movement } from '@/types/movements'
import { AmountText } from '@/components/data/AmountText'
import { DataPagination } from '@/components/data/DataPagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { DateRangeFilter } from '@/components/filters/DateRangeFilter'
import { FilterSelect, type SelectOption } from '@/components/filters/FilterSelect'
import { SearchInput } from '@/components/filters/SearchInput'
import { SectionTabs } from '@/components/navigation/SectionTabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ExpenseFormDialog } from './ExpenseFormDialog'
import { IncomeFormDialog } from './IncomeFormDialog'
import { MovementTypeBadge } from './MovementCells'
import { MovementDetailPanel, type MovementRecord } from './MovementDetailPanel'

export type MovementTab = 'todos' | 'ingresos' | 'gastos'

/** Lo que la pagina de Movimientos comparte con su lista. */
export interface MovementsOutletContext {
  /** Sube cada vez que algo se guarda o se borra: todo lo que depende de los movimientos se vuelve a pedir. */
  version: number
  refresh: () => void
  month: string
  summary: MonthSummary | undefined
}

type Filter = 'search' | 'from' | 'to' | 'category'
type ListRequest = PageParams & ExpenseFilters

interface TabSetup {
  config: ListConfig<Filter>
  sortOptions: SelectOption[]
  load: (params: ListRequest, signal: AbortSignal) => Promise<PageResponse<Movement>>
  noun: { one: string; other: string }
  caption: string
  search: { label: string; placeholder: string }
  loadError: string
  noMatch: string
  empty: { icon: LucideIcon; title: string; description: string }
}

const SORTS = ['date,desc', 'date,asc', 'amount,desc', 'amount,asc']

const SORT_OPTIONS: SelectOption[] = [
  { value: 'date,desc', label: 'Más recientes' },
  { value: 'date,asc', label: 'Más antiguos' },
  { value: 'amount,desc', label: 'Monto: mayor a menor' },
  { value: 'amount,asc', label: 'Monto: menor a mayor' },
]

const TABS: Record<MovementTab, TabSetup> = {
  todos: {
    config: { sorts: SORTS, defaultSort: 'date,desc', filters: ['search', 'from', 'to'] },
    sortOptions: SORT_OPTIONS,
    load: (params, signal) => movementService.list(params, signal),
    noun: { one: 'movimiento', other: 'movimientos' },
    caption: 'Tus ingresos y gastos',
    search: { label: 'Buscar movimientos', placeholder: 'Buscar por descripción u origen' },
    loadError: 'No pudimos cargar tus movimientos',
    noMatch: 'Ningún movimiento coincide con los filtros',
    empty: {
      icon: ArrowLeftRight,
      title: 'Todavía no tienes movimientos',
      description: 'Registra lo que recibes y lo que gastas para ver aquí a dónde va tu dinero.',
    },
  },
  ingresos: {
    config: { sorts: [...SORTS, 'source,asc'], defaultSort: 'date,desc', filters: ['search', 'from', 'to'] },
    sortOptions: [...SORT_OPTIONS, { value: 'source,asc', label: 'Origen (A-Z)' }],
    load: async (params, signal) => {
      const page = await incomeService.list(params, signal)
      return { ...page, content: page.content.map(incomeToMovement) }
    },
    noun: { one: 'ingreso', other: 'ingresos' },
    caption: 'Tus ingresos',
    search: { label: 'Buscar ingresos', placeholder: 'Buscar por origen o descripción' },
    loadError: 'No pudimos cargar tus ingresos',
    noMatch: 'Ningún ingreso coincide con los filtros',
    empty: {
      icon: HandCoins,
      title: 'Todavía no registras ingresos',
      description: 'Registra lo que recibes —propinas, becas, un trabajo— para empezar a ahorrar.',
    },
  },
  gastos: {
    config: { sorts: [...SORTS, 'category,asc'], defaultSort: 'date,desc', filters: ['search', 'from', 'to', 'category'] },
    sortOptions: [...SORT_OPTIONS, { value: 'category,asc', label: 'Agrupar por categoría' }],
    load: async (params, signal) => {
      const page = await expenseService.list(params, signal)
      return { ...page, content: page.content.map(expenseToMovement) }
    },
    noun: { one: 'gasto', other: 'gastos' },
    caption: 'Tus gastos',
    search: { label: 'Buscar gastos', placeholder: 'Buscar en la descripción' },
    loadError: 'No pudimos cargar tus gastos',
    noMatch: 'Ningún gasto coincide con los filtros',
    empty: {
      icon: Receipt,
      title: 'Todavía no registras gastos',
      description: 'Anota en qué gastas para saber a dónde se va tu dinero.',
    },
  },
}

export function MovementsList({ tab }: { tab: MovementTab }) {
  const setup = TABS[tab]
  const list = useListParams(setup.config)
  const { page, size, sort, filters } = list
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const outlet = useOutletContext<MovementsOutletContext | undefined>()
  // Fuera de la pagina de Movimientos (en las pruebas) la lista lleva su propia version.
  const [localVersion, setLocalVersion] = useState(0)
  const version = outlet?.version ?? localVersion
  const refresh = outlet?.refresh ?? (() => setLocalVersion((n) => n + 1))
  const isWide = useMediaQuery('(min-width: 1024px)')
  const [selectedKey, setSelectedKey] = useState<string>()
  const [editing, setEditing] = useState<MovementRecord | null>(null)

  const range = validRange(filters.from, filters.to)
  const category = tab === 'gastos' && isExpenseCategory(filters.category) ? filters.category : undefined
  const params: ListRequest = {
    page: page - 1,
    size,
    sort,
    search: filters.search || undefined,
    ...(tab === 'gastos' && { category }),
    from: range?.from,
    to: range?.to,
  }
  const query = useApiQuery(['movements', tab, params, version], (signal) => setup.load(params, signal))
  const data = query.data

  // `?nuevo=1` abre el alta propia de la pestana; `gasto` o `ingreso`, la que se pida desde cualquiera.
  const nuevo = searchParams.get('nuevo')
  const creating =
    nuevo === 'gasto' || (nuevo === '1' && tab === 'gastos')
      ? 'EXPENSE'
      : nuevo === 'ingreso' || (nuevo === '1' && tab === 'ingresos')
        ? 'INCOME'
        : null
  const setNuevo = (value: string | null) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set('nuevo', value)
        else next.delete('nuevo')
        return next
      },
      { replace: true, preventScrollReset: true },
    )

  const closeDialog = (open: boolean) => {
    if (open) return
    if (editing) setEditing(null)
    else setNuevo(null)
  }

  const handleSaved = () => {
    if (editing) setEditing(null)
    else if (page > 1) list.update({ page: 1 })
    else setNuevo(null)
    refresh()
  }

  const clearFilters = () => list.update({ search: '', from: '', to: '', category: '' })

  const pickCategory = (value: string) => {
    if (tab === 'gastos') {
      list.update({ category: value })
      return
    }
    if (!value) return
    // Una categoria solo existe en los gastos: desde Todos lleva a esa pestana con los mismos filtros.
    const next = new URLSearchParams({ category: value })
    for (const key of ['search', 'from', 'to', 'mes']) {
      const current = searchParams.get(key)
      if (current) next.set(key, current)
    }
    navigate(`/movimientos/gastos?${next}`)
  }

  if (data && !query.isRefreshing && data.totalPages > 0 && page > data.totalPages) {
    return <Navigate to={list.hrefForPage(data.totalPages)} replace />
  }

  const rows = data?.content
  const selected = isWide && rows?.length ? (rows.find((row) => movementKey(row) === selectedKey) ?? rows[0]) : undefined
  const isEmpty = data !== undefined && data.totalElements === 0 && !query.isRefreshing
  const returnState: ListReturnState = { from: location.pathname + location.search }
  const mes = searchParams.get('mes')
  const keepMonth = mes ? `?mes=${mes}` : ''
  const showChips = tab !== 'ingresos'

  const registerButtons = (
    <div className="flex flex-wrap justify-center gap-2">
      {tab !== 'gastos' && (
        <Button onClick={() => setNuevo(tab === 'ingresos' ? '1' : 'ingreso')}>
          <Plus aria-hidden="true" />
          {tab === 'ingresos' ? 'Registrar mi primer ingreso' : 'Registrar un ingreso'}
        </Button>
      )}
      {tab !== 'ingresos' && (
        <Button variant={tab === 'gastos' ? 'default' : 'outline'} onClick={() => setNuevo(tab === 'gastos' ? '1' : 'gasto')}>
          <Plus aria-hidden="true" />
          {tab === 'gastos' ? 'Registrar mi primer gasto' : 'Registrar un gasto'}
        </Button>
      )}
    </div>
  )

  return (
    <>
      <div className={cn('grid items-start gap-5', selected && 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]')}>
        <section
          id="movimientos-lista"
          aria-labelledby="movimientos-lista-titulo"
          className="min-w-0 scroll-mt-20 overflow-hidden rounded-2xl border bg-card"
        >
          <h2 id="movimientos-lista-titulo" className="sr-only">
            {setup.caption}
          </h2>
          <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:flex-wrap lg:items-start">
            <SectionTabs
              label="Tipo de movimiento"
              tabs={[
                { to: `/movimientos/todos${keepMonth}`, label: 'Todos', icon: ArrowLeftRight },
                { to: `/movimientos/ingresos${keepMonth}`, label: 'Ingresos', icon: ArrowDownLeft },
                { to: `/movimientos/gastos${keepMonth}`, label: 'Gastos', icon: ArrowUpRight },
              ]}
            />
            <SearchInput
              className="lg:min-w-48 lg:flex-1"
              defaultValue={filters.search}
              onSearch={(search) => list.update({ search }, { replace: true })}
              label={setup.search.label}
              placeholder={setup.search.placeholder}
            />
            <DateRangeFilter from={filters.from} to={filters.to} onChange={(from, to) => list.update({ from, to })} />
            <FilterSelect
              className="lg:ml-auto"
              label="Ordenar"
              value={sort}
              options={setup.sortOptions}
              onChange={(value) => list.update({ sort: value })}
            />
          </div>

          {(showChips || (list.hasFilters && !isEmpty)) && (
            <div className="flex flex-wrap items-center gap-1.5 px-4 pb-4 sm:px-5">
              {showChips && (
                <div role="group" aria-label="Categoría" className="flex flex-wrap gap-1">
                  {['', ...EXPENSE_CATEGORIES].map((value) => {
                    const meta = isExpenseCategory(value) ? CATEGORY_META[value] : undefined
                    const pressed = (category ?? '') === value
                    return (
                      <button
                        key={value || 'todas'}
                        type="button"
                        aria-pressed={pressed}
                        onClick={() => pickCategory(value)}
                        className={cn(
                          'inline-flex h-7 items-center gap-1.5 rounded-full border px-2 text-[12.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                          pressed ? 'border-accent-ink bg-accent' : 'hover:bg-muted',
                        )}
                      >
                        {meta && <meta.icon className="size-3.5" style={{ color: meta.color }} aria-hidden="true" />}
                        {meta?.label ?? 'Todas'}
                      </button>
                    )
                  })}
                </div>
              )}
              {list.hasFilters && !isEmpty && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                  <FilterX aria-hidden="true" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}

          <div className="border-t">
            {query.error && !data ? (
              <ErrorState error={query.error} onRetry={query.reload} title={setup.loadError} className="m-4 sm:m-5" />
            ) : isEmpty ? (
              list.hasFilters ? (
                <EmptyState
                  className="m-4 sm:m-5"
                  icon={SearchX}
                  title={setup.noMatch}
                  description="Prueba con otra búsqueda o quita algunos filtros."
                  action={
                    <Button variant="outline" onClick={clearFilters}>
                      <FilterX aria-hidden="true" />
                      Limpiar filtros
                    </Button>
                  }
                />
              ) : (
                <EmptyState className="m-4 sm:m-5" {...setup.empty} action={registerButtons} />
              )
            ) : (
              <>
                {query.error && (
                  <ErrorState
                    error={query.error}
                    onRetry={query.reload}
                    title="No pudimos actualizar la lista"
                    className="m-4 sm:m-5"
                  />
                )}
                <div aria-busy={query.isLoading || query.isRefreshing} className={cn('transition-opacity', query.isRefreshing && 'opacity-60')}>
                  <div
                    aria-hidden="true"
                    className="hidden grid-cols-[4.5rem_minmax(0,1fr)_9.5rem_8rem] gap-3 border-b px-5 py-2.5 text-xs text-muted-foreground sm:grid"
                  >
                    <span>Fecha</span>
                    <span>Concepto</span>
                    <span>Categoría</span>
                    <span className="text-right">Monto</span>
                  </div>
                  <ul aria-label={setup.caption}>
                    {query.isLoading
                      ? Array.from({ length: Math.min(size, 8) }, (_, i) => (
                          <li key={i} className="flex items-center gap-3 border-b px-4 py-3.5 sm:px-5">
                            <Skeleton className="size-8 rounded-[10px]" />
                            <Skeleton className="h-4 max-w-48 flex-1" />
                            <Skeleton className="h-4 w-20" />
                          </li>
                        ))
                      : rows?.map((movement) => (
                          <MovementRow
                            key={movementKey(movement)}
                            movement={movement}
                            selected={selected !== undefined && movementKey(selected) === movementKey(movement)}
                            wide={isWide}
                            onSelect={() => setSelectedKey(movementKey(movement))}
                            returnState={returnState}
                          />
                        ))}
                  </ul>
                </div>
                {data && (
                  <div className="px-4 py-3 sm:px-5">
                    <DataPagination
                      page={page}
                      size={size}
                      totalElements={data.totalElements}
                      totalPages={data.totalPages}
                      hrefForPage={list.hrefForPage}
                      onSizeChange={(value) => list.update({ size: value })}
                      noun={setup.noun}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {selected && (
          <MovementDetailPanel
            key={movementKey(selected)}
            movement={selected}
            version={version}
            insight={outlet?.summary ? movementInsight(selected, outlet.summary, outlet.month) : undefined}
            onEdit={setEditing}
            onDeleted={refresh}
          />
        )}
      </div>

      <ExpenseFormDialog
        open={creating === 'EXPENSE' || editing?.kind === 'EXPENSE'}
        onOpenChange={closeDialog}
        expense={editing?.kind === 'EXPENSE' ? editing.expense : undefined}
        onSaved={handleSaved}
      />
      <IncomeFormDialog
        open={creating === 'INCOME' || editing?.kind === 'INCOME'}
        onOpenChange={closeDialog}
        income={editing?.kind === 'INCOME' ? editing.income : undefined}
        onSaved={handleSaved}
      />
    </>
  )
}

interface MovementRowProps {
  movement: Movement
  selected: boolean
  /** En pantalla ancha la fila elige el detalle de al lado; en el celular abre la pagina del movimiento. */
  wide: boolean
  onSelect: () => void
  returnState: ListReturnState
}

function MovementRow({ movement, selected, wide, onSelect, returnState }: MovementRowProps) {
  const income = movement.kind === 'INCOME'
  const category = movement.category ? CATEGORY_META[movement.category] : undefined
  const Icon = income ? ArrowDownLeft : (category?.icon ?? Receipt)
  const label = movement.label || 'Sin descripción'
  const target =
    'block truncate text-left font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset'

  return (
    <li
      className={cn(
        'relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-muted/50 sm:grid-cols-[4.5rem_minmax(0,1fr)_9.5rem_8rem] sm:px-5',
        selected && 'bg-muted/60 shadow-[inset_3px_0_0_var(--accent-ink)]',
      )}
    >
      <span className="hidden text-[13px] text-muted-foreground sm:block">{formatDayMonth(movement.date)}</span>
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={cn('grid size-8 shrink-0 place-items-center rounded-[10px]', income ? 'bg-income/15 text-income' : 'bg-muted')}
        >
          <Icon className="size-4" style={category ? { color: category.color } : undefined} />
        </span>
        <span className="min-w-0">
          {wide ? (
            <button type="button" aria-pressed={selected} onClick={onSelect} className={target}>
              {label}
            </button>
          ) : (
            <Link to={movementPath(movement)} state={returnState} className={cn(target, 'underline-offset-4 hover:underline')}>
              {label}
            </Link>
          )}
          <span className="block text-xs text-muted-foreground sm:hidden">
            {formatDayMonth(movement.date)} · {income ? 'Ingreso' : (category?.label ?? 'Gasto')}
          </span>
        </span>
      </span>
      <span className="hidden sm:block">
        <MovementTypeBadge movement={movement} />
      </span>
      <AmountText value={movement.amount} kind={income ? 'income' : 'expense'} className="text-right text-[13.5px]" />
    </li>
  )
}
