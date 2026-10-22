import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { AuthContext, type AuthContextValue } from '@/contexts/authContext'
import type { User } from '@/types/auth'
import { GuestOnly } from './GuestOnly'
import { RequireAuth, type LoginRedirectState } from './RequireAuth'

const valeria: User = {
  id: 1,
  name: 'Valeria Quispe',
  email: 'valeria@checkout.test',
  roles: ['USER'],
  status: 'ACTIVE',
  birthDate: null,
  createdAt: '2026-10-03T18:47:00',
}

function authValue(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    status: 'anonymous',
    user: null,
    endReason: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(async () => {}),
    updateUser: vi.fn(),
    retryRestore: vi.fn(),
    hasRole: () => false,
    ...overrides,
  }
}

function LoginProbe() {
  const location = useLocation()
  const from = (location.state as LoginRedirectState | null)?.from
  return <p>login{from ? ` desde ${from}` : ''}</p>
}

function renderAt(path: string, auth: AuthContextValue, state?: unknown) {
  const router = createMemoryRouter(
    [
      {
        element: <GuestOnly />,
        children: [{ path: '/login', element: <LoginProbe /> }],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: '/resumen', element: <p>resumen</p> },
          { path: '/movimientos', element: <p>movimientos</p> },
        ],
      },
      {
        element: <RequireAuth roles={['ADMIN']} />,
        children: [{ path: '/admin', element: <p>admin</p> }],
      },
    ],
    { initialEntries: [{ pathname: path.split('?')[0], search: path.includes('?') ? `?${path.split('?')[1]}` : '', state }] },
  )
  render(
    <AuthContext value={auth}>
      <RouterProvider router={router} />
    </AuthContext>,
  )
}

describe('RequireAuth', () => {
  it('mientras recupera la sesion espera, no manda al login', () => {
    renderAt('/resumen', authValue({ status: 'restoring' }))
    expect(screen.getByText('Recuperando tu sesión…')).toBeInTheDocument()
    expect(screen.queryByText(/^login/)).not.toBeInTheDocument()
  })

  it('con la sesion vencida manda al login recordando la pagina', async () => {
    renderAt('/movimientos?page=2', authValue({ status: 'anonymous', endReason: 'expired' }))
    expect(await screen.findByText('login desde /movimientos?page=2')).toBeInTheDocument()
  })

  it('tras un logout voluntario no recuerda la pagina', async () => {
    renderAt('/movimientos', authValue({ status: 'anonymous', endReason: 'logout' }))
    expect(await screen.findByText('login')).toBeInTheDocument()
  })

  it('si el servidor no responde ofrece reintentar en vez de pedir la contrasena', async () => {
    const auth = authValue({ status: 'unavailable' })
    renderAt('/resumen', auth)

    expect(screen.getByText('No pudimos conectar con Cash-Out')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(auth.retryRestore).toHaveBeenCalledOnce()
  })

  it('con sesion deja pasar', () => {
    renderAt('/resumen', authValue({ status: 'authenticated', user: valeria }))
    expect(screen.getByText('resumen')).toBeInTheDocument()
  })

  it('sin el rol pedido muestra que la seccion no es para su cuenta', () => {
    renderAt('/admin', authValue({ status: 'authenticated', user: valeria }))
    expect(screen.getByText('Esta sección no es para tu cuenta')).toBeInTheDocument()
    expect(screen.queryByText('admin')).not.toBeInTheDocument()
  })
})

describe('GuestOnly', () => {
  it('sin sesion muestra el login', () => {
    renderAt('/login', authValue({ status: 'anonymous' }))
    expect(screen.getByText('login')).toBeInTheDocument()
  })

  it('al abrirse la sesion devuelve a la pagina de la que venia', async () => {
    renderAt('/login', authValue({ status: 'authenticated', user: valeria }), { from: '/movimientos' })
    expect(await screen.findByText('movimientos')).toBeInTheDocument()
  })

  it('sin pagina de origen va al inicio del usuario', async () => {
    renderAt('/login', authValue({ status: 'authenticated', user: valeria }))
    expect(await screen.findByText('resumen')).toBeInTheDocument()
  })

  it('no sigue un origen que apunte fuera de la app', async () => {
    renderAt('/login', authValue({ status: 'authenticated', user: valeria }), { from: '//sitio-malicioso.com' })
    expect(await screen.findByText('resumen')).toBeInTheDocument()
  })
})
