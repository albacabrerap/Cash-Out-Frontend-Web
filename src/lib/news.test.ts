import { describe, expect, it } from 'vitest'
import type { NewsItem } from '@/types/news'
import { appendNews, formatNewsStamp, formatNewsTime, groupNewsByDay, isNewsScope, sparklinePath } from './news'

// Fechas en hora local, para que el test no dependa de la zona de quien lo corre.
const now = new Date(2026, 9, 18, 15, 0)
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).toISOString()

const item = (id: number, publishedAt: string): NewsItem => ({
  id,
  headline: `Headline ${id}`,
  summary: '',
  source: 'benzinga',
  author: null,
  url: null,
  imageUrl: null,
  publishedAt,
  updatedAt: publishedAt,
  assets: [],
})

describe('formatNewsTime', () => {
  it('cuenta minutos y horas el primer dia', () => {
    expect(formatNewsTime(new Date(now.getTime() - 20_000).toISOString(), now)).toBe('hace un momento')
    expect(formatNewsTime(new Date(now.getTime() - 14 * 60_000).toISOString(), now)).toBe('hace 14 min')
    expect(formatNewsTime(at(18, 10), now)).toBe('hace 5 h')
  })

  it('pasado un dia muestra la fecha', () => {
    expect(formatNewsTime(at(16, 9), now)).toMatch(/^16 oct/)
  })
})

describe('formatNewsStamp', () => {
  it('una nota editada muestra cuando se actualizo; una correccion al rato no cuenta', () => {
    const published = new Date(now.getTime() - 6 * 3_600_000).toISOString()
    const edit = (minutes: number) => new Date(Date.parse(published) + minutes * 60_000).toISOString()

    expect(formatNewsStamp({ publishedAt: published, updatedAt: edit(5 * 60 + 50) }, now)).toBe('actualizada hace 10 min')
    expect(formatNewsStamp({ publishedAt: published, updatedAt: edit(3) }, now)).toBe('hace 5 h')
  })
})

describe('groupNewsByDay', () => {
  it('separa hoy, ayer y los dias anteriores, en el orden en que llegan', () => {
    const groups = groupNewsByDay([item(1, at(18, 14)), item(2, at(18, 1)), item(3, at(17, 23)), item(4, at(15, 9))], now)

    expect(groups.map((group) => group.label)).toEqual(['Hoy', 'Ayer', expect.stringMatching(/^Jueves, 15 de octubre/)])
    expect(groups.map((group) => group.items.map((news) => news.id))).toEqual([[1, 2], [3], [4]])
  })
})

describe('appendNews', () => {
  it('agrega la pagina nueva sin repetir notas', () => {
    expect(appendNews([item(1, at(18, 9)), item(2, at(18, 8))], [item(2, at(18, 8)), item(3, at(18, 7))]).map((news) => news.id)).toEqual([1, 2, 3])
  })
})

describe('sparklinePath', () => {
  it('ocupa todo el ancho y pone el maximo arriba', () => {
    expect(sparklinePath([1, 3, 2], 80, 30)).toBe('M0.0 29.0 L40.0 1.0 L80.0 15.0')
  })

  it('sin dos puntos no dibuja; una serie plana queda en la base', () => {
    expect(sparklinePath([5], 80, 30)).toBe('')
    expect(sparklinePath([5, 5], 80, 30)).toBe('M0.0 29.0 L80.0 29.0')
  })
})

describe('isNewsScope', () => {
  it('acepta solo los alcances del mural', () => {
    expect(isNewsScope('crypto')).toBe(true)
    expect(isNewsScope('stocks')).toBe(false)
    expect(isNewsScope(null)).toBe(false)
  })
})
