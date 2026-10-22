import type { LoanOffer } from '@/lib/loans'

export interface ChoiceQuestion {
  prompt: string
  options: string[]
  /** Posicion de la correcta en `options`. */
  answer: number
  explanation: string
}

export interface LoanRound {
  /** Para que es el dinero, completa la frase "Necesitas S/ X para …". */
  need: string
  principal: number
  offers: LoanOffer[]
  explanation: string
}

interface PackBase {
  description: string
  rules: string
}

export interface ChoicePack extends PackBase {
  type: 'TRIVIA' | 'QUIZ'
  questions: ChoiceQuestion[]
  /** En un quiz de dos opciones fijas, mezclarlas solo confunde. */
  shuffleOptions: boolean
}

export interface LoanPack extends PackBase {
  type: 'SIMULATION'
  rounds: LoanRound[]
}

/** El contenido de un juego. El catalogo del backend dice si se publica, cuanto cuesta y cuanto paga. */
export type GamePack = ChoicePack | LoanPack
