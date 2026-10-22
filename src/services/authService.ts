import { api, http } from '@/api/client'
import { tokenStore } from '@/api/tokenStore'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types/auth'

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

  async register(request: RegisterRequest, signal?: AbortSignal): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/register', request, {
      skipAuthRefresh: true,
      signal,
    })
    tokenStore.setSession(data)
    return data
  },

  restore(): Promise<AuthResponse> {
    return api.refreshSession()
  },

  /** La sesion local se cierra siempre, aunque el servidor no responda. */
  async logout(): Promise<void> {
    const refreshToken = tokenStore.getRefreshToken()
    try {
      if (refreshToken) {
        await http.post('/auth/logout', { refreshToken }, { skipAuthRefresh: true })
      }
    } catch {
      // Ignorado a proposito.
    } finally {
      tokenStore.clear('logout')
    }
  },
}
