/** SavingsResponse */
export interface Savings {
  id: number
  currentBalance: number
  /** Reservado para metas en curso; ya esta incluido en currentBalance. */
  committedAmount: number
  availableBalance: number
  updatedAt: string
}

export type TokenReason =
  | 'GOAL_COMPLETED'
  | 'MINIGAME'
  | 'INVESTMENT'
  | 'ADJUSTMENT'
  | 'RACE_ENTRY'
  | 'RACE_PRIZE'
  | 'RACE_REFUND'

/** TokenTransactionResponse: un movimiento de fichas. `amount` es negativo cuando salen. */
export interface TokenTransaction {
  id: number
  amount: number
  reason: TokenReason
  referenceId: number | null
  balanceAfter: number
  /** LocalDateTime en UTC. */
  createdAt: string
}

/** TokenWalletResponse */
export interface TokenWallet {
  id: number
  tokenBalance: number
  updatedAt: string
}
