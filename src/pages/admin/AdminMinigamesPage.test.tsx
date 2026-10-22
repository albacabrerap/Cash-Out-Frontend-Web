import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ApiError } from '@/api/errors'
import type { Minigame } from '@/types/minigames'
import { minigameService } from '@/services/minigameService'
import AdminMinigamesPage from './AdminMinigamesPage'

vi.mock('@/services/minigameService', () => ({
  minigameService: { listAll: vi.fn(), create: vi.fn(), update: vi.fn(), archive: vi.fn() },
}))

const listAll = vi.mocked(minigameService.listAll)
const create = vi.mocked(minigameService.create)
const update = vi.mocked(minigameService.update)

const trivia: Minigame = {
  id: 1,
  title: 'Interés compuesto',
  type: 'TRIVIA',
  topic: 'Interés compuesto',
  tokenCost: 0,
  maxTokenReward: 20,
  status: 'PUBLISHED',
}
const orphan: Minigame = { ...trivia, id: 4, title: 'Criptomonedas', topic: 'Cripto', status: 'DRAFT' }
const archived: Minigame = { ...trivia, id: 5, title: 'Viejo', status: 'ARCHIVED' }

function renderPage() {
  const router = createMemoryRouter([{ path: '/admin/minijuegos', element: <AdminMinigamesPage /> }], {
    initialEntries: ['/admin/minijuegos'],
  })
  render(<RouterProvider router={router} />)
}

async function openActions(title: string) {
  await userEvent.click(await screen.findByRole('button', { name: `Acciones de ${title}` }))
}

describe('AdminMinigamesPage', () => {
  beforeEach(() => {
    listAll.mockReset()
    create.mockReset()
    update.mockReset()
    listAll.mockResolvedValue([archived, orphan, trivia])
  })

  it('lista todo el catalogo, publicados primero, y marca los que la web no sabe jugar', async () => {
    renderPage()

    const rows = within(await screen.findByRole('table')).getAllByRole('row').slice(1)
    expect(rows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual([
      expect.stringContaining('Interés compuesto'),
      expect.stringContaining('Criptomonedas'),
      expect.stringContaining('Viejo'),
    ])
    expect(within(rows[1]).getByText(/sin contenido en la web/)).toBeInTheDocument()
    expect(within(rows[2]).getByText('Archivado')).toBeInTheDocument()
  })

  it('crear: el tipo sale del contenido elegido y los montos se mandan como numeros', async () => {
    create.mockResolvedValue({ ...trivia, id: 9 })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Crear minijuego' }))
    const dialog = await screen.findByRole('dialog', { name: 'Crear minijuego' })
    await userEvent.type(within(dialog).getByLabelText('Título'), 'Préstamos en serio')
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Qué se juega' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Préstamos · Simulación' }))
    await userEvent.clear(within(dialog).getByLabelText('Costo'))
    await userEvent.type(within(dialog).getByLabelText('Costo'), '7,5')
    await userEvent.type(within(dialog).getByLabelText('Premio máximo'), '40')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear juego' }))

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        title: 'Préstamos en serio',
        topic: 'Préstamos',
        type: 'SIMULATION',
        tokenCost: 7.5,
        maxTokenReward: 40,
        status: 'DRAFT',
      }),
    )
    await waitFor(() => expect(listAll).toHaveBeenCalledTimes(2))
  })

  it('un titulo repetido se marca en el campo', async () => {
    create.mockRejectedValue(new ApiError({ kind: 'http', status: 409 }))
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Crear minijuego' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Título'), 'Interés compuesto')
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Qué se juega' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Interés compuesto · Trivia' }))
    await userEvent.type(within(dialog).getByLabelText('Premio máximo'), '20')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear juego' }))

    expect(await within(dialog).findByText('Ya hay un juego con ese título.')).toBeInTheDocument()
  })

  it('pasar a borrador manda el juego completo con el estado nuevo', async () => {
    update.mockResolvedValue({ ...trivia, status: 'DRAFT' })
    renderPage()

    await openActions('Interés compuesto')
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Pasar a borrador' }))

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(1, {
        title: 'Interés compuesto',
        type: 'TRIVIA',
        topic: 'Interés compuesto',
        tokenCost: 0,
        maxTokenReward: 20,
        status: 'DRAFT',
      }),
    )
  })

  it('un borrador sin contenido en la web no se puede publicar', async () => {
    renderPage()

    await openActions('Criptomonedas')
    expect(await screen.findByRole('menuitem', { name: 'Publicar (falta contenido)' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('archivar pide confirmacion', async () => {
    vi.mocked(minigameService.archive).mockResolvedValue()
    renderPage()

    await openActions('Interés compuesto')
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Archivar' }))
    const dialog = await screen.findByRole('alertdialog', { name: '¿Archivar este juego?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Archivar' }))

    await waitFor(() => expect(minigameService.archive).toHaveBeenCalledWith(1))
  })
})
