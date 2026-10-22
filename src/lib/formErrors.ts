import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import type { ApiError } from '@/api/errors'

/**
 * Muestra en cada campo los errores del backend. Devuelve false si ninguno era
 * de este formulario. `messages` reemplaza el texto del servidor por campo.
 */
export function applyServerFieldErrors<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  messages: Partial<Record<Path<T>, string>> = {},
): boolean {
  let applied = false
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if (!(fields as readonly string[]).includes(field)) continue
    setError(field as Path<T>, { type: 'server', message: messages[field as Path<T>] ?? message }, { shouldFocus: !applied })
    applied = true
  }
  return applied
}
