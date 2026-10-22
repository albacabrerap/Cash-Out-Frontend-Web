import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { Asset } from '@/types/market'
import { marketService } from '@/services/marketService'
import AdminAssetsPage from './AdminAssetsPage'

vi.mock('@/services/marketService', () => ({
  marketService: { searchAllAssets: vi.fn(), createAsset: vi.fn(), deactivateAsset: vi.fn(), setPrice: vi.fn() },
}))

const search = vi.mocked(marketService.searchAllAssets)

const apple: Asset = {
  id: 190,
  symbol: 'AAPL',
  name: 'Apple Inc. Common Stock',
  type: 'STOCK',
  currency: 'USD',
  active: true,
  source: 'ALPACA',
  exchange: 'NASDAQ',
}
const manual: Asset = { ...apple, id: 9001, symbol: 'CASH', name: 'Fondo de prueba', type: 'FUND', source: 'MANUAL', exchange: null }
const delisted: Asset = { ...apple, id: 77, symbol: 'OLD', name: 'Empresa retirada', active: false }

function renderPage(url = '/admin/activos') {
  const router = createMemoryRouter([{ path: '/admin/activos', element: <AdminAssetsPage /> }], { initialEntries: [url] })
  render(<RouterProvider router={router} />)
}

describe('AdminAssetsPage', () => {
  beforeEach(() => {
    search.mockReset()
    search.mockResolvedValue({ content: [apple, manual, delisted], page: 0, size: 10, totalElements: 3, totalPages: 1 })
  })

  it('busca en todo el catalogo, incluidos los dados de baja', async () => {
    renderPage('/admin/activos?search=aapl&type=STOCK')

    expect(await screen.findByText('Empresa retirada')).toBeInTheDocument()
    expect(search).toHaveBeenCalledWith({ page: 0, size: 10, search: 'aapl', type: 'STOCK' }, expect.any(AbortSignal))
    const row = screen.getByText('Empresa retirada').closest('tr')!
    expect(within(row).getByText('Dado de baja')).toBeInTheDocument()
  })

  it('solo a los activos manuales se les fija el precio', async () => {
    vi.mocked(marketService.setPrice).mockResolvedValue({
      symbol: 'CASH',
      price: 12.5,
      previousClose: null,
      changePercent: null,
      currency: 'USD',
      updatedAt: '2026-10-05T22:00:00',
    })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Acciones de AAPL' }))
    expect(screen.queryByRole('menuitem', { name: 'Fijar precio' })).not.toBeInTheDocument()
    await userEvent.keyboard('{Escape}')

    await userEvent.click(screen.getByRole('button', { name: 'Acciones de CASH' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Fijar precio' }))
    const dialog = await screen.findByRole('dialog', { name: 'Fijar el precio de CASH' })
    await userEvent.type(within(dialog).getByLabelText('Precio'), '12,5')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar precio' }))

    await waitFor(() => expect(marketService.setPrice).toHaveBeenCalledWith(9001, 12.5))
  })

  it('un activo nuevo se manda con simbolo y moneda en mayusculas', async () => {
    vi.mocked(marketService.createAsset).mockResolvedValue(manual)
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Añadir activo' }))
    const dialog = await screen.findByRole('dialog', { name: 'Añadir activo' })
    await userEvent.type(within(dialog).getByLabelText('Símbolo'), 'brk.b')
    await userEvent.type(within(dialog).getByLabelText('Nombre'), 'Berkshire Hathaway')
    await userEvent.clear(within(dialog).getByLabelText('Moneda'))
    await userEvent.type(within(dialog).getByLabelText('Moneda'), 'usd')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Añadir activo' }))

    await waitFor(() =>
      expect(marketService.createAsset).toHaveBeenCalledWith({
        symbol: 'BRK.B',
        name: 'Berkshire Hathaway',
        type: 'STOCK',
        currency: 'USD',
      }),
    )
  })

  it('dar de baja pide confirmacion y no se ofrece para los ya dados de baja', async () => {
    vi.mocked(marketService.deactivateAsset).mockResolvedValue()
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Acciones de OLD' }))
    expect(screen.queryByRole('menuitem', { name: 'Dar de baja' })).not.toBeInTheDocument()
    await userEvent.keyboard('{Escape}')

    await userEvent.click(screen.getByRole('button', { name: 'Acciones de AAPL' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Dar de baja' }))
    const dialog = await screen.findByRole('alertdialog', { name: '¿Dar de baja AAPL?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dar de baja' }))

    await waitFor(() => expect(marketService.deactivateAsset).toHaveBeenCalledWith(190))
  })
})
