import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { SavingsGoal } from '@/types/goals'
import type { Projection } from '@/types/projections'
import { goalService } from '@/services/goalService'
import { projectionService } from '@/services/projectionService'
import ProjectionPage from './ProjectionPage'

vi.mock('@/services/projectionService', () => ({
  projectionService: { list: vi.fn(), preview: vi.fn(), create: vi.fn(), remove: vi.fn() },
}))
vi.mock('@/services/goalService', () => ({ goalService: { list: vi.fn() } }))

const preview = vi.mocked(projectionService.preview)
const list = vi.mocked(projectionService.list)
const create = vi.mocked(projectionService.create)

const DEFAULTS = { initialCapital: 500, monthlyContribution: 120, annualRate: 0.075, periods: 24 }

const laptop: SavingsGoal = {
  id: 7,
  name: 'Laptop',
  targetAmount: 3000,
  accumulatedAmount: 0,
  progressPercent: 0,
  deadline: '2999-01-01',
  status: 'IN_PROGRESS',
  completedAt: null,
  createdAt: '2026-10-01T15:00:00',
}

const tenPercent: Projection = {
  id: 3,
  name: 'Diez por ciento',
  savingsGoalId: null,
  initialCapital: 1000,
  monthlyContribution: 0,
  annualRate: 0.1,
  periods: 12,
  totalContributed: 1000,
  simpleFinalAmount: 1095.69,
  compoundFinalAmount: 1100,
  difference: 4.31,
  calculatedAt: '2026-10-01T15:00:00',
}

function renderPage() {
  const router = createMemoryRouter([{ path: '/proyeccion', element: <ProjectionPage /> }], {
    initialEntries: ['/proyeccion'],
  })
  render(<RouterProvider router={router} />)
}

const ready = () => screen.findByRole('region', { name: 'Interés compuesto' })

describe('ProjectionPage', () => {
  beforeEach(() => {
    preview.mockReset()
    list.mockReset()
    create.mockReset()
    preview.mockResolvedValue({
      totalContributed: 3380,
      simpleFinalAmount: 3652.75,
      compoundFinalAmount: 3667.18,
      difference: 14.43,
    })
    list.mockResolvedValue([])
    vi.mocked(goalService.list).mockResolvedValue([laptop])
  })

  it('los montos los calcula el backend con los parametros escritos', async () => {
    renderPage()

    const compound = await ready()
    expect(within(compound).getByText(/^S\/\s?3,667\.18$/)).toBeInTheDocument()
    expect(within(compound).getByText(/^\+S\/\s?14\.43 más que con interés simple$/)).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Interés simple' })).getByText(/^S\/\s?3,652\.75$/)).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Sin interés' })).getByText(/^S\/\s?3,380\.00$/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'En 2 años tendrías' })).toBeInTheDocument()
    expect(preview).toHaveBeenCalledWith(DEFAULTS, expect.any(AbortSignal))
  })

  it('mientras se escribe espera a que el usuario pare: una sola consulta', async () => {
    renderPage()
    await ready()
    preview.mockClear()

    const periods = screen.getByLabelText('Plazo (meses)')
    await userEvent.clear(periods)
    await userEvent.type(periods, '360')

    await waitFor(() => expect(preview).toHaveBeenCalledWith({ ...DEFAULTS, periods: 360 }, expect.any(AbortSignal)))
    expect(preview).toHaveBeenCalledTimes(1)
    expect(screen.getByText('30 años')).toBeInTheDocument()
  })

  it('los deslizadores y las tasas de referencia cambian los mismos campos', async () => {
    renderPage()
    await ready()

    fireEvent.change(screen.getByLabelText('Plazo (meses), deslizador'), { target: { value: '48' } })
    expect(screen.getByLabelText('Plazo (meses)')).toHaveValue('48')
    await userEvent.click(screen.getByRole('button', { name: 'Fondo mutuo · 8 %' }))
    expect(screen.getByLabelText('TEA (%)')).toHaveValue('8')

    await waitFor(() =>
      expect(preview).toHaveBeenLastCalledWith({ ...DEFAULTS, periods: 48, annualRate: 0.08 }, expect.any(AbortSignal)),
    )
  })

  it('el año a año reparte la curva en periodos de doce meses', async () => {
    renderPage()
    await ready()

    const table = screen.getByRole('table', { name: /cada año/ })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByRole('rowheader', { name: 'Año 2' })).toBeInTheDocument()
  })

  it('con un parametro invalido avisa, no consulta y no deja guardar', async () => {
    renderPage()
    await ready()
    preview.mockClear()

    const periods = screen.getByLabelText('Plazo (meses)')
    await userEvent.clear(periods)
    await userEvent.type(periods, '601')

    expect(await screen.findByText('El plazo va de 1 a 600 meses (50 años).')).toBeInTheDocument()
    expect(screen.getByText('Corrige los parámetros para ver el resultado.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar escenario' })).toBeDisabled()
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(preview).not.toHaveBeenCalled()
  })

  it('comparada con una meta dice si se llega a tiempo y la propone al guardar', async () => {
    renderPage()
    await ready()

    await userEvent.click(await screen.findByRole('button', { name: /^Laptop/ }))
    expect(screen.getByText(/^Llegas a la meta Laptop en el mes \d+, dentro de su plazo/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Guardar escenario' }))
    const dialog = await screen.findByRole('dialog', { name: 'Guardar escenario' })
    expect(within(dialog).getByRole('combobox', { name: 'Meta' })).toHaveTextContent('Laptop')
  })

  it('guarda el escenario con su nombre y la meta elegida', async () => {
    create.mockResolvedValue({ ...tenPercent, id: 9 })
    renderPage()
    await ready()

    await userEvent.click(screen.getByRole('button', { name: 'Guardar escenario' }))
    const dialog = await screen.findByRole('dialog', { name: 'Guardar escenario' })
    await userEvent.type(within(dialog).getByLabelText('Nombre'), 'Para la laptop')
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Meta' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Laptop' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({ ...DEFAULTS, name: 'Para la laptop', savingsGoalId: 7 }),
    )
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })

  it('no guarda dos veces el mismo escenario', async () => {
    list.mockResolvedValue([{ ...tenPercent, ...DEFAULTS }])
    renderPage()
    await ready()

    expect(await screen.findByRole('button', { name: 'Usar Diez por ciento en la calculadora' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar escenario' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('un escenario guardado se puede volver a cargar en la calculadora', async () => {
    list.mockResolvedValue([tenPercent])
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Usar Diez por ciento en la calculadora' }))

    await waitFor(() => expect(screen.getByLabelText('TEA (%)')).toHaveValue('10'))
    expect(screen.getByLabelText('Capital inicial')).toHaveValue('1000.00')
    expect(screen.getByLabelText('Aporte mensual')).toHaveValue('0.00')
    expect(screen.getByLabelText('Plazo (meses)')).toHaveValue('12')
    await waitFor(() =>
      expect(preview).toHaveBeenLastCalledWith(
        { initialCapital: 1000, monthlyContribution: 0, annualRate: 0.1, periods: 12 },
        expect.any(AbortSignal),
      ),
    )
  })

  it('eliminar pide confirmacion y recarga la lista', async () => {
    list.mockResolvedValue([tenPercent])
    vi.mocked(projectionService.remove).mockResolvedValue()
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar Diez por ciento' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar escenario' }))

    await waitFor(() => expect(projectionService.remove).toHaveBeenCalledWith(3))
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })
})
