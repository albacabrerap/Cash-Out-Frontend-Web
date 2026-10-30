import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ApiError } from '@/api/errors'
import { updownCaseService } from '@/services/updownCaseService'
import type { UpDownCase } from '@/types/updownCases'
import AdminUpDownCasesPage from './AdminUpDownCasesPage'

vi.mock('@/services/updownCaseService', () => ({
  updownCaseService: { list: vi.fn(), preview: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}))

const list = vi.mocked(updownCaseService.list)
const preview = vi.mocked(updownCaseService.preview)
const create = vi.mocked(updownCaseService.create)
const update = vi.mocked(updownCaseService.update)

const kre: UpDownCase = {
  id: 1,
  symbol: 'KRE',
  cutoff: '2023-03-09',
  sector: 'Bancos regionales',
  name: 'un índice de bancos regionales (KRE)',
  context: 'Silicon Valley Bank anuncia una gran pérdida en bonos.',
  lesson: 'El miedo se contagió.',
  active: true,
  changePercent: -18.4,
  outcome: 'DOWN',
  timesPlayed: 3,
  lastPlayedAt: '2026-10-27T21:00:00',
}
const pg: UpDownCase = { ...kre, id: 2, symbol: 'PG', changePercent: 1.6, outcome: 'FLAT', timesPlayed: 0, lastPlayedAt: null }

function renderPage() {
  const router = createMemoryRouter([{ path: '/admin/sube-o-baja', element: <AdminUpDownCasesPage /> }], {
    initialEntries: ['/admin/sube-o-baja'],
  })
  render(<RouterProvider router={router} />)
}

describe('AdminUpDownCasesPage', () => {
  beforeEach(() => {
    list.mockReset()
    preview.mockReset()
    create.mockReset()
    update.mockReset()
    list.mockResolvedValue([kre, pg])
  })

  it('lista los casos con su resultado real, cuantas veces salieron y el balance de los activos', async () => {
    renderPage()

    const rows = within(await screen.findByRole('table')).getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('▼ −18.4 %')).toBeInTheDocument()
    expect(within(rows[0]).getByText(/3 veces/)).toBeInTheDocument()
    expect(within(rows[1]).getByText('Nunca')).toBeInTheDocument()
    expect(screen.getByLabelText('Casos activos por resultado')).toHaveTextContent('2 activos')
    expect(screen.getByText(/Con menos de 8 activos/)).toBeInTheDocument()
  })

  it('agregar: muestra que paso de verdad y guarda el simbolo en mayusculas', async () => {
    preview.mockResolvedValue({
      symbol: 'SPY',
      cutoff: '2024-08-02',
      past: Array.from({ length: 80 }, () => 100),
      future: Array.from({ length: 22 }, (_, i) => 100 + i / 6),
      changePercent: 3.6,
      outcome: 'UP',
    })
    create.mockResolvedValue({ ...kre, id: 3 })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Agregar caso' }))
    const dialog = await screen.findByRole('dialog', { name: 'Agregar caso' })
    await userEvent.type(within(dialog).getByLabelText('Activo'), 'spy')
    await userEvent.type(within(dialog).getByLabelText('Día de la noticia'), '2024-08-02')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ver qué pasó' }))
    expect(await within(dialog).findByText('▲ Sube +3.6 %')).toBeInTheDocument()
    expect(preview).toHaveBeenCalledWith('SPY', '2024-08-02')

    await userEvent.type(within(dialog).getByLabelText('Pista'), 'Índice amplio')
    await userEvent.type(within(dialog).getByLabelText('Qué era'), 'el S&P 500 (SPY)')
    await userEvent.type(within(dialog).getByLabelText('Noticia'), 'El desempleo sube a 4.3 %.')
    await userEvent.type(within(dialog).getByLabelText('Lección'), 'Vender en pleno pánico suele salir caro.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Agregar caso' }))

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        symbol: 'SPY',
        cutoff: '2024-08-02',
        sector: 'Índice amplio',
        name: 'el S&P 500 (SPY)',
        context: 'El desempleo sube a 4.3 %.',
        lesson: 'Vender en pleno pánico suele salir caro.',
        active: true,
      }),
    )
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })

  it('si no hay cierres para esa fecha lo dice en la vista previa', async () => {
    preview.mockRejectedValue(new ApiError({ kind: 'http', status: 400, serverMessage: 'No hay cierres de ZZZ suficientes.' }))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Agregar caso' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Activo'), 'ZZZ')
    await userEvent.type(within(dialog).getByLabelText('Día de la noticia'), '2024-08-03')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ver qué pasó' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No hay cierres de ZZZ suficientes.')
  })

  it('desactivar manda el caso completo con active en false', async () => {
    update.mockResolvedValue({ ...kre, active: false })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Acciones del caso KRE del 2023-03-09' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Desactivar' }))

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(1, {
        symbol: 'KRE',
        cutoff: '2023-03-09',
        sector: 'Bancos regionales',
        name: 'un índice de bancos regionales (KRE)',
        context: 'Silicon Valley Bank anuncia una gran pérdida en bonos.',
        lesson: 'El miedo se contagió.',
        active: false,
      }),
    )
  })
})
