import type { ExpenseCategory } from '@/types/movements'

export type DraftKind = 'INCOME' | 'EXPENSE'

export type DraftWarning =
  | 'MISSING_AMOUNT'
  | 'FOREIGN_CURRENCY'
  | 'NOT_SPLIT'
  | 'LONG_DESCRIPTION'
  | 'HIGH_AMOUNT'
  | 'DUPLICATE_RECEIPT'
  | 'CREDIT_NOTE'

/** Draft: una tarjeta para confirmar. Nada esta guardado todavia. */
export interface Draft {
  kind: DraftKind
  description: string | null
  /** null si el mensaje no lo decia. */
  amount: number | null
  currency: 'PEN' | 'USD'
  /** yyyy-MM-dd */
  date: string
  paymentMethod: 'YAPE' | 'PLIN' | 'CARD' | 'CASH' | 'TRANSFER' | null
  /** null en un ingreso. */
  category: ExpenseCategory | null
  /** De 0 a 1. */
  confidence: number
  alternatives: { category: ExpenseCategory; probability: number }[]
  source: 'USER_RULE' | 'JEV' | 'KEYWORDS'
  warnings: DraftWarning[]
  /** RUC del comercio, si vino de una boleta. */
  ruc: string | null
  /** Huella de la boleta, para no registrarla dos veces. */
  receiptRef: string | null
  alreadyRegisteredAt: string | null
}

export interface ConfirmDraftRequest {
  kind: DraftKind
  amount: number
  date: string
  description?: string
  category?: ExpenseCategory
  ruc?: string
  receiptRef?: string
  /** El usuario cambio el tipo o la categoria sugeridos: la proxima vez saldra sola. */
  learn: boolean
}

export interface ConfirmDraftResponse {
  kind: DraftKind
  id: number
  learned: boolean
}
