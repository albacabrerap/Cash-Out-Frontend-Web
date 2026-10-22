import { describe, expect, it } from 'vitest'
import { createSseParser, type SseEvent } from './sse'

describe('createSseParser', () => {
  it('arma los eventos aunque lleguen partidos entre lecturas', () => {
    const events: SseEvent[] = []
    const parse = createSseParser((event) => events.push(event))

    parse('event:history\ndata:[{"time":1,"price":2}]\n\nevent:ti')
    parse('ck\ndata:{"time":2,"price":3}\n')
    expect(events).toHaveLength(1)

    parse('\n')
    expect(events).toEqual([
      { event: 'history', data: '[{"time":1,"price":2}]' },
      { event: 'tick', data: '{"time":2,"price":3}' },
    ])
  })

  it('acepta saltos de linea de Windows y un espacio despues de los dos puntos', () => {
    const events: SseEvent[] = []
    createSseParser((event) => events.push(event))('event: tick\r\ndata: {"price":1}\r\n\r\n')

    expect(events).toEqual([{ event: 'tick', data: '{"price":1}' }])
  })
})
