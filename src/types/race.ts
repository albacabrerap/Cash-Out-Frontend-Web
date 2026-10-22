export type RacePhase = 'LOBBY' | 'COUNTDOWN' | 'RUNNING' | 'FINISHED' | 'CANCELLED'

export interface RaceRacer {
  /** El del jugador en la sala: dos jugadores pueden llamarse igual. */
  id: number
  rank: number
  name: string
  /** Puntos de la sala: todos empiezan con 10 000. */
  value: number
  returnPercent: number
  investedPercent: number
  cash: number
  prize: number
  me: boolean
}

export interface RaceMove {
  step: number
  text: string
  buy: boolean
}

/** Solo llega al terminar: hasta entonces la moneda y el dia son un misterio. */
export interface RaceReveal {
  productId: string
  coinName: string
  /** "2020-03-12" */
  date: string
  title: string
  description: string
  realOpen: number
  realClose: number
}

/** RaceView */
export interface RaceView {
  code: string
  phase: RacePhase
  host: boolean
  joined: boolean
  entryFee: number
  pot: number
  maxPlayers: number
  step: number
  totalSteps: number
  countdown: number
  /** Normalizado a 100 al empezar. */
  price: number
  /** Solo en el evento "state" y en las respuestas que lo incluyen; en los ticks llega null. */
  prices: number[] | null
  ranking: RaceRacer[]
  me: RaceRacer | null
  feed: RaceMove[]
  scenario: RaceReveal | null
}

export type RaceSide = 'BUY' | 'SELL'
