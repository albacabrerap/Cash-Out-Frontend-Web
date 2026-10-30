import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { Loader2, Minus, Plus, SearchX } from 'lucide-react'
import { toApiError, userMessage } from '@/api/errors'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useLiveRoom } from '@/hooks/useLiveRoom'
import { formatChange } from '@/lib/format'
import { adjustWeight, contributions, diversification, SECTOR_COLORS, totalWeight, WEIGHT_STEP } from '@/lib/portfolioGame'
import { portfolioGameService } from '@/services/portfolioGameService'
import type { PortfolioGameView, Weights } from '@/types/portfolioGame'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageLoader } from '@/components/feedback/PageLoader'
import { MixBar, PortfolioBoard } from '@/components/portfolioGame/PortfolioBoards'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const points = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })
const TONE = { risk: 'text-loss', warn: 'text-accent-ink', ok: 'text-gain' }

export default function PortfolioGamePlayerPage() {
  const code = (useParams().code ?? '').toUpperCase()
  const { view, connection, apply } = useLiveRoom<PortfolioGameView>(`/portfolio-rooms/${code}/events`)

  const act = useAsyncAction(async (run: () => Promise<PortfolioGameView>) => {
    try {
      apply(await run())
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
          {view.phase === 'RUNNING' && ` · Etapa ${view.step} de ${view.totalSteps}`}
        </span>
        {connection === 'reconnecting' && <span>Reconectando…</span>}
      </div>

      {view.phase === 'FINISHED' ? (
        <Final view={view} />
      ) : !view.me ? (
        view.phase === 'LOBBY' ? (
          <Join onJoin={() => act.run(() => portfolioGameService.join(code))} busy={act.isPending} />
        ) : (
          <Spectator view={view} />
        )
      ) : view.phase === 'LOBBY' ? (
        <AllocationEditor
          view={view}
          busy={act.isPending}
          onReady={(weights) => act.run(() => portfolioGameService.allocate(code, weights))}
          onEdit={() => act.run(() => portfolioGameService.unready(code))}
        />
      ) : (
        <MyRun view={view} />
      )}
    </div>
  )
}

function Join({ onJoin, busy }: { onJoin: () => void; busy: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="font-display text-4xl font-normal">
            Arma tu <em className="text-accent-ink">portafolio</em>
          </h1>
        </CardTitle>
        <CardDescription>Reparte tu dinero entre 8 sectores y mira cómo le va en cinco semestres reales del mercado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button className="h-12 w-full rounded-xl" onClick={onJoin} disabled={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
          Entrar a la sala
        </Button>
        <p className="text-xs text-muted-foreground">Es gratis: se juegan puntos de la sala, no fichas.</p>
      </CardContent>
    </Card>
  )
}

interface AllocationEditorProps {
  view: PortfolioGameView
  busy: boolean
  onReady: (weights: Weights) => void
  onEdit: () => void
}

function AllocationEditor({ view, busy, onReady, onEdit }: AllocationEditorProps) {
  const ready = view.me!.ready
  const [weights, setWeights] = useState<Weights>(() => view.me!.weights ?? {})
  const total = totalWeight(weights)
  const hint = total === 100 ? diversification(weights) : null

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl">
          Reparte el <em className="text-accent-ink">100 %</em>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          De {WEIGHT_STEP} en {WEIGHT_STEP}. No sabes qué semestres vienen: piensa qué aguanta una crisis y qué sube con optimismo.
        </p>
      </div>

      <ul className="divide-y rounded-2xl border bg-card">
        {view.sectors.map((sector) => {
          const weight = weights[sector.key] ?? 0
          return (
            <li key={sector.key} className="flex items-center gap-3 px-4 py-3">
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: SECTOR_COLORS[sector.key] }} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{sector.name}</p>
                <p className="text-xs text-muted-foreground">{sector.kind}</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-full"
                aria-label={`Quitar ${WEIGHT_STEP} % de ${sector.name}`}
                disabled={ready || weight === 0}
                onClick={() => setWeights(adjustWeight(weights, sector.key, -WEIGHT_STEP))}
              >
                <Minus aria-hidden="true" />
              </Button>
              <span className="w-12 text-center font-mono tabular-nums" aria-live="polite">
                {weight} %
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-full"
                aria-label={`Agregar ${WEIGHT_STEP} % a ${sector.name}`}
                disabled={ready || total >= 100}
                onClick={() => setWeights(adjustWeight(weights, sector.key, WEIGHT_STEP))}
              >
                <Plus aria-hidden="true" />
              </Button>
            </li>
          )
        })}
      </ul>

      <div className="space-y-2 rounded-2xl border bg-card p-4">
        <div className="flex justify-between text-sm">
          <span>Por asignar</span>
          <strong className={cn('font-mono tabular-nums', total === 100 ? 'text-gain' : 'text-accent-ink')}>{100 - total} %</strong>
        </div>
        <MixBar weights={weights} sectors={view.sectors} className="h-3" />
        {hint && <p className={cn('text-sm', TONE[hint.tone])}>{hint.text}</p>}
      </div>

      {ready ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-gain" />
            Listo. Esperando a que el anfitrión empiece…
          </p>
          <Button variant="outline" className="h-12 w-full rounded-xl" onClick={onEdit} disabled={busy}>
            Cambiar mi portafolio
          </Button>
        </div>
      ) : (
        <Button className="h-12 w-full rounded-xl text-base" onClick={() => onReady(weights)} disabled={busy || total !== 100}>
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
          {total === 100 ? 'Estoy listo' : `Asigna el 100 % (faltan ${100 - total} %)`}
        </Button>
      )}
    </div>
  )
}

