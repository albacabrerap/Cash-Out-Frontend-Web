import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Un dialogo abierto con `?nombre=1`, para poder enlazarlo desde otra pantalla
 * (p. ej. "Registrar ingreso" en el resumen abre /movimientos/ingresos?nuevo=1).
 */
export function useFlagParam(name: string) {
  const [searchParams, setSearchParams] = useSearchParams()
  const open = searchParams.get(name) === '1'

  const setOpen = useCallback(
    (next: boolean) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next) params.set(name, '1')
          else params.delete(name)
          return params
        },
        // Abrir o cerrar el dialogo no debe llevar la pagina de fondo al inicio.
        { replace: true, preventScrollReset: true },
      )
    },
    [name, setSearchParams],
  )

  return [open, setOpen] as const
}

/** El dialogo de alta de un listado: `?nuevo=1`. */
export function useCreateParam() {
  return useFlagParam('nuevo')
}
