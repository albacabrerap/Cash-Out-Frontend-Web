import { useState, type ComponentProps } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { amountToField } from '@/lib/amount'
import { applyServerFieldErrors } from '@/lib/formErrors'
import {
  contentFor,
  GAME_CONTENTS,
  MINIGAME_TYPE_LABEL,
  minigameFormSchema,
  type MinigameFormOutput,
  type MinigameFormValues,
} from '@/lib/minigames'
import { minigameService } from '@/services/minigameService'
import type { Minigame } from '@/types/minigames'
import { FormDialogContent } from '@/components/forms/FormDialog'
import { Dialog } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const FIELDS = ['title', 'topic', 'tokenCost', 'maxTokenReward'] as const

interface MinigameFormDialogProps {
  /** null cerrado; 'new' para crear; un juego para editarlo. */
  target: Minigame | 'new' | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function MinigameFormDialog({ target, onOpenChange, onSaved }: MinigameFormDialogProps) {
  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      {target && <MinigameForm game={target === 'new' ? null : target} onSaved={onSaved} />}
    </Dialog>
  )
}

function defaults(game: Minigame | null): MinigameFormValues {
  if (!game) return { title: '', topic: '', tokenCost: '0.00', maxTokenReward: '', status: 'DRAFT' }
  return {
    title: game.title,
    // Un tema que la web no sabe jugar se vuelve a elegir.
    topic: GAME_CONTENTS.some((content) => content.topic === game.topic) ? (game.topic ?? '') : '',
    tokenCost: amountToField(game.tokenCost),
    maxTokenReward: amountToField(game.maxTokenReward),
    status: game.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
  }
}

function TokensInput(props: ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Input inputMode="decimal" autoComplete="off" className="pr-14 tabular-nums" {...props} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
        fichas
      </span>
    </div>
  )
}

function MinigameForm({ game, onSaved }: { game: Minigame | null; onSaved: () => void }) {
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<MinigameFormValues, unknown, MinigameFormOutput>({
    resolver: zodResolver(minigameFormSchema),
    defaultValues: defaults(game),
  })
  const { errors, isSubmitting } = form.formState
  const topic = useWatch({ control: form.control, name: 'topic' })
  const pack = GAME_CONTENTS.find((content) => content.topic === topic)?.pack

  const onSubmit = async (values: MinigameFormOutput) => {
    setFormError(null)
    const input = { ...values, type: contentFor(values.topic).type }
    try {
      if (game) await minigameService.update(game.id, input)
      else await minigameService.create(input)
      toast.success(game ? 'Juego actualizado' : 'Juego creado')
      onSaved()
    } catch (err) {
      const error = toApiError(err)
      if (error.status === 409) {
        form.setError('title', { type: 'server', message: 'Ya hay un juego con ese título.' }, { shouldFocus: true })
      } else if (!applyServerFieldErrors(error, form.setError, FIELDS)) {
        setFormError(userMessage(error))
      }
    }
  }

  return (
    <FormDialogContent
      title={game ? 'Editar minijuego' : 'Crear minijuego'}
      description="El contenido viene de la web; aquí decides cómo se llama, cuánto cuesta y cuánto paga."
      formId="minigame-form"
      submitLabel={game ? 'Guardar cambios' : 'Crear juego'}
      pendingLabel="Guardando…"
      pending={isSubmitting}
      error={formError}
    >
      <form id="minigame-form" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="minigame-title">Título</FieldLabel>
            <Input id="minigame-title" maxLength={120} aria-invalid={!!errors.title} {...form.register('title')} />
            <FieldError errors={[errors.title]} />
          </Field>
          <Field data-invalid={!!errors.topic}>
            <FieldLabel htmlFor="minigame-topic">Qué se juega</FieldLabel>
            <Controller
              control={form.control}
              name="topic"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="minigame-topic"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-invalid={!!errors.topic}
                    className="w-full"
                  >
                    <SelectValue placeholder="Elige un contenido" />
                  </SelectTrigger>
                  <SelectContent>
                    {GAME_CONTENTS.map((content) => (
                      <SelectItem key={content.topic} value={content.topic}>
                        {content.topic} · {MINIGAME_TYPE_LABEL[content.pack.type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.topic ? (
              <FieldError errors={[errors.topic]} />
            ) : (
              <FieldDescription>{pack ? pack.description : 'Solo se listan los contenidos que la web sabe jugar.'}</FieldDescription>
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.tokenCost}>
              <FieldLabel htmlFor="minigame-cost">Costo</FieldLabel>
              <TokensInput id="minigame-cost" aria-invalid={!!errors.tokenCost} {...form.register('tokenCost')} />
              {errors.tokenCost ? <FieldError errors={[errors.tokenCost]} /> : <FieldDescription>0 si es gratis.</FieldDescription>}
            </Field>
            <Field data-invalid={!!errors.maxTokenReward}>
              <FieldLabel htmlFor="minigame-reward">Premio máximo</FieldLabel>
              <TokensInput id="minigame-reward" aria-invalid={!!errors.maxTokenReward} {...form.register('maxTokenReward')} />
              {errors.maxTokenReward ? (
                <FieldError errors={[errors.maxTokenReward]} />
              ) : (
                <FieldDescription>Lo que gana quien saca 100 puntos.</FieldDescription>
              )}
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="minigame-status">Estado</FieldLabel>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="minigame-status" ref={field.ref} onBlur={field.onBlur} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Borrador: todavía no aparece en la app</SelectItem>
                    <SelectItem value="PUBLISHED">Publicado: los estudiantes lo pueden jugar</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </FieldGroup>
      </form>
    </FormDialogContent>
  )
}
