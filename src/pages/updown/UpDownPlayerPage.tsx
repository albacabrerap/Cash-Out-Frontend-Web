import { useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { Loader2, SearchX } from 'lucide-react'
import { toApiError, userMessage } from '@/api/errors'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useLiveRoom } from '@/hooks/useLiveRoom'
import { betChips, choiceMeta, clampBet, minBet, UPDOWN_CHOICES } from '@/lib/updown'
import { updownService } from '@/services/updownService'
import type { UpDownChoice, UpDownView } from '@/types/updown'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageLoader } from '@/components/feedback/PageLoader'
import { UpDownChart } from '@/components/updown/UpDownChart'
import { LessonCard, UpDownRanking } from '@/components/updown/UpDownBoards'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const points = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })

export default function UpDownPlayerPage() {
  const code = (useParams().code ?? '').toUpperCase()
  const { view, connection, apply } = useLiveRoom<UpDownView>(`/updown-rooms/${code}/events`)

  const join = useAsyncAction(async () => {
    try {
      apply(await updownService.join(code))
    } catch (error) {
      toast.error(userMessage(toApiError(error)))
    }
  })
  const vote = useAsyncAction(async (choice: UpDownChoice, bet: number) => {
    try {
      apply(await updownService.vote(code, choice, bet))
    } catch (error) {
      toast.error(userMessage(toApiError(error)))
    }
  })

  if (!view) {
    if (connection === 'missing') return <Gone title="No encontramos esta sala" />
    return <PageLoader label="Entrando a la sala…" />
  }
  if (view.phase === 'CANCELLED') return <Gone title="El anfitrión cerró la sala" />

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Sala <span className="font-mono font-medium text-foreground">{view.code}</span>
          {view.phase !== 'LOBBY' && view.phase !== 'FINISHED' && ` · Ronda ${view.round} de ${view.totalRounds}`}
        </span>
        {connection === 'reconnecting' ? (
          <span>Reconectando…</span>
        ) : (
          view.phase === 'VOTING' && <span className="font-mono text-foreground tabular-nums">0:{String(view.secondsLeft).padStart(2, '0')}</span>
        )}
      </div>

      {view.phase === 'FINISHED' ? (
        <Final view={view} />
      ) : !view.me ? (
        <Join view={view} onJoin={() => join.run()} joining={join.isPending} />
      ) : view.phase === 'LOBBY' ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h1 className="font-display text-4xl font-normal">
                Ya estás <em className="text-accent-ink">dentro</em>
              </h1>
            </CardTitle>
            <CardDescription>Cuando el anfitrión empiece, vas a ver la noticia y tus botones para votar.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-accent-ink" />
              Esperando al anfitrión…
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Question view={view} />
          {view.phase === 'REVEAL' ? (
            <Result view={view} />
          ) : view.me.voted ? (
            <Card role="status">
              <CardContent className="py-6 text-center">
                <p className={cn('text-3xl', choiceMeta(view.me.choice!).tone)}>{choiceMeta(view.me.choice!).icon}</p>
                <p className="mt-2 font-medium">
                  Apostaste {points.format(view.me.bet)} pts a que {choiceMeta(view.me.choice!).label.toLowerCase()}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Esperando a los demás · {view.tally.answered} de {view.ranking.length}
                </p>
              </CardContent>
            </Card>
          ) : (
            <VoteForm key={view.round} view={view} onVote={(choice, bet) => vote.run(choice, bet)} busy={vote.isPending} />
          )}
        </>
      )}
    </div>
  )
}

