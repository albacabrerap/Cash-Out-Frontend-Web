import { firstName, formatSoles, formatTokens, initials, parseServerDateTime } from './format'

describe('parseServerDateTime', () => {
  it('una fecha sin zona del backend se lee como UTC', () => {
    expect(parseServerDateTime('2026-10-03T18:47:00').toISOString()).toBe('2026-10-03T18:47:00.000Z')
  })

  it('conserva las fracciones de segundo que manda LocalDateTime', () => {
    expect(parseServerDateTime('2026-10-03T18:47:00.123456').getTime()).toBe(Date.UTC(2026, 9, 3, 18, 47, 0, 123))
  })

  it('si la fecha ya trae zona la respeta', () => {
    expect(parseServerDateTime('2026-10-03T18:47:00Z').toISOString()).toBe('2026-10-03T18:47:00.000Z')
    expect(parseServerDateTime('2026-10-03T13:47:00-05:00').toISOString()).toBe('2026-10-03T18:47:00.000Z')
  })
})

describe('formato de cifras', () => {
  it('soles con dos decimales y separador de miles', () => {
    expect(formatSoles(1234.5)).toMatch(/^S\/\s?1,234\.50$/)
    expect(formatSoles(null)).toMatch(/0\.00$/)
  })

  it('fichas con su unidad', () => {
    expect(formatTokens(226.1)).toBe('226.10 fichas')
  })
})

describe('nombres', () => {
  it('primer nombre e iniciales', () => {
    expect(firstName('  Valeria Quispe Rojas ')).toBe('Valeria')
    expect(initials('Valeria Quispe Rojas')).toBe('VR')
    expect(initials('Valeria')).toBe('V')
    expect(initials('   ')).toBe('?')
  })
})
