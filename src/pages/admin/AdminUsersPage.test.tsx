import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthContext, type AuthContextValue } from '@/contexts/authContext'
import type { User } from '@/types/auth'
import { userService } from '@/services/userService'
import AdminUsersPage from './AdminUsersPage'

vi.mock('@/services/userService', () => ({ userService: { list: vi.fn(), setRoles: vi.fn(), setStatus: vi.fn() } }))

const admin: User = {
  id: 7,
  name: 'Admin Cash-Out',
  email: 'admin@checkout.test',
  roles: ['ADMIN'],
  status: 'ACTIVE',
  birthDate: null,
  createdAt: '2026-10-05T21:00:00',
  googleOnly: false,
  googleLinked: false,
  emailVerified: true,
}
const valeria: User = { ...admin, id: 5, name: 'Valeria Quispe', email: 'valeria@checkout.test', roles: ['USER'], createdAt: '2026-10-03T18:47:00' }
const andres: User = { ...admin, id: 2, name: 'Andrés Núñez', email: 'andres@utec.edu.pe', roles: ['USER'], status: 'INACTIVE', createdAt: '2026-09-01T10:00:00' }
const lucia: User = { ...admin, id: 3, name: 'Lucía Paz', email: 'lucia@utec.edu.pe', roles: ['USER'], status: 'BLOCKED', createdAt: '2026-08-01T10:00:00' }

function renderPage() {
  const auth = { user: admin, hasRole: () => true } as unknown as AuthContextValue
  const router = createMemoryRouter([{ path: '/admin/usuarios', element: <AdminUsersPage /> }], {
    initialEntries: ['/admin/usuarios'],
  })
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  )
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.mocked(userService.list).mockReset()
    vi.mocked(userService.setRoles).mockReset()
    vi.mocked(userService.setStatus).mockReset()
    vi.mocked(userService.list).mockResolvedValue([andres, admin, valeria])
  })

  it('lista las cuentas de la mas reciente a la mas antigua, con rol y estado', async () => {
    renderPage()

    const rows = within(await screen.findByRole('table')).getAllByRole('row').slice(1)
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual([
      expect.stringContaining('Admin Cash-Out'),
      expect.stringContaining('Valeria Quispe'),
      expect.stringContaining('Andrés Núñez'),
    ])
    expect(within(rows[0]).getByText('Tú')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Administrador')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Dada de baja')).toBeInTheDocument()
  })

  it('busca por nombre o correo sin importar tildes', async () => {
    renderPage()
    await screen.findByRole('table')

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar cuentas' }), 'andres nunez')
    await waitFor(() => expect(screen.queryByText('Valeria Quispe')).not.toBeInTheDocument())
    expect(screen.getByText('andres@utec.edu.pe')).toBeInTheDocument()

    await userEvent.clear(screen.getByRole('searchbox', { name: 'Buscar cuentas' }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar cuentas' }), 'zzz')
    expect(await screen.findByText('Ninguna cuenta coincide')).toBeInTheDocument()
  })

  it('tu propia cuenta no tiene acciones', async () => {
    renderPage()
    await screen.findByRole('table')

    expect(screen.queryByRole('button', { name: 'Acciones de la cuenta admin@checkout.test' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Acciones de la cuenta valeria@checkout.test' })).toBeInTheDocument()
  })

  it('cambiar el rol manda el rol elegido y recarga la lista', async () => {
    vi.mocked(userService.setRoles).mockResolvedValue({ ...valeria, roles: ['ADMIN'] })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Acciones de la cuenta valeria@checkout.test' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Cambiar rol' }))
    const dialog = await screen.findByRole('dialog', { name: 'Rol de Valeria Quispe' })
    expect(within(dialog).getByRole('button', { name: 'Cambiar rol' })).toBeDisabled()

    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Rol' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Administrador' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cambiar rol' }))

    await waitFor(() => expect(userService.setRoles).toHaveBeenCalledWith(5, ['ADMIN']))
    await waitFor(() => expect(userService.list).toHaveBeenCalledTimes(2))
  })

  it('bloquear pide confirmacion', async () => {
    vi.mocked(userService.setStatus).mockResolvedValue({ ...valeria, status: 'BLOCKED' })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Acciones de la cuenta valeria@checkout.test' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Bloquear cuenta' }))
    const dialog = await screen.findByRole('alertdialog', { name: '¿Bloquear a Valeria Quispe?' })
    expect(userService.setStatus).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bloquear' }))

    await waitFor(() => expect(userService.setStatus).toHaveBeenCalledWith(5, 'BLOCKED'))
  })

  it('una cuenta bloqueada se desbloquea y una dada de baja se reactiva', async () => {
    vi.mocked(userService.list).mockResolvedValue([andres, admin, lucia])
    vi.mocked(userService.setStatus).mockResolvedValue({ ...lucia, status: 'ACTIVE' })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Acciones de la cuenta lucia@utec.edu.pe' }))
    expect(screen.queryByRole('menuitem', { name: 'Bloquear cuenta' })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Desbloquear' }))
    await waitFor(() => expect(userService.setStatus).toHaveBeenCalledWith(3, 'ACTIVE'))

    await userEvent.click(screen.getByRole('button', { name: 'Acciones de la cuenta andres@utec.edu.pe' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Reactivar cuenta' }))
    await waitFor(() => expect(userService.setStatus).toHaveBeenCalledWith(2, 'ACTIVE'))
  })
})