function MyRun({ view }: { view: PortfolioGameView }) {
  const me = view.me!
  const result = me.result!
  const stage = view.stages[view.step - 1]
  const movers = contributions(me.weights ?? {}, stage.returns ?? {})
  const names = Object.fromEntries(view.sectors.map((sector) => [sector.key, sector.name]))

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-1 pt-6">
          <p className="text-sm text-muted-foreground">Tu portafolio vale</p>
          <p className="font-display text-5xl tabular-nums">
            {points.format(result.value)} <span className="font-sans text-sm text-muted-foreground">pts</span>
          </p>
          <p className="text-sm">
            <span className={result.returnPercent >= 0 ? 'text-gain' : 'text-loss'}>{formatChange(result.returnPercent)}</span> en total ·
            puesto {me.rank} de {view.ranking.length}
          </p>
          <MixBar weights={me.weights ?? {}} sectors={view.sectors} className="mt-3" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>{stage.period}</CardDescription>
          <CardTitle>
            <h1 className="text-lg leading-snug">{stage.title}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Esta etapa rendiste{' '}
            <strong className={result.lastPercent >= 0 ? 'text-gain' : 'text-loss'}>{formatChange(result.lastPercent)}</strong>.
            Lo que más pesó:
          </p>
          <ul className="space-y-1.5 text-sm">
            {movers.map((mover) => (
              <li key={mover.key} className="flex items-center gap-2">
                <span aria-hidden="true" className="size-2 rounded-full" style={{ background: SECTOR_COLORS[mover.key] }} />
                <span className="flex-1">
                  {names[mover.key]} <span className="text-muted-foreground">({mover.weight} %)</span>
                </span>
                <span className={cn('font-mono tabular-nums', mover.effect >= 0 ? 'text-gain' : 'text-loss')}>
                  {formatChange(mover.effect)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs leading-relaxed text-muted-foreground">{stage.lesson}</p>
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">La siguiente etapa la revela el anfitrión.</p>
    </div>
  )
}

function Spectator({ view }: { view: PortfolioGameView }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>La simulación empezó sin tu portafolio</h1>
        </CardTitle>
        <CardDescription>No alcanzaste a dejarlo listo, pero puedes seguir la tabla.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <PortfolioBoard ranking={view.ranking} sectors={view.sectors} benchmark={view.benchmark} />
      </CardContent>
    </Card>
  )
}

function Final({ view }: { view: PortfolioGameView }) {
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
                'La simulación terminó'
              )}
            </h1>
          </CardTitle>
          {me?.result && (
            <CardDescription>
              de {view.ranking.length}, con {points.format(me.result.value)} puntos ({formatChange(me.result.returnPercent)}).
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <PortfolioBoard ranking={view.ranking} sectors={view.sectors} benchmark={view.benchmark} />
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
