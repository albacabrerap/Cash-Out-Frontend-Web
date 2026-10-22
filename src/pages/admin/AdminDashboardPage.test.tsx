import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { User } from '@/types/auth'
import type { Minigame } from '@/types/minigames'
import { marketService } from '@/services/marketService'
import { minigameService } from '@/services/minigameService'
import { userService } from '@/services/userService'
import AdminDashboardPage from './AdminDashboardPage'

vi.mock('@/services/userService', () => ({ userService: { list: vi.fn() } }))
vi.mock('@/services/minigameService', () => ({ minigameService: { listAll: vi.fn() } }))
vi.mock('@/services/marketService', () => ({
  marketService: { searchAllAssets: vi.fn(), searchAssets: vi.fn(), syncCatalog: vi.fn() },
}))

const user = (id: number, overrides: Partial<User> = {}): User => ({
  id,
  name: `Cuenta ${id}`,
  email: `cuenta${id}@checkout.test`,
  roles: ['USER'],
  status: 'ACTIVE',
  birthDate: null,
  createdAt: `2026-10-0${id}T12:00:00`,
  ...overrides,
})

const game = (id: number, status: Minigame['status']): Minigame => ({
  id,
  title: `Juego ${id}`,
  type: 'TRIVIA',
  topic: 'Interés compuesto',
  tokenCost: 0,
  maxTokenReward: 10,
  status,
})

const page = (totalElements: number) => ({ content: [], page: 0, size: 1, totalElements, totalPages: totalElements })

function renderPage() {
  const router = createMemoryRouter([{ path: '/admin', element: <AdminDashboardPage /> }], { initialEntries: ['/admin'] })
  render(<RouterProvider router={router} />)
}

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(userService.list).mockResolvedValue([
      user(1),
      user(2, { status: 'INACTIVE' }),
      user(3, { roles: ['ADMIN'], name: 'Admin' }),
    ])
    vi.mocked(minigameService.listAll).mockResolvedValue([game(1, 'PUBLISHED'), game(2, 'DRAFT'), game(3, 'ARCHIVED')])
    vi.mocked(marketService.searchAllAssets).mockResolvedValue(page(13509))
    vi.mocked(marketService.searchAssets).mockResolvedValue(page(13500))
  })

  it('resume cuentas, juegos y acciones con los datos reales', async () => {
    renderPage()

    expect(await screen.findByText('2 activas · 1 de administración')).toBeInTheDocument()
    expect(screen.getByText('1 de 3')).toBeInTheDocument()
    expect(await screen.findByText('13,500')).toBeInTheDocument()
    expect(screen.getByText('9 dadas de baja')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Admin')
  })

  it('sincroniza el catalogo, muestra el resultado y vuelve a contar', async () => {
    vi.mocked(marketService.syncCatalog).mockResolvedValue({ received: 14388, created: 14, updated: 4, deactivated: 17 })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Sincronizar con Alpaca' }))

    expect(await screen.findByText('14,388')).toBeInTheDocument()
    expect(screen.getByText('Nuevas').nextSibling).toHaveTextContent('14')
    await waitFor(() => expect(marketService.searchAssets).toHaveBeenCalledTimes(2))
  })
})
