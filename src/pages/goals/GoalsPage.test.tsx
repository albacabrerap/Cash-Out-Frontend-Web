import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import type { Contribution, SavingsGoal } from '@/types/goals'
import { goalService } from '@/services/goalService'
import GoalsPage from './GoalsPage'

const media = vi.hoisted(() => ({ wide: false }))
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => media.wide }))
vi.mock('@/services/goalService', () => ({
  goalService: { list: vi.fn(), contributions: vi.fn(), contribute: vi.fn(), create: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/services/savingsService', () => ({
  savingsService: {
    get: vi.fn().mockResolvedValue({ id: 1, currentBalance: 3000, committedAmount: 1510, availableBalance: 800, updatedAt: '' }),
  },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const list = vi.mocked(goalService.list)
const contributions = vi.mocked(goalService.contributions)
const contribute = vi.mocked(goalService.contribute)
const create = vi.mocked(goalService.create)
const remove = vi.mocked(goalService.remove)

const goal = (overrides: Partial<SavingsGoal>): SavingsGoal => ({
  id: 1,
  name: 'Meta',
  targetAmount: 1000,
  accumulatedAmount: 0,
  progressPercent: 0,
  deadline: '2027-01-01',
  status: 'IN_PROGRESS',
  completedAt: null,
  createdAt: '2026-06-01T12:00:00',
  ...overrides,
})

// Al 20 de octubre la laptop va atrasada (49 % con 55 % del plazo) y el viaje a tiempo.
const laptop = goal({
  id: 1,
  name: 'Laptop',
  targetAmount: 2400,
  accumulatedAmount: 1180,
  progressPercent: 49.17,
  deadline: '2027-03-31',
  createdAt: '2026-04-01T12:00:00',
})
const viaje = goal({ id: 2, name: 'Viaje a Cusco', targetAmount: 450, accumulatedAmount: 330, progressPercent: 73.33, deadline: '2026-12-20' })
const audifonos = goal({
  id: 3,
  name: 'Audífonos',
  targetAmount: 250,
  accumulatedAmount: 250,
  progressPercent: 100,
  deadline: '2026-09-30',
  status: 'COMPLETED',
  completedAt: '2026-08-28T15:00:00',
})
const concierto = goal({ id: 4, name: 'Concierto', targetAmount: 220, accumulatedAmount: 90, progressPercent: 40.9, deadline: '2026-09-30', status: 'EXPIRED' })

const laptopContributions: Contribution[] = [
  { id: 11, amount: 200, source: 'MANUAL', createdAt: '2026-10-01T15:00:00' },
  { id: 10, amount: 180, source: 'INCOME', createdAt: '2026-09-15T15:00:00' },
]

function SearchProbe() {
  return <output data-testid="url">{useLocation().search}</output>
}

function renderAt(url: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/metas',
        element: (
          <>
            <GoalsPage />
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
const column = (name: RegExp) => screen.getByRole('region', { name })
const board = () => screen.getByRole('region', { name: 'Tablero' })

describe('GoalsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 20, 12))
    media.wide = false
    list.mockReset()
    list.mockResolvedValue([laptop, viaje, audifonos, concierto])
    contributions.mockReset()
    contributions.mockImplementation(async (goalId) => (goalId === 1 ? laptopContributions : []))
    contribute.mockReset()
    create.mockReset()
    remove.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resume las metas en curso y las agrupa por estado', async () => {
    renderAt('/metas')

    expect(await screen.findByText(/en curso ·/)).toHaveTextContent(
      /^2 en curso · S\/\s1,510\.00 ahorrados de S\/\s2,850\.00$/,
    )
    expect(within(column(/^En curso/)).getAllByRole('link').map((link) => link.textContent)).toEqual([
      expect.stringContaining('Viaje a Cusco'),
      expect.stringContaining('Laptop'),
    ])
    expect(within(column(/^Cumplidas/)).getByText('Audífonos')).toBeInTheDocument()
    expect(within(column(/^Vencidas/)).getByText('Concierto')).toBeInTheDocument()
  })

  it('los medidores comparan el avance con el tiempo que ya paso', async () => {
    renderAt('/metas')

    const gauges = await screen.findByRole('region', { name: 'Metas en curso' })
    expect(within(gauges).getByRole('link', { name: /Laptop/ })).toHaveTextContent('Atrasada')
    expect(within(gauges).getByRole('link', { name: /Viaje a Cusco/ })).toHaveTextContent('A tiempo')
  })

  it('agrupa por fecha limite y lo guarda en la URL', async () => {
    renderAt('/metas')

    await userEvent.click(await screen.findByRole('button', { name: 'Fecha límite' }))
    expect(currentSearch()).toBe('?agrupar=fecha')
    expect(within(column(/^Vencen en 2026/)).getByText('Viaje a Cusco')).toBeInTheDocument()
    expect(within(column(/^Vencen después de 2026/)).getByText('Laptop')).toBeInTheDocument()
    expect(within(column(/^Terminadas/)).getByText('Audífonos')).toBeInTheDocument()
    expect(within(column(/^Terminadas/)).getByText('Concierto')).toBeInTheDocument()
  })

  it('en el celular cada meta abre su pagina', async () => {
    renderAt('/metas')

    await screen.findByText(/en curso ·/)
    for (const link of within(board()).getAllByRole('link', { name: /Laptop/ })) {
      expect(link).toHaveAttribute('href', '/metas/1')
    }
  })

  it('en pantalla ancha la meta elegida muestra sus hitos y aportes al lado', async () => {
    media.wide = true
    renderAt('/metas')

    // Sin eleccion, el panel muestra la en curso que vence primero.
    expect(await screen.findByRole('complementary', { name: 'Viaje a Cusco' })).toBeInTheDocument()
    await userEvent.click(within(board()).getByRole('button', { name: /Laptop/ }))

    const panel = screen.getByRole('complementary', { name: 'Laptop' })
    expect(within(panel).getByText(/^Vas \d+ puntos detrás del ritmo/)).toBeInTheDocument()
    expect(within(panel).getByText(/25 % ahorrado/).closest('li')).toHaveTextContent('(logrado)')
    expect(within(panel).getByText(/50 % ahorrado/).closest('li')).toHaveTextContent('(el siguiente)')
    expect(await within(panel).findByText('Desde un ingreso')).toBeInTheDocument()
    expect(within(panel).getByText('Aporte manual')).toBeInTheDocument()
  })

  it('aportar desde el panel registra un aporte manual y recarga las metas', async () => {
    media.wide = true
    contribute.mockResolvedValue({ id: 12, amount: 50, source: 'MANUAL', createdAt: '2026-10-20T15:00:00' })
    renderAt('/metas')

    const panel = await screen.findByRole('complementary', { name: 'Viaje a Cusco' })
    // Faltan S/ 120: aportar S/ 100 si, S/ 50 tambien; no se ofrece lo que supera lo que falta.
    expect(within(panel).queryByRole('button', { name: /^\+\s*S\/\s100$/ })).toBeInTheDocument()
    await userEvent.click(await within(panel).findByRole('button', { name: /^\+\s*S\/\s50$/ }))

    await waitFor(() => expect(contribute).toHaveBeenCalledWith(2, { amount: 50, source: 'MANUAL' }))
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })

  it('?nuevo=1 abre el alta en el panel con la vista previa del aporte mensual', async () => {
    media.wide = true
    create.mockResolvedValue(goal({ id: 9, name: 'Bici', targetAmount: 900, deadline: '2027-04-30' }))
    renderAt('/metas?nuevo=1')

    const panel = await screen.findByRole('complementary', { name: '¿Para qué quieres ahorrar?' })
    expect(within(panel).getByText('0 de 3 datos listos')).toBeInTheDocument()
    await userEvent.type(within(panel).getByLabelText('Nombre'), 'Bici')
    await userEvent.type(within(panel).getByLabelText('Monto objetivo'), '900')
    fireEvent.change(within(panel).getByLabelText('Fecha límite'), { target: { value: '2027-04-30' } })

    expect(await within(panel).findByText('3 de 3 datos listos')).toBeInTheDocument()
    expect(within(panel).getByText(/aparta S\/\s142\.00 al mes \(6 meses\)\.$/)).toBeInTheDocument()

    await userEvent.click(within(panel).getByRole('button', { name: 'Crear meta' }))
    await waitFor(() => expect(create).toHaveBeenCalledWith({ name: 'Bici', targetAmount: 900, deadline: '2027-04-30' }))
    await waitFor(() => expect(currentSearch()).toBe(''))
  })

  it('eliminar desde el panel pide confirmacion', async () => {
    media.wide = true
    remove.mockResolvedValue()
    renderAt('/metas')

    const panel = await screen.findByRole('complementary', { name: 'Viaje a Cusco' })
    await userEvent.click(within(panel).getByRole('button', { name: /Eliminar/ }))
    expect(within(panel).getByText('¿Eliminar esta meta?')).toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()
    await userEvent.click(within(panel).getByRole('button', { name: 'Eliminar meta' }))

    await waitFor(() => expect(remove).toHaveBeenCalledWith(2))
  })

  it('sin metas invita a crear la primera', async () => {
    list.mockResolvedValue([])
    renderAt('/metas')

    expect(await screen.findByText('Todavía no tienes metas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Crear mi primera meta/ })).toBeInTheDocument()
  })
})
