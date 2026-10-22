import { api } from '@/api/client'
import { ApiError } from '@/api/errors'
import { tokenStore } from '@/api/tokenStore'
import { createSseParser, type SseEvent } from '@/lib/sse'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

async function open(path: string, signal: AbortSignal, retried = false): Promise<Response> {
  const token = tokenStore.getAccessToken()
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal,
  })
  if (response.status === 401 && !retried && tokenStore.getRefreshToken()) {
    await api.refreshSession()
    return open(path, signal, true)
  }
  if (!response.ok || !response.body) throw new ApiError({ kind: 'http', status: response.status })
  return response
}

/**
 * Lee un endpoint SSE de la API hasta que se corte o se aborte.
 * Es fetch y no EventSource porque EventSource no puede mandar el token.
 */
export async function streamEvents(path: string, onEvent: (event: SseEvent) => void, signal: AbortSignal) {
  const response = await open(path, signal)
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()
  const parse = createSseParser(onEvent)
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    parse(value)
  }
}
