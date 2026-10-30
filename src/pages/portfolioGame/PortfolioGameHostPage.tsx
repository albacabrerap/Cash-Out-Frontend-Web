import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Check, Loader2, SearchX } from 'lucide-react'
import { toApiError, userMessage } from '@/api/errors'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useLiveRoom } from '@/hooks/useLiveRoom'
import { formatChange } from '@/lib/format'
import { finalLesson, portfolioGameJoinUrl, SECTOR_COLORS } from '@/lib/portfolioGame'
import { portfolioGameService } from '@/services/portfolioGameService'
import type { PortfolioGameView } from '@/types/portfolioGame'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageLoader } from '@/components/feedback/PageLoader'
import { Logo } from '@/components/layout/Logo'
import { RoomQr } from '@/components/minigames/RoomQr'
import { PortfolioBoard, SectorReturns } from '@/components/portfolioGame/PortfolioBoards'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** La pantalla que se proyecta: QR y sectores mientras se arman los portafolios, y despues cada semestre. */
export default function PortfolioGameHostPage() {
  const code = (useParams().code ?? '').toUpperCase()
  const navigate = useNavigate()
  const { view, connection, apply } = useLiveRoom<PortfolioGameView>(`/portfolio-rooms/${code}/events`)

  const act = useAsyncAction(async (run: (code: string) => Promise<PortfolioGameView>) => {
    try {
      apply(await run(code))
    } catch (error) {
      toast.error(userMessage(toApiError(error)))
    }
  })
  const cancel = useAsyncAction(async () => {
    try {
      await portfolioGameService.cancel(code)
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
          Arma tu <em className="text-accent-ink">portafolio</em>
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-muted px-3 py-1">
            Sala <strong className="font-mono tracking-widest">{view.code}</strong>
          </span>
          <span className="rounded-full bg-muted px-3 py-1">{view.ranking.length} jugadores</span>
          {view.phase !== 'LOBBY' && (
            <span className="rounded-full bg-accent px-3 py-1">
              Etapa {view.step} de {view.totalSteps}
            </span>
          )}
          {connection === 'reconnecting' && <span className="text-muted-foreground">Reconectando…</span>}
        </div>
      </header>

      <main id="contenido" className="flex flex-1 flex-col p-6">
        {view.phase === 'LOBBY' ? (
          <Lobby
            view={view}
            onStart={() => act.run(portfolioGameService.start)}
            busy={act.isPending}
            onCancel={() => cancel.run()}
            cancelling={cancel.isPending}
          />
        ) : (
          <Simulation view={view} busy={act.isPending} onNext={() => act.run(portfolioGameService.next)} />
        )}
      </main>
    </div>
  )
}

interface LobbyProps {
  view: PortfolioGameView
  onStart: () => void
  busy: boolean
  onCancel: () => void
  cancelling: boolean
}

function Lobby({ view, onStart, busy, onCancel, cancelling }: LobbyProps) {
  const ready = view.ranking.filter((player) => player.ready).length

  return (
    <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <RoomQr code={view.code} url={portfolioGameJoinUrl(view.code)} />

      <div className="flex flex-col gap-5">
        <section aria-labelledby="sectores-titulo">
          <h2 id="sectores-titulo" className="mb-3 text-sm tracking-wider text-muted-foreground uppercase">
            Los 8 sectores
          </h2>
          <ul className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {view.sectors.map((sector) => (
              <li key={sector.key} className="rounded-xl border bg-card p-3">
                <p className="flex items-center gap-1.5 font-medium">
                  <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: SECTOR_COLORS[sector.key] }} />
                  {sector.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {sector.kind} · {sector.symbol}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{sector.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sala-titulo">
          <h2 id="sala-titulo" className="mb-3 text-sm tracking-wider text-muted-foreground uppercase">
            Portafolios listos · {ready} de {view.ranking.length}
          </h2>
          {view.ranking.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
              Todavía no entra nadie. Cuando escaneen el QR, van a aparecer aquí.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 xl:grid-cols-3">
              {view.ranking.map((player) => (
                <li key={player.id} className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-medium">{player.name}</span>
                  {player.ready ? (
                    <span className="inline-flex items-center gap-1 text-xs text-gain">
                      <Check className="size-3.5" aria-hidden="true" />
                      Listo
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Armando…</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {view.host ? (
          <div className="mt-auto space-y-2">
            <div className="flex flex-wrap gap-3">
              <Button className="h-14 flex-1 rounded-xl text-lg" onClick={onStart} disabled={busy || ready === 0}>
                {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
                {ready === 0 ? 'Esperando portafolios…' : 'Empezar simulación'}
              </Button>
              <Button variant="outline" className="h-14 rounded-xl" onClick={onCancel} disabled={cancelling}>
                Cerrar sala
              </Button>
            </div>
            {ready > 0 && ready < view.ranking.length && (
              <p className="text-sm text-muted-foreground">Quien no esté listo al empezar queda fuera y puede mirar.</p>
            )}
          </div>
        ) : (
          <p className="mt-auto text-sm text-muted-foreground">El anfitrión empieza la simulación desde esta pantalla.</p>
        )}
      </div>
    </div>
  )
}

function Simulation({ view, busy, onNext }: { view: PortfolioGameView; busy: boolean; onNext: () => void }) {
  const stage = view.stages[view.step - 1]
  const finished = view.phase === 'FINISHED'
  const lesson = finished ? finalLesson(view.ranking) : null

  return (
    <div className="flex flex-1 flex-col gap-5">
      <ol className="grid grid-cols-5 gap-2" aria-label="Etapas">
        {view.stages.map((item) => (
          <li
            key={item.number}
            aria-current={item.number === view.step ? 'step' : undefined}
            className={cn(
              'rounded-xl border px-3 py-2 text-sm',
              item.number === view.step ? 'border-accent-ink bg-accent' : !item.revealed && 'text-muted-foreground',
            )}
          >
            <span className="font-mono text-xs text-muted-foreground">{item.number}</span>{' '}
            {item.revealed ? item.period : '¿?'}
          </li>
        ))}
      </ol>

      <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="etapa-titulo" className="flex flex-col gap-4 rounded-3xl border bg-card p-6">
          <div>
            <p className="text-xs tracking-wider text-muted-foreground uppercase">
              Etapa {stage.number} · {stage.period}
            </p>
            <h1 id="etapa-titulo" className="mt-2 font-display text-4xl leading-tight">
              {stage.title}
            </h1>
            <p className="mt-3 leading-relaxed text-muted-foreground">{stage.lesson}</p>
          </div>
          <SectorReturns sectors={view.sectors} returns={stage.returns ?? {}} />
          {stage.benchmarkReturn !== null && (
            <p className="text-sm text-muted-foreground">
              El S&P 500 rindió{' '}
              <span className={stage.benchmarkReturn >= 0 ? 'text-gain' : 'text-loss'}>{formatChange(stage.benchmarkReturn)}</span> en
              el semestre.
            </p>
          )}
        </section>

        <section aria-labelledby="tabla-titulo" className="flex flex-col gap-4 rounded-3xl border bg-card p-6">
          <h2 id="tabla-titulo" className="text-xs tracking-wider text-muted-foreground uppercase">
            {finished
              ? 'Resultado final'
              : view.step < 2
                ? 'Tabla · con una etapa todavía no hay riesgo que medir'
                : 'Tabla en vivo · ordena el puntaje'}
          </h2>
          {lesson && <p className="rounded-2xl bg-accent p-4 font-medium">{lesson}</p>}
          <PortfolioBoard ranking={view.ranking} sectors={view.sectors} benchmark={view.benchmark} />
          <p className="text-xs text-muted-foreground">
            Riesgo: cuánto varió el retorno de una etapa a otra. Puntaje: retorno promedio por etapa dividido entre el riesgo.
          </p>
          {view.host && !finished && (
            <Button className="mt-auto h-12 rounded-xl text-base" onClick={onNext} disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {view.step + 1 === view.totalSteps ? 'Revelar la última etapa' : 'Siguiente etapa →'}
            </Button>
          )}
          {finished && (
            <Button asChild variant="outline" className="mt-auto h-12 self-start rounded-xl">
              <Link to="/minijuegos">Volver a minijuegos</Link>
            </Button>
          )}
        </section>
      </div>
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
