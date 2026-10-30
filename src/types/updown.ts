export type UpDownPhase = 'LOBBY' | 'VOTING' | 'REVEAL' | 'FINISHED' | 'CANCELLED'

export type UpDownChoice = 'UP' | 'FLAT' | 'DOWN'

export interface UpDownReveal {
  name: string
  /** "2022-06-15" */
  date: string
  outcome: UpDownChoice
  changePercent: number
  lesson: string
}

/** Los precios vienen normalizados a 100 en el dia de la noticia. */
export interface UpDownQuestion {
  sector: string
  /** "junio de 2022" */
  period: string
  context: string
  past: number[]
  /** Los 21 cierres siguientes, empezando en el dia de la noticia; null hasta revelar. */
  future: number[] | null
  reveal: UpDownReveal | null
}

export interface UpDownOption {
  choice: UpDownChoice
  votes: number
  averageBet: number
}

export interface UpDownPlayer {
  /** El del jugador en la sala: dos jugadores pueden llamarse igual. */
  id: number
  rank: number
  name: string
  points: number
  hits: number
  voted: boolean
  /** Solo se ve el propio hasta revelar. */
  choice: UpDownChoice | null
  bet: number
  /** Lo que gano o perdio en la ronda revelada. */
  delta: number
  me: boolean
}

/** UpDownView */
export interface UpDownView {
  code: string
  phase: UpDownPhase
  host: boolean
  joined: boolean
  maxPlayers: number
  startPoints: number
  minBet: number
  round: number
  totalRounds: number
  secondsLeft: number
  votingSeconds: number
  question: UpDownQuestion | null
  tally: { answered: number; options: UpDownOption[] }
  ranking: UpDownPlayer[]
  me: UpDownPlayer | null
  history: UpDownReveal[]
}