function Join({ view, onJoin, joining }: { view: UpDownView; onJoin: () => void; joining: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="font-display text-4xl font-normal">
            ¿Sube o <em className="text-accent-ink">baja</em>?
          </h1>
        </CardTitle>
        <CardDescription>
          {view.phase === 'LOBBY'
            ? `Lee la noticia, mira el gráfico y apuesta qué pasó el mes siguiente. Empiezas con ${points.format(view.startPoints)} puntos.`
            : `El juego ya empezó (ronda ${view.round} de ${view.totalRounds}), pero todavía puedes entrar con ${points.format(view.startPoints)} puntos.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button className="h-12 w-full rounded-xl" onClick={onJoin} disabled={joining}>
          {joining && <Loader2 className="animate-spin" aria-hidden="true" />}
          Entrar a la sala
        </Button>
        <p className="text-xs text-muted-foreground">Es gratis: se juegan puntos de la sala, no fichas.</p>
      </CardContent>
    </Card>
  )
}

function Question({ view }: { view: UpDownView }) {
  const question = view.question!

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div>
          <p className="text-xs text-muted-foreground">
            {question.period} · {question.sector}
          </p>
          <p className="mt-1 font-semibold leading-snug">{question.context}</p>
        </div>
        <UpDownChart
          past={question.past}
          future={question.future}
          outcome={question.reveal?.outcome}
          compact
          className="h-24"
        />
      </CardContent>
    </Card>
  )
}

interface VoteFormProps {
  view: UpDownView
  onVote: (choice: UpDownChoice, bet: number) => void
  busy: boolean
}

function VoteForm({ view, onVote, busy }: VoteFormProps) {
  const me = view.me!
  const sliderId = useId()
  const [choice, setChoice] = useState<UpDownChoice | null>(null)
  const [bet, setBet] = useState(() => clampBet(100, me.points, view.minBet))
  const lowest = minBet(me.points, view.minBet)

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 font-semibold">¿Qué hizo el mes siguiente?</legend>
        <div className="grid grid-cols-3 gap-2">
          {UPDOWN_CHOICES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={choice === option.value}
              onClick={() => setChoice(option.value)}
              className={cn(
                'grid h-20 place-items-center rounded-2xl border-2 bg-card text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
                choice === option.value ? 'border-current bg-muted' : 'border-border',
                choice === option.value && option.tone,
              )}
            >
              <span className={cn('text-2xl', option.tone)} aria-hidden="true">
                {option.icon}
              </span>
              <span className="text-foreground">{option.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">"Igual" gana si se movió menos de 2 % hacia cualquier lado.</p>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor={sliderId} className="flex justify-between text-sm">
          <span>¿Cuánto apuestas?</span>
          <strong className="font-mono tabular-nums">{points.format(bet)} pts</strong>
        </label>
        <input
          id={sliderId}
          type="range"
          min={lowest}
          max={me.points}
          step={10}
          value={bet}
          onChange={(event) => setBet(clampBet(Number(event.target.value), me.points, view.minBet))}
          className="w-full accent-[var(--accent-ink)]"
        />
        <div className="grid grid-cols-4 gap-1.5">
          {betChips(me.points, view.minBet).map((chip) => (
            <Button key={chip.label} type="button" variant="outline" size="sm" onClick={() => setBet(chip.value)}>
              {chip.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Si aciertas ganas {points.format(bet)} pts; si fallas los pierdes. Tienes {points.format(me.points)}.
        </p>
      </div>

      <Button className="h-12 w-full rounded-xl text-base" disabled={!choice || busy} onClick={() => choice && onVote(choice, bet)}>
        {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
        {choice ? 'Confirmar apuesta' : 'Elige una opción'}
      </Button>
    </div>
  )
}

function Result({ view }: { view: UpDownView }) {
  const me = view.me!
  const reveal = view.question!.reveal!
  const tone = !me.voted ? 'text-muted-foreground' : me.delta > 0 ? 'text-gain' : 'text-loss'

  return (
    <div className="space-y-4">
      <Card className={cn(me.voted && (me.delta > 0 ? 'border-gain/40' : 'border-loss/40'))}>
        <CardContent className="py-5 text-center" role="status">
          <p className="text-sm text-muted-foreground">
            {!me.voted ? 'No votaste a tiempo' : me.delta > 0 ? '¡Acertaste!' : 'Esta vez no'}
          </p>
          <p className={cn('mt-1 font-mono text-4xl font-semibold tabular-nums', tone)}>
            {!me.voted ? '±0' : `${me.delta > 0 ? '+' : '−'}${points.format(Math.abs(me.delta))} pts`}
          </p>
          <p className="mt-1 text-sm">
            Ahora tienes <strong>{points.format(me.points)} pts</strong> · puesto {me.rank} de {view.ranking.length}
          </p>
        </CardContent>
      </Card>
      <LessonCard reveal={reveal} />
      <p className="text-center text-sm text-muted-foreground">La siguiente ronda la abre el anfitrión.</p>
    </div>
  )
}

function Final({ view }: { view: UpDownView }) {
  const me = view.me

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="font-display text-5xl font-normal">
              {me ? (
                <>
                  Terminaste <em className="text-accent-ink">#{me.rank}</em>
                </>
              ) : (
                'El juego terminó'
              )}
            </h1>
          </CardTitle>
          {me && (
            <CardDescription>
              de {view.ranking.length}, con {points.format(me.points)} puntos y {me.hits} de {view.totalRounds} aciertos.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <UpDownRanking ranking={view.ranking} />
        </CardContent>
      </Card>
      <Button asChild variant="outline" className="w-full">
        <Link to="/minijuegos">Volver a minijuegos</Link>
      </Button>
    </div>
  )
}

function Gone({ title }: { title: string }) {
  return (
    <EmptyState
      icon={SearchX}
      title={title}
      description="Puede que el código esté mal, que la sala se haya cerrado o que el juego haya terminado hace rato."
      action={
        <Button asChild variant="outline">
          <Link to="/minijuegos">Volver a minijuegos</Link>
        </Button>
      }
    />
  )
}
