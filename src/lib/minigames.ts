import { z } from 'zod'
import { betOrInvest } from '@/games/betOrInvest'
import { compoundInterest } from '@/games/compoundInterest'
import { loanSimulator } from '@/games/loanSimulator'
import type { ChoiceQuestion, GamePack, LoanRound } from '@/games/types'
import type { TokenTransaction } from '@/types/finance'
import type { Minigame, MinigameSession, MinigameStatus, MinigameType } from '@/types/minigames'
import { amountOrZeroField } from './amount'

export const MINIGAME_TYPE_LABEL: Record<MinigameType, string> = {
  TRIVIA: 'Trivia',
  QUIZ: 'Quiz',
  SIMULATION: 'Simulación',
}

export const MINIGAME_STATUS_LABEL: Record<MinigameStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
}

/** Las preguntas viven en la web: el `topic` del catalogo dice cual de estos contenidos se juega. */
export const GAME_CONTENTS: { topic: string; pack: GamePack }[] = [
  { topic: 'Interés compuesto', pack: compoundInterest },
  { topic: 'Apuesta o inversión', pack: betOrInvest },
  { topic: 'Préstamos', pack: loanSimulator },
]

const PACKS: Record<string, GamePack> = Object.fromEntries(
  GAME_CONTENTS.map(({ topic, pack }) => [topicKey(topic), pack]),
)

/** "Apuesta o inversión" → "apuesta-o-inversion". */
export function topicKey(topic: string): string {
  return topic
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** null si la web no tiene contenido para ese tema o el tipo no coincide. */
export function packFor(game: Pick<Minigame, 'type' | 'topic'>): GamePack | null {
  const pack = game.topic ? PACKS[topicKey(game.topic)] : undefined
  return pack && pack.type === game.type ? pack : null
}

/** El backend paga en proporcion a un puntaje de 0 a 100. */
export function scoreFor(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100)
}

export type GameRun =
  | { type: 'TRIVIA' | 'QUIZ'; questions: ChoiceQuestion[] }
  | { type: 'SIMULATION'; rounds: LoanRound[] }

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function shuffleOptions(question: ChoiceQuestion, random: () => number): ChoiceQuestion {
  const order = shuffle(question.options.map((_, index) => index), random)
  return { ...question, options: order.map((index) => question.options[index]), answer: order.indexOf(question.answer) }
}

/** Cada partida mezcla el orden, para que repetir no sea memorizar posiciones. */
export function prepareRun(pack: GamePack, random = Math.random): GameRun {
  if (pack.type === 'SIMULATION') {
    return { type: pack.type, rounds: pack.rounds.map((round) => ({ ...round, offers: shuffle(round.offers, random) })) }
  }
  const questions = shuffle(pack.questions, random)
  return {
    type: pack.type,
    questions: pack.shuffleOptions ? questions.map((question) => shuffleOptions(question, random)) : questions,
  }
}

export function runLength(run: GameRun): number {
  return run.type === 'SIMULATION' ? run.rounds.length : run.questions.length
}

/** "¿Apuesta o inversión?" → "AI": las palabras cortas no cuentan. */
export function gameInitials(title: string): string {
  const words = title
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)
  const long = words.filter((word) => word.length > 2)
  const picked = (long.length > 0 ? long : words).slice(0, 2)
  return picked
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

/** Formulario de administracion: el tema se elige entre los contenidos que la web sabe jugar. */
export const minigameFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: 'Ponle un título al juego.' })
    .max(120, { error: 'El título no puede tener más de 120 caracteres.' }),
  topic: z.string().refine((topic) => GAME_CONTENTS.some((content) => content.topic === topic), {
    error: 'Elige qué se juega.',
  }),
  tokenCost: amountOrZeroField,
  maxTokenReward: amountOrZeroField,
  status: z.enum(['DRAFT', 'PUBLISHED']),
})

export type MinigameFormValues = z.input<typeof minigameFormSchema>
export type MinigameFormOutput = z.output<typeof minigameFormSchema>

export function contentFor(topic: string): GamePack {
  const content = GAME_CONTENTS.find((item) => item.topic === topic)
  if (!content) throw new Error(`Sin contenido para el tema ${topic}`)
  return content.pack
}

/** Cuantas veces se jugo cada juego y su mejor puntaje; las partidas solo traen el titulo. */
export function gameStats(sessions: MinigameSession[]): Map<string, { plays: number; best: number }> {
  const stats = new Map<string, { plays: number; best: number }>()
  for (const session of sessions) {
    const current = stats.get(session.minigameTitle) ?? { plays: 0, best: 0 }
    stats.set(session.minigameTitle, { plays: current.plays + 1, best: Math.max(current.best, session.score) })
  }
  return stats
}

export type PlayRecord =
  | { kind: 'game'; key: string; title: string; score: number; spent: number; earned: number; playedAt: string }
  | { kind: 'race'; key: string; title: string; outcome: 'prize' | 'refund' | 'none'; spent: number; earned: number; playedAt: string }

const RACE_REASONS = new Set(['RACE_ENTRY', 'RACE_PRIZE', 'RACE_REFUND'])

/**
 * Las carreras no tienen historial propio: salen del libro de fichas, juntando
 * la cuota, el premio y la devolucion de cada sala por su referencia.
 */
export function raceRecords(transactions: TokenTransaction[]): PlayRecord[] {
  const rooms = new Map<number, TokenTransaction[]>()
  for (const tx of transactions) {
    if (!RACE_REASONS.has(tx.reason) || tx.referenceId === null) continue
    rooms.set(tx.referenceId, [...(rooms.get(tx.referenceId) ?? []), tx])
  }
  return [...rooms].map(([room, txs]) => {
    const spent = -txs.filter((tx) => tx.reason === 'RACE_ENTRY').reduce((sum, tx) => sum + tx.amount, 0)
    const prize = txs.filter((tx) => tx.reason === 'RACE_PRIZE').reduce((sum, tx) => sum + tx.amount, 0)
    const refund = txs.filter((tx) => tx.reason === 'RACE_REFUND').reduce((sum, tx) => sum + tx.amount, 0)
    return {
      kind: 'race',
      key: `race-${room}`,
      title: 'Carrera de trading',
      outcome: prize > 0 ? 'prize' : refund > 0 ? 'refund' : 'none',
      spent,
      earned: prize + refund,
      playedAt: txs.map((tx) => tx.createdAt).sort().at(-1) ?? '',
    }
  })
}

/** Partidas de minijuegos y carreras juntas, de la mas reciente a la mas antigua. */
export function playHistory(sessions: MinigameSession[], transactions: TokenTransaction[]): PlayRecord[] {
  const games: PlayRecord[] = sessions.map((session) => ({
    kind: 'game',
    key: `game-${session.id}`,
    title: session.minigameTitle,
    score: session.score,
    spent: session.tokensSpent,
    earned: session.tokensEarned,
    playedAt: session.playedAt,
  }))
  return [...games, ...raceRecords(transactions)].sort((a, b) => b.playedAt.localeCompare(a.playedAt))
}
