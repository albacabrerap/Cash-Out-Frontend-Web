import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ApiError } from '@/api/errors'
import { AuthContext, type AuthContextValue } from '@/contexts/authContext'
import { userService } from '@/services/userService'
import type { User } from '@/types/auth'
import ProfilePage from './ProfilePage'

vi.mock('@/services/userService', () => ({
  userService: {
    updateMe: vi.fn(),
    changePassword: vi.fn(),
    deleteMe: vi.fn(),
    uploadAvatar: vi.fn(),
    removeAvatar: vi.fn(),
    getAvatar: vi.fn(async () => new Blob(['foto'], { type: 'image/jpeg' })),
  },
}))
// jsdom no decodifica imagenes: el recorte se reemplaza por una imagen ya lista.
vi.mock('@/lib/avatar', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/avatar')>()),
  resizeAvatar: vi.fn(async () => new Blob(['recortada'], { type: 'image/jpeg' })),
}))

const valeria: User = {
  id: 5,
  name: 'Valeria Quispe',
  email: 'valeria@checkout.test',
  roles: ['USER'],
  status: 'ACTIVE',
  birthDate: '2004-05-12',
  createdAt: '2026-10-03T18:47:00',
  googleOnly: false,
  googleLinked: false,
  emailVerified: true,
}

function renderPage(user: User = valeria) {
  const auth: AuthContextValue = {
    status: 'authenticated',
    user,
    endReason: null,
    login: vi.fn(async () => user),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    verifyEmail: vi.fn(),
    logout: vi.fn(async () => {}),
    updateUser: vi.fn(),
    retryRestore: vi.fn(),
    hasRole: (role) => user.roles.includes(role),
  }
  const router = createMemoryRouter([{ path: '/perfil', element: <ProfilePage /> }], { initialEntries: ['/perfil'] })
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  )
  return auth
}

const NEW_PASSWORD = 'Otra-Clave-2026'

