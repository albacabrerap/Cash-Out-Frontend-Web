import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Loader2, Newspaper, SearchX } from 'lucide-react'
import { toApiError, userMessage } from '@/api/errors'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useLiveRoom } from '@/hooks/useLiveRoom'
import { formatChange } from '@/lib/format'
import { choiceMeta, updownJoinUrl } from '@/lib/updown'
import { updownService } from '@/services/updownService'
import type { UpDownView } from '@/types/updown'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageLoader } from '@/components/feedback/PageLoader'
import { Logo } from '@/components/layout/Logo'
import { RoomQr } from '@/components/minigames/RoomQr'
import { UpDownChart } from '@/components/updown/UpDownChart'
import { LessonCard, UpDownRanking, VoteTally } from '@/components/updown/UpDownBoards'
import { UPDOWN_RULES } from '@/components/updown/updownRules'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const points = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })

/** La pantalla que se proyecta: QR para entrar, cada ronda en grande y el podio. */
export default function UpDownHostPage() {
  const code = (useParams().code ?? '').toUpperCase()
  const navigate = useNavigate()
  const { view, connection, apply } = useLiveRoom<UpDownView>(`/updown-rooms/${code}/events`)

  const act = useAsyncAction(async (run: (code: string) => Promise<UpDownView>) => {
    try {
      apply(await run(code))
    } catch (error) {
      toast.error(userMessage(toApiError(error)))
    }
  })
  const cancel = useAsyncAction(async () => {
    try {
      await updownService.cancel(code)
      navigate('/minijuegos')
    } catch (error) {
      toast.error(userMessage(toApiError(error)))
    }
  })

  if (!view) {
    if (connection === 'missing') return <Gone title="Esta sala ya no existe" />
    return <PageLoader fullScreen label="Abriendo la sala…" />
  }
  if (view.phase === 'CANCELLED') return <Gone title="La sala se cerró" />

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-6 py-3">
        <Logo />
        <span className="font-display text-2xl">
          ¿Sube o <em className="text-accent-ink">baja</em>?
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-muted px-3 py-1">
            Sala <strong className="font-mono tracking-widest">{view.code}</strong>
          </span>
          <span className="rounded-full bg-muted px-3 py-1">{view.ranking.length} jugadores</span>
          {view.phase !== 'LOBBY' && (
            <span className="rounded-full bg-accent px-3 py-1">
              Ronda {Math.min(view.round, view.totalRounds)} de {view.totalRounds}
            </span>
          )}
          {connection === 'reconnecting' && <span className="text-muted-foreground">Reconectando…</span>}
        </div>
      </header>

      <main id="contenido" className="flex flex-1 flex-col p-6">
        {view.phase === 'LOBBY' && (
          <Lobby
            view={view}
            onStart={() => act.run(updownService.start)}
            busy={act.isPending}
            onCancel={() => cancel.run()}
            cancelling={cancel.isPending}
          />
        )}
        {(view.phase === 'VOTING' || view.phase === 'REVEAL') && (
          <Round
            view={view}
            busy={act.isPending}
            onReveal={() => act.run(updownService.reveal)}
            onNext={() => act.run(updownService.next)}
          />
        )}
        {view.phase === 'FINISHED' && <Finished view={view} />}
      </main>
    </div>
  )
}

interface LobbyProps {
  view: UpDownView
  onStart: () => void
  busy: boolean
  onCancel: () => void
  cancelling: boolean
}

function Lobby({ view, onStart, busy, onCancel, cancelling }: LobbyProps) {
  return (
    <div className="grid flex-1 gap-8 lg:grid-cols-2">
      <RoomQr code={view.code} url={updownJoinUrl(view.code)} />

      <section aria-labelledby="sala-titulo" className="flex flex-col gap-5">
        <h2 id="sala-titulo" className="text-sm tracking-wider text-muted-foreground uppercase">
          En la sala · {view.ranking.length} de {view.maxPlayers}
        </h2>
        {view.ranking.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
            Todavía no entra nadie. Cuando escaneen el QR, van a aparecer aquí.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 xl:grid-cols-3">
            {view.ranking.map((player) => (
              <li key={player.id} className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
                <span
                  aria-hidden="true"
                  className="grid size-8 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
                >
                  {player.name.charAt(0).toUpperCase()}
                </span>
                <span className="truncate font-medium">{player.name}</span>
              </li>
            ))}
          </ul>
        )}

        <ul className="list-disc space-y-2 rounded-2xl border bg-card py-5 pr-5 pl-9 text-sm">
          {UPDOWN_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>

        {view.host ? (
          <div className="mt-auto flex flex-wrap gap-3">
            <Button className="h-14 flex-1 rounded-xl text-lg" onClick={onStart} disabled={busy || view.ranking.length === 0}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {view.ranking.length === 0 ? 'Esperando jugadores…' : 'Empezar'}
            </Button>
            <Button variant="outline" className="h-14 rounded-xl" onClick={onCancel} disabled={cancelling}>
              Cerrar sala
            </Button>
          </div>
        ) : (
          <p className="mt-auto text-sm text-muted-foreground">El anfitrión empieza el juego desde esta pantalla.</p>
        )}
      </section>
    </div>
  )
}

interface RoundProps {
  view: UpDownView
  busy: boolean
  onReveal: () => void
  onNext: () => void
}

