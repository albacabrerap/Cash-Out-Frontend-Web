import { http } from '@/api/client'
import type { PortfolioGameView, Weights } from '@/types/portfolioGame'

async function action(code: string, name: string): Promise<PortfolioGameView> {
  const { data } = await http.post<PortfolioGameView>(`/portfolio-rooms/${code}/${name}`)
  return data
}

export const portfolioGameService = {
  /** Abre una sala con 5 semestres reales al azar; quien la crea es el anfitrion. */
  async create(): Promise<PortfolioGameView> {
    const { data } = await http.post<PortfolioGameView>('/portfolio-rooms')
    return data
  },

  join: (code: string) => action(code, 'join'),
  /** Revela la primera etapa; quien no esta listo queda fuera. */
  start: (code: string) => action(code, 'start'),
  next: (code: string) => action(code, 'next'),

  /** Guarda el reparto y deja al jugador listo. */
  async allocate(code: string, weights: Weights): Promise<PortfolioGameView> {
    const { data } = await http.put<PortfolioGameView>(`/portfolio-rooms/${code}/allocation`, { weights })
    return data
  },

  /** Vuelve a editar el reparto antes de que empiece. */
  async unready(code: string): Promise<PortfolioGameView> {
    const { data } = await http.delete<PortfolioGameView>(`/portfolio-rooms/${code}/allocation`)
    return data
  },

  async cancel(code: string): Promise<void> {
    await http.post(`/portfolio-rooms/${code}/cancel`)
  },
}
