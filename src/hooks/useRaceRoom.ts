import { useLiveRoom } from '@/hooks/useLiveRoom'
import { mergeRaceView } from '@/lib/race'
import type { RaceView } from '@/types/race'

/** La carrera en vivo; los ticks traen solo el precio del paso y se suman a la serie. */
export function useRaceRoom(code: string) {
  return useLiveRoom<RaceView>(`/race-rooms/${code}/events`, mergeRaceView)
}
