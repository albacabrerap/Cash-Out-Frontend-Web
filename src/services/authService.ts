import { api, http } from '@/api/client'
import { tokenStore } from '@/api/tokenStore'
import type { AuthResponse, LoginRequest, PendingVerification, RegisterRequest } from '@/types/auth'

// skipAuthRefresh: aqui un 401 son credenciales invalidas, no una sesion por renovar.
export const authService = {
  async login(request: LoginRequest, signal?: AbortSignal): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/login', request, {
      skipAuthRefresh: true,
      signal,
    })
    tokenStore.setSession(data)
    return data
  },

  /** Si hay que confirmar el correo, no abre sesion: entra al abrir el enlace. */
  async register(request: RegisterRequest, signal?: AbortSignal): Promise<AuthResponse | PendingVerification> {
    const { data } = await http.post<AuthResponse | PendingVerification>('/auth/register', request, {
      skipAuthRefresh: true,
      signal,
    })
    if (!('emailVerificationRequired' in data)) tokenStore.setSession(data)
    return data
  },

  /** "Continuar con Google": el backend verifica el ID token y entra o crea la cuenta. */
  async google(credential: string, signal?: AbortSignal): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/google', { credential }, { skipAuthRefresh: true, signal })
    tokenStore.setSession(data)
    return data
  },

  /** El enlace del correo: confirma la cuenta y abre la sesion. */
  async verifyEmail(token: string, signal?: AbortSignal): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/verify-email', { token }, { skipAuthRefresh: true, signal })
    tokenStore.setSession(data)
    return data
  },

  /** Responde igual exista o no la cuenta: el backend no revela que correos estan registrados. */
  async resendVerification(email: string): Promise<void> {
    await http.post('/auth/resend-verification', { email }, { skipAuthRefresh: true })
  },

  restore(): Promise<AuthResponse> {
    return api.refreshSession()
  },

  /** La sesion local se cierra siempre, aunque el servidor no responda. El token va en la cookie. */
  async logout(): Promise<void> {
    try {
      await http.post('/auth/logout', undefined, { skipAuthRefresh: true })
    } catch {
      // Ignorado a proposito.
    } finally {
      tokenStore.clear('logout')
    }
  },
}
