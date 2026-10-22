/** ProjectionPreviewRequest: lo que hace falta para calcular un escenario. */
export interface ProjectionParams {
  initialCapital: number
  monthlyContribution: number
  /** TEA entre 0 y 1: 0.075 es 7.5 %. */
  annualRate: number
  /** Meses, de 1 a 600. */
  periods: number
}

/** ProjectionPreviewResponse */
export interface ProjectionOutcome {
  totalContributed: number
  simpleFinalAmount: number
  compoundFinalAmount: number
  /** Compuesto menos simple, ya redondeados: nunca es negativa. */
  difference: number
}

/** ProjectionResponse: un escenario guardado. No se edita; se guarda otro. */
export interface Projection extends ProjectionParams, ProjectionOutcome {
  id: number
  name: string
  savingsGoalId: number | null
  calculatedAt: string
}

/** ProjectionRequest */
export interface ProjectionInput extends ProjectionParams {
  name: string
  savingsGoalId: number | null
}
