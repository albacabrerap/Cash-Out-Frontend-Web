import { describe, expect, it } from 'vitest'
import type { RaceView } from '@/types/race'
import { formatRaceDate, mergeRaceView } from './race'

const base: RaceView = {
  code: 'K7M2QX',
  phase: 'RUNNING',
  host: false,
  joined: true,
  entryFee: 20,
  pot: 60,
  maxPlayers: 30,
  step: 2,
  totalSteps: 360,
  countdown: 0,
  price: 99,
  prices: [100, 101, 99],
  ranking: [],
  me: null,
  feed: [],
  scenario: null,
}

describe('mergeRaceView', () => {
  it('un tick agrega su precio a la serie que ya se tenia', () => {
    const merged = mergeRaceView(base, { ...base, step: 3, price: 97, prices: null })
    expect(merged.prices).toEqual([100, 101, 99, 97])
  })

  it('un estado completo reemplaza la serie', () => {
    const merged = mergeRaceView(base, { ...base, step: 0, price: 100, prices: [100] })
    expect(merged.prices).toEqual([100])
  })

  it('un tick repetido no duplica el precio', () => {
    const merged = mergeRaceView(base, { ...base, prices: null })
    expect(merged.prices).toEqual([100, 101, 99])
  })

  it('un tick de otra sala no hereda la serie', () => {
    const merged = mergeRaceView(base, { ...base, code: 'OTRA22', step: 0, price: 100, prices: null })
    expect(merged.prices).toEqual([100])
  })
})

describe('formatRaceDate', () => {
  it('escribe la fecha del escenario en espanol', () => {
    expect(formatRaceDate('2020-03-12')).toBe('12 de marzo de 2020')
  })
})
