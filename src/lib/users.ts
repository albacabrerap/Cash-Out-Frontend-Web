import type { Role, UserStatus } from '@/types/auth'

export const ROLE_LABEL: Record<Role, string> = {
  USER: 'Estudiante',
  ADMIN: 'Administrador',
  GUEST: 'Invitado',
}

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Dada de baja',
  BLOCKED: 'Bloqueada',
}

/**
 * Un rol por cuenta: con USER y ADMIN juntos la navegacion mezclaria las dos interfaces.
 * GUEST ve lo mismo que un estudiante, pero el backend le rechaza cualquier escritura.
 */
export const ROLE_SETS: { id: string; roles: Role[]; label: string; description: string }[] = [
  { id: 'user', roles: ['USER'], label: 'Estudiante', description: 'Usa la app con sus propias finanzas.' },
  { id: 'admin', roles: ['ADMIN'], label: 'Administrador', description: 'Solo la administración: catálogos y cuentas.' },
  { id: 'guest', roles: ['GUEST'], label: 'Invitado', description: 'Solo mira: no puede crear ni cambiar nada.' },
]

export function roleSetOf(roles: Role[]): string | undefined {
  const key = [...roles].sort().join()
  return ROLE_SETS.find((set) => [...set.roles].sort().join() === key)?.id
}
