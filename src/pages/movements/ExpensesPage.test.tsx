import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import type { PageResponse } from '@/types/api'
import type { Expense } from '@/types/movements'
import { expenseService } from '@/services/expenseService'
import ExpensesPage from './ExpensesPage'

const media = vi.hoisted(() => ({ wide: false }))
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => media.wide }))
vi.mock('@/services/expenseService', () => ({
  expenseService: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/services/savingsService', () => ({
  savingsService: { get: vi.fn().mockResolvedValue({ availableBalance: 500 }) },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const list = vi.mocked(expenseService.list)
const get = vi.mocked(expenseService.get)
const remove = vi.mocked(expenseService.remove)

const almuerzo: Expense = {
  id: 7,
  category: 'FOOD',
  amount: 25.5,
  date: '2026-09-30',
  description: 'Almuerzo',
  createdAt: '2026-09-30T17:00:00',
}

function page(content: Expense[], totalElements = content.length): PageResponse<Expense> {
  return { content, page: 0, size: 10, totalElements, totalPages: Math.ceil(totalElements / 10) }
}

function SearchProbe() {
  return <output data-testid="url">{useLocation().search}</output>
}

function renderAt(url: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/movimientos/gastos',
        element: (
          <>
            <ExpensesPage />
            <SearchProbe />
          </>
        ),
      },
    ],
    { initialEntries: [url] },
  )
  render(<RouterProvider router={router} />)
}

const currentSearch = () => screen.getByTestId('url').textContent

describe('ExpensesPage', () => {
  beforeEach(() => {
    media.wide = false
    list.mockReset()
    remove.mockReset()
  })

  it('traduce la URL a la peticion: pagina desde 0 y filtros validos', async () => {
    list.mockResolvedValue(page([almuerzo], 21))
    renderAt('/movimientos/gastos?page=2&size=10&search=almu&category=FOOD&from=2026-09-01&to=2026-09-30&sort=amount,desc')

    await screen.findByText('Almuerzo')
    expect(list).toHaveBeenCalledWith(
      { page: 1, size: 10, sort: 'amount,desc', search: 'almu', category: 'FOOD', from: '2026-09-01', to: '2026-09-30' },
      expect.any(AbortSignal),
    )
  })

  it('no manda filtros invalidos de la URL al backend', async () => {
    list.mockResolvedValue(page([almuerzo]))
    renderAt('/movimientos/gastos?category=CASINO&from=2026-09-30&to=2026-09-01')

    await screen.findByText('Almuerzo')
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ category: undefined, from: undefined, to: undefined }),
      expect.any(AbortSignal),
    )
  })

  it('sin gastos ofrece registrar el primero', async () => {
    list.mockResolvedValue(page([]))
    renderAt('/movimientos/gastos')

    await userEvent.click(await screen.findByRole('button', { name: /Registrar mi primer gasto/ }))
    expect(currentSearch()).toBe('?nuevo=1')
    expect(await screen.findByRole('dialog', { name: 'Registrar gasto' })).toBeInTheDocument()
  })

  it('sin resultados por un filtro ofrece limpiarlo', async () => {
    list.mockResolvedValue(page([]))
    renderAt('/movimientos/gastos?search=zzz')

    expect(await screen.findByText('Ningún gasto coincide con los filtros')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Limpiar filtros/ }))
    expect(currentSearch()).toBe('')
  })

  it('muestra cuantos hay y en que pagina se esta', async () => {
    list.mockResolvedValue({ ...page([almuerzo], 42), page: 1 })
    renderAt('/movimientos/gastos?page=2')

    expect(await screen.findByText(/Mostrando/)).toHaveTextContent('Mostrando 11–20 de 42 gastos')
    expect(screen.getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Página siguiente' })).toHaveAttribute('href', '/movimientos/gastos?page=3')
  })

  it('las categorias filtran la lista', async () => {
    list.mockResolvedValue(page([almuerzo]))
    renderAt('/movimientos/gastos')

    await userEvent.click(await screen.findByRole('button', { name: 'Transporte' }))
    expect(currentSearch()).toBe('?category=TRANSPORT')
    expect(screen.getByRole('button', { name: 'Transporte' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('en pantalla ancha borra desde el detalle, solo despues de confirmar, y recarga la lista', async () => {
    media.wide = true
    list.mockResolvedValue(page([almuerzo]))
    get.mockResolvedValue(almuerzo)
    remove.mockResolvedValue()
    renderAt('/movimientos/gastos')

    const panel = await screen.findByRole('complementary', { name: 'Almuerzo' })
    await userEvent.click(within(panel).getByRole('button', { name: /Eliminar/ }))
    expect(within(panel).getByText('¿Eliminar este gasto?')).toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()
    await userEvent.click(within(panel).getByRole('button', { name: 'Eliminar gasto' }))

    await waitFor(() => expect(remove).toHaveBeenCalledWith(7))
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })

  it('cancelar la confirmacion no borra', async () => {
    media.wide = true
    list.mockResolvedValue(page([almuerzo]))
    get.mockResolvedValue(almuerzo)
    renderAt('/movimientos/gastos')

    const panel = await screen.findByRole('complementary', { name: 'Almuerzo' })
    await userEvent.click(within(panel).getByRole('button', { name: /Eliminar/ }))
    await userEvent.click(within(panel).getByRole('button', { name: 'Cancelar' }))
    expect(within(panel).queryByText('¿Eliminar este gasto?')).not.toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()
  })
})
