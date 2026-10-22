export type GoalStatus = 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED'

/** SavingsGoalResponse */
export interface SavingsGoal {
  id: number
  name: string
  targetAmount: number
  accumulatedAmount: number
  /** 0-100 con dos decimales, calculado por el backend. */
  progressPercent: number
  /** yyyy-MM-dd */
  deadline: string
  /** EXPIRED se calcula al responder: la meta vence sola al pasar la fecha. */
  status: GoalStatus
  completedAt: string | null
  /** LocalDateTime en UTC. Con deadline dice que parte del plazo ya paso. */
  createdAt: string
}

/** SavingsGoalRequest */
export interface SavingsGoalInput {
  name: string
  targetAmount: number
  deadline: string
}

export type ContributionSource = 'MANUAL' | 'INCOME' | 'ADJUSTMENT'

/** ContributionResponse */
export interface Contribution {
  id: number
  amount: number
  source: ContributionSource
  createdAt: string
}

/** ContributionRequest */
export interface ContributionInput {
  amount: number
  source: ContributionSource
}
