import { useId, useState, type FormEvent } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { confirmRequest, formFromDraft, formProblem, type DraftForm } from '@/lib/assistant'
import { formatSoles } from '@/lib/format'
import { assistantService } from '@/services/assistantService'
import type { Draft } from '@/types/assistant'
import { DraftCard } from '@/components/assistant/DraftCard'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface Card {
  key: number
  draft: Draft
  form: DraftForm
  saving: boolean
  error: string | null
}

const MAX_TEXT = 500

/**
 * "Registra con una frase": se escribe como se habla ("ayer taxi 12 y chifa 35
 * con yape") y sale una tarjeta por movimiento para revisar y guardar.
 */
export function AssistantComposer({ onSaved }: { onSaved: () => void }) {
  const id = useId()
  const [text, setText] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  const [empty, setEmpty] = useState(false)
  const [nextKey, setNextKey] = useState(0)

  const update = (key: number, change: Partial<Card>) =>
    setCards((current) => current.map((card) => (card.key === key ? { ...card, ...change } : card)))
  const remove = (key: number) => setCards((current) => current.filter((card) => card.key !== key))

  const understand = useAsyncAction(async () => {
    const message = text.trim()
    if (!message) return
    try {
      const drafts = await assistantService.drafts(message)
      setEmpty(drafts.length === 0)
      setCards(drafts.map((draft, i) => ({ key: nextKey + i, draft, form: formFromDraft(draft), saving: false, error: null })))
      setNextKey((n) => n + drafts.length)
      if (drafts.length > 0) setText('')
    } catch (err) {
      toast.error(userMessage(toApiError(err)))
    }
  })

  const save = async (card: Card): Promise<boolean> => {
    update(card.key, { saving: true, error: null })
    try {
      const result = await assistantService.confirm(confirmRequest(card.draft, card.form))
      remove(card.key)
      const what = `${result.kind === 'EXPENSE' ? 'Gasto' : 'Ingreso'} guardado: ${formatSoles(Number(card.form.amount.replace(',', '.')))}`
      toast.success(result.learned ? `${what}. La próxima vez lo sugerimos así.` : what)
      return true
    } catch (err) {
      update(card.key, { saving: false, error: userMessage(toApiError(err)) })
      return false
    }
  }

  const saveOne = async (card: Card) => {
    if (await save(card)) onSaved()
  }

  const saveAll = useAsyncAction(async () => {
    let saved = 0
    // Una por una: cada gasto descuenta del saldo y el siguiente tiene que verlo.
    for (const card of cards.filter((candidate) => !formProblem(candidate.form))) {
      if (await save(card)) saved++
    }
    if (saved > 0) onSaved()
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void understand.run()
  }

  const ready = cards.filter((card) => !formProblem(card.form)).length

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-2xl border bg-card p-5">
      <h2 id={`${id}-title`} className="flex items-center gap-2 font-semibold">
        <Sparkles className="size-4 text-accent-ink" aria-hidden="true" />
        Registra con una frase
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Escribe como lo dirías: «ayer taxi 12 y chifa 35 con yape» o «me pagaron 1500 del freelance». Revisas antes de guardar.
      </p>

      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
        <label htmlFor={`${id}-text`} className="sr-only">
          Qué gastaste o recibiste
        </label>
        <Textarea
          id={`${id}-text`}
          value={text}
          maxLength={MAX_TEXT}
          rows={1}
          placeholder="ayer taxi 12 y chifa 35 con yape"
          className="min-h-10 flex-1 resize-none"
          onChange={(event) => {
            setText(event.target.value)
            setEmpty(false)
          }}
          onKeyDown={(event) => {
            // Enter manda; Shift+Enter deja escribir otra linea.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void understand.run()
            }
          }}
        />
        <Button type="submit" disabled={understand.isPending || !text.trim()}>
          {understand.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Entender
        </Button>
      </form>

      {empty && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          No encontramos ningún gasto ni ingreso en el mensaje. Prueba con algo como «menú 12».
        </p>
      )}

      {cards.length > 0 && (
        <>
          <ul className="mt-4 space-y-3" aria-label="Movimientos para revisar">
            {cards.map((card) => (
              <DraftCard
                key={card.key}
                draft={card.draft}
                form={card.form}
                onChange={(form) => update(card.key, { form, error: null })}
                onSave={() => void saveOne(card)}
                onDiscard={() => remove(card.key)}
                saving={card.saving}
                error={card.error}
              />
            ))}
          </ul>
          {cards.length > 1 && (
            <div className="mt-3 flex justify-end">
              <Button variant="outline" onClick={() => void saveAll.run()} disabled={saveAll.isPending || ready === 0}>
                {saveAll.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
                Guardar los {ready} listos
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
