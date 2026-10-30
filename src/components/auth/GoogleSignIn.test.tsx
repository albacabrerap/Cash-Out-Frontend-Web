import { act, render, screen, waitFor } from '@testing-library/react'
import { ApiError } from '@/api/errors'
import { AuthContext, type AuthContextValue } from '@/contexts/authContext'
import type { GoogleButtonOptions, GoogleIdentityApi } from '@/lib/googleIdentity'
import { loadGoogleIdentity } from '@/lib/googleIdentity'
import { GoogleSignIn } from './GoogleSignIn'

const google = vi.hoisted(() => ({ clientId: 'web.apps.googleusercontent.com' as string | undefined }))
vi.mock('@/lib/googleIdentity', () => ({ loadGoogleIdentity: vi.fn(), googleClientId: () => google.clientId }))
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }))

let callback: (response: { credential: string }) => void
let options: GoogleButtonOptions
const api: GoogleIdentityApi = {
  initialize: (config) => {
    callback = config.callback
  },
  renderButton: (_parent, opts) => {
    options = opts
  },
}

function renderButton(loginWithGoogle: AuthContextValue['loginWithGoogle'], onError = vi.fn()) {
  render(
    <AuthContext value={{ loginWithGoogle } as AuthContextValue}>
      <GoogleSignIn onError={onError} />
    </AuthContext>,
  )
  return onError
}

describe('GoogleSignIn', () => {
  beforeEach(() => {
    google.clientId = 'web.apps.googleusercontent.com'
    vi.mocked(loadGoogleIdentity).mockResolvedValue(api)
  })

  it('pide a Google el boton "Continuar con Google" en espanol', async () => {
    renderButton(vi.fn())
    await waitFor(() => expect(options).toMatchObject({ text: 'continue_with', locale: 'es', theme: 'outline' }))
    expect(screen.getByText('o con tu correo')).toBeInTheDocument()
  })

  it('manda el ID token de Google al login', async () => {
    const login = vi.fn().mockResolvedValue({})
    renderButton(login)
    await waitFor(() => expect(callback).toBeDefined())

    await act(async () => callback({ credential: 'id-token' }))
    expect(login).toHaveBeenCalledWith('id-token')
  })

  it('si el backend rechaza, el error va al aviso de la pagina', async () => {
    const login = vi.fn().mockRejectedValue(new ApiError({ kind: 'http', status: 401, serverMessage: 'Google no confirmó tu correo.' }))
    const onError = renderButton(login)
    await waitFor(() => expect(callback).toBeDefined())

    await act(async () => callback({ credential: 'id-token' }))
    expect(onError).toHaveBeenLastCalledWith(expect.stringContaining('Google no confirmó tu correo.'))
  })

  it('sin client ID configurado no se muestra', () => {
    google.clientId = undefined
    renderButton(vi.fn())
    expect(screen.queryByText('o con tu correo')).not.toBeInTheDocument()
    expect(loadGoogleIdentity).not.toHaveBeenCalledTimes(2)
  })
})
