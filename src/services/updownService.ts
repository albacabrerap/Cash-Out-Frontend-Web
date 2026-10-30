import { http } from '@/api/client'
import type { UpDownChoice, UpDownView } from '@/types/updown'

async function action(code: string, name: string, body?: object): Promise<UpDownView> {
  const { data } = await http.post<UpDownView>(`/updown-rooms/${code}/${name}`, body)
  return data
}

export const updownService = {
  /** Abre una sala con 8 rondas al azar; quien la crea es el anfitrion. */
  async create(): Promise<UpDownView> {
    const { data } = await http.post<UpDownView>('/updown-rooms')
    return data
  },

  join: (code: string) => action(code, 'join'),
  start: (code: string) => action(code, 'start'),
  /** Un voto por ronda, sin cambios. */
  vote: (code: string, choice: UpDownChoice, bet: number) => action(code, 'votes', { choice, bet }),
  /** El anfitrion cierra la votacion antes de tiempo. */
  reveal: (code: string) => action(code, 'reveal'),
  next: (code: string) => action(code, 'next'),

  async cancel(code: string): Promise<void> {
    await http.post(`/updown-rooms/${code}/cancel`)
  },
}
