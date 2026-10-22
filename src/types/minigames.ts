export type MinigameType = 'TRIVIA' | 'QUIZ' | 'SIMULATION'
export type MinigameStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

/** MinigameResponse */
export interface Minigame {
  id: number
  title: string
  type: MinigameType
  topic: string | null
  tokenCost: number
  maxTokenReward: number
  status: MinigameStatus
}

/** MinigameSessionResponse */
export interface MinigameSession {
  id: number
  minigameTitle: string
  score: number
  tokensSpent: number
  tokensEarned: number
  playedAt: string
}

/** MinigameSessionRequest */
export interface MinigameSessionInput {
  minigameId: number
  score: number
}

/** MinigameRequest (solo ADMIN). */
export interface MinigameInput {
  title: string
  type: MinigameType
  topic: string | null
  tokenCost: number
  maxTokenReward: number
  status: MinigameStatus
}
