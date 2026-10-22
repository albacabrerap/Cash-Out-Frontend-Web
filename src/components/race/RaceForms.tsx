import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { RACE_FEES } from '@/lib/race'
import { cn } from '@/lib/utils'
import { raceService } from '@/services/raceService'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const CODE = /^[A-Z2-9]{6}$/

/** Elegir la cuota y abrir la sala; quien la crea va a la pantalla que se proyecta. */
export function CreateRaceForm({ className }: { className?: string }) {
  const navigate = useNavigate()
  const [fee, setFee] = useState('20')

  const create = useAsyncAction(async () => {
    try {
      const room = await raceService.create(Number(fee))
      navigate(`/carrera/${room.code}/pantalla`)
    } catch (error) {
      toast.error(userMessage(toApiError(error)))
    }
  })

  return (
    <div className={cn('space-y-2', className)}>
      <p id="cuota-label" className="text-sm font-medium">
        Cuota de entrada <span className="font-normal text-muted-foreground sm:hidden">(en fichas)</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          value={fee}
          onValueChange={(value) => value && setFee(value)}
          aria-labelledby="cuota-label"
          className="bg-background/70 backdrop-blur"
        >
          {RACE_FEES.map((option) => (
            <ToggleGroupItem key={option} value={String(option)} className="px-3">
              {option === 0 ? (
                'Gratis'
              ) : (
                <>
                  {option}
                  <span className="hidden sm:inline"> fichas</span>
                </>
              )}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button onClick={() => create.run()} disabled={create.isPending}>
          {create.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Crear sala
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {fee === '0' ? 'Sin cuota no hay pozo: es para practicar.' : 'Las cuotas forman el pozo que se lleva el podio.'}
      </p>
    </div>
  )
}

/** Entrar a una sala con su codigo de 6 caracteres. */
export function JoinRaceForm({ className }: { className?: string }) {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)

  const join = (event: FormEvent) => {
    event.preventDefault()
    const normalized = code.trim().toUpperCase()
    if (!CODE.test(normalized)) {
      setCodeError('El código tiene 6 letras y números, como K7M2QX.')
      return
    }
    navigate(`/carrera/${normalized}`)
  }

  return (
    <form noValidate onSubmit={join} className={cn('flex flex-col gap-2 sm:flex-row sm:items-start', className)}>
      <Field data-invalid={!!codeError} className="flex-1">
        <FieldLabel htmlFor="race-code" className="sr-only">
          Código de la sala
        </FieldLabel>
        <Input
          id="race-code"
          value={code}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase())
            setCodeError(null)
          }}
          maxLength={6}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="Código de sala"
          className="bg-background/70 font-mono tracking-[0.2em] uppercase backdrop-blur placeholder:tracking-normal"
          aria-invalid={!!codeError}
        />
        <FieldError>{codeError}</FieldError>
      </Field>
      <Button type="submit" variant="outline">
        Unirme
      </Button>
    </form>
  )
}
