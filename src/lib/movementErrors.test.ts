import { ApiError } from '@/api/errors'
import { incomeDeleteErrorMessage } from './movementErrors'

describe('incomeDeleteErrorMessage', () => {
  it('un 400 al borrar un ingreso es dinero reservado en metas, no un gasto', () => {
    const error = new ApiError({ kind: 'http', status: 400, serverMessage: 'El monto supera tu saldo disponible de 0.00.' })
    expect(incomeDeleteErrorMessage(error)).toMatch(/reservado en tus metas/)
  })

  it('cualquier otro error usa el mensaje general', () => {
    expect(incomeDeleteErrorMessage(new ApiError({ kind: 'network' }))).toBe(
      'No pudimos conectar con el servidor. Revisa tu conexión a internet.',
    )
  })
})
