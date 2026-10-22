import { http } from '@/api/client'
import type { Minigame, MinigameInput, MinigameSession, MinigameSessionInput } from '@/types/minigames'

export const minigameService = {
  /** Solo los publicados: borradores y archivados son de administracion. */
  async list(signal?: AbortSignal): Promise<Minigame[]> {
    const { data } = await http.get<Minigame[]>('/minigames', { signal })
    return data
  },

  async get(id: number, signal?: AbortSignal): Promise<Minigame> {
    const { data } = await http.get<Minigame>(`/minigames/${id}`, { signal })
    return data
  },

  /** Del mas reciente al mas antiguo. El backend no las pagina. */
  async sessions(signal?: AbortSignal): Promise<MinigameSession[]> {
    const { data } = await http.get<MinigameSession[]>('/minigame-sessions', { signal })
    return data
  },

  /** Cobra el costo y acredita la recompensa en una sola operacion. */
  async play(input: MinigameSessionInput): Promise<MinigameSession> {
    const { data } = await http.post<MinigameSession>('/minigame-sessions', input)
    return data
  },

  // Administracion del catalogo (solo ADMIN).

  /** Incluye borradores y archivados. */
  async listAll(signal?: AbortSignal): Promise<Minigame[]> {
    const { data } = await http.get<Minigame[]>('/minigames', { params: { includeUnpublished: true }, signal })
    return data
  },

  async create(input: MinigameInput): Promise<Minigame> {
    const { data } = await http.post<Minigame>('/minigames', input)
    return data
  },

  async update(id: number, input: MinigameInput): Promise<Minigame> {
    const { data } = await http.put<Minigame>(`/minigames/${id}`, input)
    return data
  },

  /** Archiva en vez de borrar: las partidas jugadas apuntan al juego. */
  async archive(id: number): Promise<void> {
    await http.delete(`/minigames/${id}`)
  },
}
