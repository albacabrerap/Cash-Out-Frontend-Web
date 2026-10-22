export type Role = 'GUEST' | 'USER' | 'ADMIN'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'

/** UserResponse */
export interface User {
  id: number
  name: string
  email: string
  roles: Role[]
  status: UserStatus
  /** yyyy-MM-dd */
  birthDate: string | null
  createdAt: string
  /** Cuando cambio la foto de perfil; no viene si no tiene. */
  avatarUpdatedAt?: string
}

/** Respuesta de login, registro y refresh. */
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  /** Segundos. */
  expiresIn: number
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  /** yyyy-MM-dd */
  birthDate?: string
}

export interface UpdateUserRequest {
  name?: string
  birthDate?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
