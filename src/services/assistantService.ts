import { http } from '@/api/client'
import type { ConfirmDraftRequest, ConfirmDraftResponse, Draft } from '@/types/assistant'

export const assistantService = {
  /** Tarjetas para confirmar a partir de una frase; el backend no guarda nada todavia. */
  async drafts(text: string, signal?: AbortSignal): Promise<Draft[]> {
    const { data } = await http.post<{ drafts: Draft[] }>('/assistant/drafts', { text }, { signal })
    return data.drafts
  },

  /** Guarda una tarjeta revisada: crea el gasto o el ingreso y, si se pidio, aprende la correccion. */
  async confirm(request: ConfirmDraftRequest): Promise<ConfirmDraftResponse> {
    const { data } = await http.post<ConfirmDraftResponse>('/assistant/confirm', request)
    return data
  },
}
