import type { User } from '@/types/auth'
import { homePathFor, navItemsFor } from './navigation'

const account = (roles: User['roles']): User => ({
  id: 1,
  name: 'Cuenta',
  email: 'cuenta@checkout.test',
  roles,
  status: 'ACTIVE',
  birthDate: null,
  createdAt: '2026-10-05T12:00:00',
})

describe('navegacion por rol', () => {
  it('un estudiante ve sus secciones y entra al resumen', () => {
    const user = account(['USER'])
    expect(navItemsFor(user).map((item) => item.to)).toEqual([
      '/resumen',
      '/movimientos',
      '/metas',
      '/proyeccion',
      '/portafolio',
      '/minijuegos',
    ])
    expect(homePathFor(user)).toBe('/resumen')
  })

  it('un administrador solo ve la administracion y entra al panel', () => {
    const admin = account(['ADMIN'])
    expect(navItemsFor(admin).map((item) => item.to)).toEqual([
      '/admin',
      '/admin/usuarios',
      '/admin/minijuegos',
      '/admin/activos',
    ])
    expect(homePathFor(admin)).toBe('/admin')
    // Si no, "Panel" quedaria activo tambien dentro de /admin/usuarios.
    expect(navItemsFor(admin)[0].end).toBe(true)
  })
})
