import { describe, expect, it } from 'vitest'
import { avatarFileError } from './avatar'

describe('avatarFileError', () => {
  it('acepta JPG, PNG y GIF de hasta 2 MB', () => {
    expect(avatarFileError({ type: 'image/png', size: 2 * 1024 * 1024 })).toBeNull()
    expect(avatarFileError({ type: 'image/gif', size: 10 })).toBeNull()
  })

  it('rechaza otros formatos y lo que pasa de 2 MB', () => {
    expect(avatarFileError({ type: 'image/svg+xml', size: 10 })).toBe('La foto tiene que ser JPG, PNG o GIF.')
    expect(avatarFileError({ type: 'image/jpeg', size: 2 * 1024 * 1024 + 1 })).toBe('La foto pesa más de 2 MB.')
  })
})
