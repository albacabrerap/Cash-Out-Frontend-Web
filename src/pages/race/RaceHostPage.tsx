import { Link, useNavigate, useParams } from 'react-router'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { Loader2, SearchX } from 'lucide-react'
import { toApiError, userMessage } from '@/api/errors'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useRaceRoom } from '@/hooks/useRaceRoom'
import { formatTokens } from '@/lib/format'
import { formatSignedPercent, formatUsd } from '@/lib/market'
import { formatRaceDate, raceJoinUrl, RACE_STEPS_PER_SECOND } from '@/lib/race'
import { raceService } from '@/services/raceService'
import type { RaceView } from '@/types/race'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageLoader } from '@/components/feedback/PageLoader'
import { Logo } from '@/components/layout/Logo'
import { RaceChart } from '@/components/race/RaceChart'
import { RaceRanking } from '@/components/race/RaceRanking'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const price2 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const RULES = [
  'Todos operan la misma moneda misteriosa, con precios reales de un día del mercado.',
  'Seis horas de mercado en 90 segundos.',
  'Empiezas con 10 000 puntos: gana el mejor rendimiento.',
  'El pozo se reparte 50 / 30 / 20. Con menos de 3 jugadores se devuelve la cuota.',
]

/** La pantalla que se proyecta: QR para entrar, la carrera en grande y el podio. */
export default function RaceHostPage() {
  const code = (useParams().code ?? '').toUpperCase()
  const navigate = useNavigate()
  const { view, connection, apply } = useRaceRoom(code)

  const start = useAsyncAction(async () => {
    try {
      apply(await raceService.start(code))
    } catch (error) {
      toast.error(userMessage(toApiError(error)))
    }
  })
  const cancel = useAsyncAction(async () => {
    try {
      await raceService.cancel(code)
      navigate('/carrera')
    } catch (error) {
      toast.error(userMessage(toApiError(error)))
    }
  })

  if (!view) {
    if (connection === 'missing') {
      return (
        <main id="contenido" className="grid min-h-svh place-items-center p-6">
          <EmptyState
            icon={SearchX}
            title="Esta sala ya no existe"
            description="Se canceló o la carrera terminó hace rato."
            action={
              <Button asChild variant="outline">
                <Link to="/carrera">Crear otra sala</Link>
              </Button>
            }
          />
        </main>
      )
    }
    return <PageLoader fullScreen label="Abriendo la sala…" />
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-6 py-3">
        <Logo />
        <span className="font-display text-2xl">
          Carrera de <em className="text-accent-ink">trading</em>
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-muted px-3 py-1">
            Sala <strong className="font-mono tracking-widest">{view.code}</strong>
          </span>
          <span className="rounded-full bg-muted px-3 py-1">{view.ranking.length} jugadores</span>
          <span className="rounded-full bg-accent px-3 py-1">
            Pozo <strong>{formatTokens(view.pot)}</strong>
          </span>
          {connection === 'reconnecting' && <span className="text-muted-foreground">Reconectando…</span>}
        </div>
      </header>

      <main id="contenido" className="relative flex flex-1 flex-col p-6">
        {view.phase === 'LOBBY' && (
          <Lobby
            view={view}
            onStart={() => start.run()}
            starting={start.isPending}
            onCancel={() => cancel.run()}
            cancelling={cancel.isPending}
          />
        )}
        {(view.phase === 'COUNTDOWN' || view.phase === 'RUNNING') && <Running view={view} />}
        {view.phase === 'FINISHED' && <Finished view={view} />}
        {view.phase === 'CANCELLED' && (
          <EmptyState
            icon={SearchX}
            title="La sala se canceló"
            description="Las cuotas se devolvieron a cada jugador."
            action={
              <Button asChild variant="outline">
                <Link to="/carrera">Crear otra sala</Link>
              </Button>
            }
          />
        )}

        {view.phase === 'COUNTDOWN' && (
          <div className="absolute inset-0 grid place-items-center bg-background/85 backdrop-blur-sm" role="status">
            <div className="text-center">
              <p className="text-lg text-muted-foreground">La carrera empieza en</p>
              <p className="font-display text-[12rem] leading-none text-accent-ink">{view.countdown}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

interface LobbyProps {
  view: RaceView
  onStart: () => void
  starting: boolean
  onCancel: () => void
  cancelling: boolean
}

function Lobby({ view, onStart, starting, onCancel, cancelling }: LobbyProps) {
  const url = raceJoinUrl(view.code)

  return (
    <div className="grid flex-1 gap-8 lg:grid-cols-2">
      <section
        aria-labelledby="unirse-titulo"
        className="flex flex-col items-center justify-center gap-5 rounded-3xl border bg-card p-8 text-center"
      >
        <h1 id="unirse-titulo" className="font-display text-5xl">
          Escanea para <em className="text-accent-ink">unirte</em>
        </h1>
        <div className="rounded-2xl bg-white p-4">
          <QRCodeSVG value={url} size={240} marginSize={0} title={`QR para entrar a la sala ${view.code}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            o entra a <span className="font-mono text-foreground">{url.replace(/^https?:\/\//, '')}</span>
          </p>
          <p className="mt-2 font-mono text-5xl font-medium tracking-[0.2em]">{view.code}</p>
        </div>
      </section>

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
            {view.ranking.map((racer) => (
              <li key={racer.id} className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
                <span
                  aria-hidden="true"
                  className="grid size-8 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
                >
                  {racer.name.charAt(0).toUpperCase()}
                </span>
                <span className="truncate font-medium">{racer.name}</span>
              </li>
            ))}
          </ul>
        )}

        <ul className="space-y-2 rounded-2xl border bg-card p-5 text-sm">
          {RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
          <li>
            Cuota: <strong>{view.entryFee > 0 ? formatTokens(view.entryFee) : 'gratis'}</strong>
          </li>
        </ul>

        {view.host ? (
          <div className="mt-auto flex flex-wrap gap-3">
            <Button className="h-14 flex-1 rounded-xl text-lg" onClick={onStart} disabled={starting || view.ranking.length === 0}>
              {starting && <Loader2 className="animate-spin" aria-hidden="true" />}
              {view.ranking.length === 0 ? 'Esperando jugadores…' : 'Empezar carrera'}
            </Button>
            <Button variant="outline" className="h-14 rounded-xl" onClick={onCancel} disabled={cancelling}>
              Cancelar sala
            </Button>
          </div>
        ) : (
          <p className="mt-auto text-sm text-muted-foreground">El anfitrión empieza la carrera desde esta pantalla.</p>
        )}
      </section>
    </div>
  )
}

function Running({ view }: { view: RaceView }) {
  const change = view.price - 100
  const progress = ((view.step + 1) / view.totalSteps) * 100
  const secondsLeft = Math.ceil((view.totalSteps - view.step - 1) / RACE_STEPS_PER_SECOND)

  return (
    <div className="grid flex-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
      <section aria-label="Precio de la moneda misteriosa" className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
          <div>
            <p className="text-sm tracking-wider text-muted-foreground uppercase">Moneda misteriosa</p>
            <p className="font-display text-7xl leading-none tabular-nums">{price2.format(view.price)}</p>
          </div>
          <span
            className={cn(
              'mb-1 rounded-full px-3 py-1 text-lg font-semibold tabular-nums',
              change >= 0 ? 'bg-gain/15 text-gain' : 'bg-loss/15 text-loss',
            )}
          >
            {formatSignedPercent(change)}
          </span>
          <div className="ml-auto text-right">
            <p className="text-sm text-muted-foreground">Minuto</p>
            <p className="font-mono text-3xl tabular-nums">
              {view.step + 1}
              <span className="text-muted-foreground">/{view.totalSteps}</span>
            </p>
          </div>
        </div>
        <div className="flex-1 rounded-3xl border bg-card p-4">
          <RaceChart prices={view.prices ?? []} totalSteps={view.totalSteps} className="h-full min-h-80" />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-accent-ink transition-[width] duration-200" style={{ width: `${progress}%` }} />
          </div>
          <span className="tabular-nums">{secondsLeft} s</span>
        </div>
      </section>

      <section aria-label="Ranking y movimientos" className="flex flex-col gap-4">
        <div className="rounded-3xl border bg-card p-4">
          <h2 className="mb-3 px-1 text-sm tracking-wider text-muted-foreground uppercase">Ranking en vivo</h2>
          <RaceRanking ranking={view.ranking} />
        </div>
        <div className="rounded-3xl border bg-card p-4">
          <h2 className="mb-3 px-1 text-sm tracking-wider text-muted-foreground uppercase">Movimientos</h2>
          {view.feed.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">Nadie operó todavía.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {view.feed.map((move) => (
                <li key={`${move.step}-${move.text}`} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn('size-2 rounded-full', move.buy ? 'bg-signal-up' : 'bg-signal-down')}
                  />
                  <span className="font-mono text-xs text-muted-foreground">min {move.step + 1}</span>
                  <span>{move.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function Finished({ view }: { view: RaceView }) {
  const scenario = view.scenario
  const podium = view.ranking.slice(0, 3)
  const rest = view.ranking.slice(3)
  const realChange = scenario ? (scenario.realClose / scenario.realOpen - 1) * 100 : null
  const refunded = view.ranking.length < 3 && view.entryFee > 0
  // De izquierda a derecha: segundo, primero, tercero.
  const order = [podium[1], podium[0], podium[2]].filter(Boolean)
  const heights: Record<number, string> = { 1: 'h-48', 2: 'h-36', 3: 'h-28' }

  return (
    <div className="grid flex-1 gap-8 xl:grid-cols-2">
      <section aria-labelledby="revelacion" className="flex flex-col gap-4">
        {scenario && (
          <div className="rounded-3xl border border-accent-ink/40 bg-card p-6">
            <p className="text-sm tracking-wider text-muted-foreground uppercase">La moneda misteriosa era…</p>
            <h1 id="revelacion" className="mt-2 font-display text-5xl">
              {scenario.coinName}, <em className="text-accent-ink">{formatRaceDate(scenario.date)}</em>
            </h1>
            <p className="mt-3 text-lg font-medium">{scenario.title}</p>
            <p className="mt-1 text-muted-foreground">{scenario.description}</p>
            <p className="mt-3 text-muted-foreground">
              En esas 6 horas pasó de {formatUsd(scenario.realOpen)} a {formatUsd(scenario.realClose)} (
              <span className={(realChange ?? 0) >= 0 ? 'text-gain' : 'text-loss'}>{formatSignedPercent(realChange)}</span>
              ).
            </p>
          </div>
        )}
        {refunded && (
          <p className="rounded-2xl border p-4 text-sm text-muted-foreground">
            Fueron menos de 3 jugadores: no hubo premio y cada uno recuperó su cuota.
          </p>
        )}
        <Button asChild variant="outline" className="mt-auto h-12 self-start rounded-xl">
          <Link to="/carrera">Nueva carrera</Link>
        </Button>
      </section>

      <section aria-label="Podio" className="flex flex-col gap-6">
        <ol className="grid grid-cols-3 items-end gap-3">
          {order.map((racer) => (
            <li key={racer.id} className="flex flex-col items-center gap-2 text-center">
              <span
                aria-hidden="true"
                className="grid size-12 place-items-center rounded-full bg-secondary text-lg font-semibold text-secondary-foreground"
              >
                {racer.name.charAt(0).toUpperCase()}
              </span>
              <span className="font-semibold">{racer.name}</span>
              <span className={cn('font-mono text-sm', racer.returnPercent >= 0 ? 'text-gain' : 'text-loss')}>
                {formatSignedPercent(racer.returnPercent)}
              </span>
              <div
                className={cn(
                  'flex w-full flex-col items-center justify-center gap-1 rounded-t-2xl rounded-b-md bg-accent',
                  heights[racer.rank],
                )}
              >
                <span className="font-display text-4xl">{racer.rank}</span>
                {racer.prize > 0 && (
                  <span className="rounded-full bg-gain/15 px-2 py-0.5 text-sm font-semibold text-gain">
                    +{formatTokens(racer.prize)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
        {rest.length > 0 && (
          <ol className="divide-y rounded-2xl border bg-card px-4" start={4}>
            {rest.map((racer) => (
              <li key={racer.id} className="flex items-center gap-3 py-2.5">
                <span className="w-6 font-mono text-muted-foreground">{racer.rank}</span>
                <span className="font-medium">{racer.name}</span>
                <span className={cn('ml-auto font-mono', racer.returnPercent >= 0 ? 'text-gain' : 'text-loss')}>
                  {formatSignedPercent(racer.returnPercent)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