async function fillPassword(current: string) {
  await userEvent.type(screen.getByLabelText('Contraseña actual'), current)
  await userEvent.type(screen.getByLabelText('Contraseña nueva'), NEW_PASSWORD)
  await userEvent.type(screen.getByLabelText('Repite la contraseña nueva'), NEW_PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.mocked(userService.updateMe).mockReset()
    vi.mocked(userService.changePassword).mockReset()
    vi.mocked(userService.deleteMe).mockReset()
    vi.mocked(userService.uploadAvatar).mockReset()
    vi.mocked(userService.removeAvatar).mockReset()
    URL.createObjectURL = vi.fn(() => 'blob:vista-previa')
    URL.revokeObjectURL = vi.fn()
  })

  it('guarda el nombre y actualiza la sesion; el correo no se edita', async () => {
    vi.mocked(userService.updateMe).mockResolvedValue({ ...valeria, name: 'Valeria Q.' })
    const auth = renderPage()

    expect(screen.getByLabelText('Correo')).toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: 'Guardar perfil' })).toBeDisabled()
    expect(screen.getByText('Todo está guardado')).toBeInTheDocument()

    const name = screen.getByLabelText('Nombre')
    await userEvent.clear(name)
    await userEvent.type(name, 'Valeria Q.')
    expect(screen.getByText('Cambiado')).toBeInTheDocument()
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))

    await waitFor(() => expect(userService.updateMe).toHaveBeenCalledWith({ name: 'Valeria Q.', birthDate: '2004-05-12' }))
    expect(auth.updateUser).toHaveBeenCalledWith({ ...valeria, name: 'Valeria Q.' })
    expect(userService.uploadAvatar).not.toHaveBeenCalled()
  })

  it('la foto nueva se ve antes de guardar y se sube recien al guardar', async () => {
    const withPhoto = { ...valeria, avatarUpdatedAt: '2026-10-19T08:50:00' }
    vi.mocked(userService.uploadAvatar).mockResolvedValue(withPhoto)
    const auth = renderPage()

    await userEvent.upload(screen.getByLabelText('Elegir foto de perfil'), new File(['foto'], 'yo.png', { type: 'image/png' }))
    expect(await screen.findByText('Cambiado')).toBeInTheDocument()
    expect(userService.uploadAvatar).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))

    await waitFor(() => expect(userService.uploadAvatar).toHaveBeenCalledWith(expect.any(Blob)))
    expect(userService.updateMe).not.toHaveBeenCalled()
    expect(auth.updateUser).toHaveBeenCalledWith(withPhoto)
  })

  it('una foto de mas de 2 MB se rechaza sin subirla', async () => {
    renderPage()

    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText('Elegir foto de perfil'), big)

    expect(await screen.findByText('La foto pesa más de 2 MB.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar perfil' })).toBeDisabled()
  })

  it('quitar la foto guardada la borra al guardar; descartar deja todo como estaba', async () => {
    vi.mocked(userService.removeAvatar).mockResolvedValue(valeria)
    renderPage({ ...valeria, avatarUpdatedAt: '2026-10-19T08:50:00' })

    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.getByText('Todo está guardado')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))

    await waitFor(() => expect(userService.removeAvatar).toHaveBeenCalledTimes(1))
  })

  it('una fecha de nacimiento guardada no se puede dejar vacia', async () => {
    renderPage()

    await userEvent.clear(screen.getByLabelText(/Fecha de nacimiento/))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))

    expect(await screen.findByText('Puedes cambiar la fecha, pero no dejarla vacía.')).toBeInTheDocument()
    expect(userService.updateMe).not.toHaveBeenCalled()
  })

  it('con la contrasena actual equivocada lo marca en el campo y no cierra la sesion', async () => {
    vi.mocked(userService.changePassword).mockRejectedValue(new ApiError({ kind: 'http', status: 401 }))
    const auth = renderPage()

    await fillPassword('NoEsEsta1!')

    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña actual')).toHaveFocus()
    expect(auth.login).not.toHaveBeenCalled()
    expect(auth.logout).not.toHaveBeenCalled()
  })

  it('tras cambiar la contrasena vuelve a entrar con la nueva, porque el backend cierra todas las sesiones', async () => {
    vi.mocked(userService.changePassword).mockResolvedValue()
    const auth = renderPage()

    await fillPassword('Actual-2026!')

    await waitFor(() =>
      expect(userService.changePassword).toHaveBeenCalledWith({ currentPassword: 'Actual-2026!', newPassword: NEW_PASSWORD }),
    )
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith({ email: valeria.email, password: NEW_PASSWORD }))
    expect(screen.getByLabelText('Contraseña nueva')).toHaveValue('')
    expect(auth.logout).not.toHaveBeenCalled()
  })

  it('la contrasena nueva tiene que coincidir y ser distinta de la actual', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Contraseña actual'), NEW_PASSWORD)
    await userEvent.type(screen.getByLabelText('Contraseña nueva'), NEW_PASSWORD)
    await userEvent.type(screen.getByLabelText('Repite la contraseña nueva'), 'Otra-Cosa-2026')
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(screen.getByText('La contraseña nueva tiene que ser distinta de la actual.')).toBeInTheDocument()
    expect(userService.changePassword).not.toHaveBeenCalled()
  })

  it('dar de baja pide confirmacion y despues cierra la sesion', async () => {
    vi.mocked(userService.deleteMe).mockResolvedValue()
    const auth = renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Dar de baja mi cuenta' }))
    const dialog = await screen.findByRole('alertdialog', { name: '¿Dar de baja tu cuenta?' })
    expect(userService.deleteMe).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dar de baja' }))

    await waitFor(() => expect(userService.deleteMe).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(auth.logout).toHaveBeenCalledTimes(1))
  })

  it('una cuenta creada con Google no ofrece cambiar la contraseña', () => {
    renderPage({ ...valeria, googleOnly: true, googleLinked: true })

    const security = screen.getByRole('region', { name: 'Seguridad' })
    expect(security).toHaveTextContent('Entras con la cuenta de Google valeria@checkout.test')
    expect(screen.queryByLabelText(/Contraseña actual/)).not.toBeInTheDocument()
  })
})
