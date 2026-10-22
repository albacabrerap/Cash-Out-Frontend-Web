import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { Movement } from '@/types/movements'
import { expenseService } from '@/services/expenseService'
import { incomeService } from '@/services/incomeService'
import { movementService } from '@/services/movementService'
import AllMovementsPage from './AllMovementsPage'

const media = vi.hoisted(() => ({ wide: false }))
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => media.wide }))
vi.mock('@/services/movementService', () => ({ movementService: { list: vi.fn() } }))
vi.mock('@/services/incomeService', () => ({ incomeService: { get: vi.fn(), remove: vi.fn() } }))
vi.mock('@/services/expenseService', () => ({ expenseService: { get: vi.fn(), remove: vi.fn() } }))

const list = vi.mocked(movementService.list)
const getIncome = vi.mocked(incomeService.get)
const getExpense = vi.mocked(expenseService.get)

const beca: Movement = {
  id: 3,
  kind: 'INCOME',
  label: 'Beca',
  category: null,
  amount: 800,
  date: '2026-09-28',
  createdAt: '2026-09-28T15:00:00',
}
// Mismo id que el ingreso: cada tabla tiene su secuencia.
const snack: Movement = {
  id: 3,
  kind: 'EXPENSE',
  label: null,
  category: 'FOOD',
  amount: 4.5,
  date: '2026-09-27',
  createdAt: '2026-09-27T15:00:00',
}

function renderAt(url: string) {
  const router = createMemoryRouter(
    [
      { path: '/movimientos/todos', element: <AllMovementsPage /> },
      { path: '/movimientos/gastos', element: <p>gastos</p> },
      { path: '/movimientos/ingresos/:id', element: <p>detalle</p> },
    ],
    { initialEntries: [url] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('AllMovementsPage', () => {
  beforeEach(() => {
    media.wide = false
    list.mockReset()
    list.mockResolvedValue({ content: [beca, snack], page: 0, size: 10, totalElements: 2, totalPages: 1 })
  })

  it('cada fila enlaza al detalle de su tipo, aunque los ids coincidan', async () => {
    renderAt('/movimientos/todos')

    // La primera prueba del archivo tambien espera a que carguen los modulos; con la suite entera puede pasar de 1 s.
    expect(await screen.findByRole('link', { name: 'Beca' }, { timeout: 3000 })).toHaveAttribute(
      'href',
      '/movimientos/ingresos/3',
    )
    expect(screen.getByRole('link', { name: 'Sin descripción' })).toHaveAttribute('href', '/movimientos/gastos/3')
  })

  it('distingue ingresos y gastos por signo y tipo', async () => {
    renderAt('/movimientos/todos')

    await screen.findByRole('link', { name: 'Beca' })
    const [becaRow, snackRow] = within(screen.getByRole('list', { name: 'Tus ingresos y gastos' })).getAllByRole('listitem')
    expect(within(becaRow).getByText('Ingreso', { selector: '[data-slot=badge]' })).toBeInTheDocument()
    expect(within(becaRow).getByText(/^\+S\/\s?800\.00$/)).toBeInTheDocument()
    expect(within(snackRow).getByText('Comida', { selector: '[data-slot=badge]' })).toBeInTheDocument()
    expect(within(snackRow).getByText(/^−S\/\s?4\.50$/)).toBeInTheDocument()
  })

  it('el detalle recibe el listado con sus filtros para poder volver', async () => {
    const router = renderAt('/movimientos/todos?search=beca')

    ;(await screen.findByRole('link', { name: 'Beca' })).click()
    expect(router.state.location.pathname).toBe('/movimientos/ingresos/3')
    expect(router.state.location.state).toEqual({ from: '/movimientos/todos?search=beca' })
  })

  it('una categoria lleva a los gastos con los mismos filtros y el mes', async () => {
    const router = renderAt('/movimientos/todos?search=caf&mes=2026-09')

    await userEvent.click(await screen.findByRole('button', { name: 'Comida' }))
    expect(router.state.location.pathname).toBe('/movimientos/gastos')
    expect(router.state.location.search).toBe('?category=FOOD&search=caf&mes=2026-09')
  })

  it('en pantalla ancha la fila elige el detalle de al lado', async () => {
    media.wide = true
    getIncome.mockResolvedValue({ ...beca, source: 'Beca', description: 'De la universidad' })
    getExpense.mockResolvedValue({ ...snack, category: 'FOOD', description: null })
    renderAt('/movimientos/todos')

    // Sin eleccion, el detalle muestra la primera fila, con la descripcion que la fila no trae.
    const panel = await screen.findByRole('complementary', { name: 'Beca' })
    expect(await within(panel).findByText('De la universidad')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Sin descripción' }))
    expect(screen.getByRole('button', { name: 'Sin descripción' })).toHaveAttribute('aria-pressed', 'true')
    const expensePanel = screen.getByRole('complementary', { name: 'Sin descripción' })
    expect(within(expensePanel).getByText('Comida')).toBeInTheDocument()
    expect(getExpense).toHaveBeenCalledWith(3, expect.any(AbortSignal))
  })
})
