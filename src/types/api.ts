/** PageResponse del backend. */
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface FieldErrorBody {
  field: string
  message: string
}

/** ErrorResponseDTO del backend; fieldErrors solo viene en errores de validacion. */
export interface ErrorResponseBody {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  fieldErrors?: FieldErrorBody[]
}

export interface PageParams {
  page?: number
  size?: number
  /** "campo,asc" o "campo,desc" */
  sort?: string
}
