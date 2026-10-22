import { http } from '@/api/client'
import type { ChangePasswordRequest, Role, UpdateUserRequest, User, UserStatus } from '@/types/auth'

export const userService = {
  async me(signal?: AbortSignal): Promise<User> {
    const { data } = await http.get<User>('/users/me', { signal })
    return data
  },

  async updateMe(changes: UpdateUserRequest): Promise<User> {
    const { data } = await http.patch<User>('/users/me', changes)
    return data
  },

  async changePassword(request: ChangePasswordRequest): Promise<void> {
    await http.put('/users/me/password', request)
  },

  async deleteMe(): Promise<void> {
    await http.delete('/users/me')
  },

  async uploadAvatar(image: Blob): Promise<User> {
    const body = new FormData()
    body.append('file', image, 'avatar.jpg')
    // Con el Content-Type JSON por defecto, axios convertiria el FormData en JSON.
    const { data } = await http.put<User>('/users/me/avatar', body, { headers: { 'Content-Type': 'multipart/form-data' } })
    return data
  },

  async removeAvatar(): Promise<User> {
    const { data } = await http.delete<User>('/users/me/avatar')
    return data
  },

  /** La foto pide sesion, asi que no puede ir directo en un img: se descarga con el token. */
  async getAvatar(signal?: AbortSignal): Promise<Blob> {
    const { data } = await http.get<Blob>('/users/me/avatar', { responseType: 'blob', signal })
    return data
  },

  /** Todas las cuentas (solo ADMIN). */
  async list(signal?: AbortSignal): Promise<User[]> {
    const { data } = await http.get<User[]>('/users', { signal })
    return data
  },

  /** Reemplaza los roles de otra cuenta (solo ADMIN). Se aplica cuando esa sesion se renueva. */
  async setRoles(id: number, roles: Role[]): Promise<User> {
    const { data } = await http.put<User>(`/users/${id}/roles`, { roles })
    return data
  },

  /** BLOCKED corta el acceso en la siguiente peticion; ACTIVE desbloquea o reactiva una baja. */
  async setStatus(id: number, status: Extract<UserStatus, 'ACTIVE' | 'BLOCKED'>): Promise<User> {
    const { data } = await http.put<User>(`/users/${id}/status`, { status })
    return data
  },
}
