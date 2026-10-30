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
  /** Creada con Google: solo entra con Google y no hay contrasena que cambiar. */
  googleOnly: boolean
  googleLinked: boolean
  /** Confirmo su correo con el enlace, o entro con Google. */
  emailVerified: boolean
}

/** Respuesta de login, registro y refresh. El token de refresco no llega: va en una cookie HttpOnly. */
export interface AuthResponse {
  accessToken: string
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

/** Registro con verificacion obligatoria: hay cuenta, pero no sesion hasta abrir el enlace del correo. */
export interface PendingVerification {
  user: User
  emailVerificationRequired: true
}

export interface RegisterResult {
  user: User
  /** true: se mando el enlace y todavia no hay sesion. */
  verificationRequired: boolean
}