function Round({ view, busy, onReveal, onNext }: RoundProps) {
  const question = view.question!
  const reveal = question.reveal
  const last = view.round >= view.totalRounds

  return (
    <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-label="La ronda" className="flex min-w-0 flex-col gap-4">
        <div className="flex items-start gap-4 rounded-2xl border bg-card p-5">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent">
            <Newspaper className="size-5 text-accent-ink" />
          </span>
          <div>
            <p className="text-xs tracking-wider text-muted-foreground uppercase">Noticia · {question.period}</p>
            <h1 className="mt-1 text-2xl leading-snug font-semibold">{question.context}</h1>
          </div>
        </div>

        <div className="flex min-h-80 flex-1 flex-col rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p>
              <strong>{reveal ? 'Activo revelado' : 'Activo misterioso'}</strong>
              <span className="text-muted-foreground"> · {question.sector}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Franja sombreada: "Igual" (±2 %) · {reveal ? 'el mes siguiente, revelado' : '¿qué hizo el mes siguiente?'}
            </p>
          </div>
          <UpDownChart past={question.past} future={question.future} outcome={reveal?.outcome} className="mt-4 flex-1" />
        </div>

        {reveal && <LessonCard reveal={reveal} className="motion-safe:animate-in motion-safe:fade-in" />}
      </section>

      <aside className="flex flex-col gap-4">
        <div className="rounded-2xl border bg-card p-5 text-center">
          <p className="text-xs tracking-wider text-muted-foreground uppercase">{reveal ? 'Resultado' : 'Tiempo para votar'}</p>
          <p className="mt-1 font-mono text-6xl leading-none tabular-nums" aria-live="off">
            {reveal ? (
              <span className={choiceMeta(reveal.outcome).tone}>{formatChange(reveal.changePercent)}</span>
            ) : (
              `0:${String(view.secondsLeft).padStart(2, '0')}`
            )}
          </p>
          {!reveal && (
            <div aria-hidden="true" className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-accent-ink transition-[width] duration-1000 ease-linear"
                style={{ width: `${(view.secondsLeft / view.votingSeconds) * 100}%` }}
              />
            </div>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {view.tally.answered} de {view.ranking.length} votaron
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-xs tracking-wider text-muted-foreground uppercase">Cómo vota la sala</h2>
          <VoteTally options={view.tally.options} answered={view.tally.answered} winner={reveal?.outcome} />
        </div>

        <div className="flex-1 rounded-2xl border bg-card p-4">
          <h2 className="mb-2 px-1 text-xs tracking-wider text-muted-foreground uppercase">Ranking</h2>
          <UpDownRanking ranking={view.ranking} showDelta={!!reveal} limit={8} />
        </div>

        {view.host &&
          (reveal ? (
            <Button className="h-12 rounded-xl text-base" onClick={onNext} disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {last ? 'Ver el resultado final' : 'Siguiente ronda →'}
            </Button>
          ) : (
            <Button variant="outline" className="h-12 rounded-xl" onClick={onReveal} disabled={busy}>
              Revelar ya
            </Button>
          ))}
      </aside>
    </div>
  )
}

function Finished({ view }: { view: UpDownView }) {
  const podium = view.ranking.slice(0, 3)
  // De izquierda a derecha: segundo, primero, tercero.
  const order = [podium[1], podium[0], podium[2]].filter(Boolean)
  const heights: Record<number, string> = { 1: 'h-44', 2: 'h-32', 3: 'h-24' }

  return (
    <div className="grid flex-1 gap-8 xl:grid-cols-2">
      <section aria-labelledby="final-titulo" className="flex flex-col gap-6">
        <h1 id="final-titulo" className="font-display text-5xl">
          Resultado <em className="text-accent-ink">final</em>
        </h1>
        <ol className="grid grid-cols-3 items-end gap-3">
          {order.map((player) => (
            <li key={player.id} className="flex flex-col items-center gap-1.5 text-center">
              <span className="font-semibold">{player.name}</span>
              <span className="font-mono text-sm text-muted-foreground">
                {points.format(player.points)} pts · {player.hits} {player.hits === 1 ? 'acierto' : 'aciertos'}
              </span>
              <div
                className={cn('grid w-full place-items-center rounded-t-2xl rounded-b-md bg-accent', heights[player.rank])}
              >
                <span className="font-display text-4xl">{player.rank}</span>
              </div>
            </li>
          ))}
        </ol>
        {view.ranking.length > 3 && <UpDownRanking ranking={view.ranking.slice(3)} />}
        <Button asChild variant="outline" className="mt-auto h-12 self-start rounded-xl">
          <Link to="/minijuegos">Volver a minijuegos</Link>
        </Button>
      </section>

      <section aria-labelledby="rondas-titulo" className="rounded-3xl border bg-card p-6">
        <h2 id="rondas-titulo" className="text-xs tracking-wider text-muted-foreground uppercase">
          Lo que pasó en cada ronda
        </h2>
        <ol className="mt-3 divide-y">
          {view.history.map((round, i) => {
            const meta = choiceMeta(round.outcome)
            return (
              <li key={round.date} className="flex items-baseline gap-3 py-2.5 text-sm">
                <span className="w-5 font-mono text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1">{round.name}</span>
                <span className={cn('font-mono font-medium tabular-nums', meta.tone)}>
                  {meta.icon} {formatChange(round.changePercent)}
                </span>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}

function Gone({ title }: { title: string }) {
  return (
    <main id="contenido" className="grid min-h-svh place-items-center p-6">
      <EmptyState
        icon={SearchX}
        title={title}
        description="Se cerró o terminó hace rato."
        action={
          <Button asChild variant="outline">
            <Link to="/minijuegos">Volver a minijuegos</Link>
          </Button>
        }
      />
    </main>
  )
}
