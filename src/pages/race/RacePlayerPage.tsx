import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { Loader2, SearchX } from 'lucide-react'
import { toApiError, userMessage } from '@/api/errors'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useRaceRoom } from '@/hooks/useRaceRoom'
import { formatTokens } from '@/lib/format'
import { formatSignedPercent, formatUsd } from '@/lib/market'
import { formatRaceDate } from '@/lib/race'
import { raceService } from '@/services/raceService'
import type { RaceSide, RaceView } from '@/types/race'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageLoader } from '@/components/feedback/PageLoader'
import { RaceChart } from '@/components/race/RaceChart'
import { RaceRanking } from '@/components/race/RaceRanking'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

const points = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })
const price2 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const FRACTIONS = [
  { value: '0.25', label: '25 %' },
  { value: '0.5', label: '50 %' },
  { value: '1', label: 'Todo' },
]

export default function RacePlayerPage() {
  const code = (useParams().code ?? '').toUpperCase()
  const { view, connection, apply } = useRaceRoom(code)
  const [fraction, setFraction] = useState('0.5')
  const [lastAction, setLastAction] = useState('')

  const join = useAsyncAction(async () => {
    try {
      apply(await raceService.join(code))
    } catch (error) {
      toast.error(userMessage(toApiError(error)))
    }
  })

  const trade = useAsyncAction(async (side: RaceSide) => {
    try {
      const next = await raceService.trade(code, side, Number(fraction))
      apply(next)
      const share = FRACTIONS.find((f) => f.value === fraction)?.label.toLowerCase()
      setLastAction(
        `${side === 'BUY' ? 'Compraste' : 'Vendiste'} ${share === 'todo' ? 'todo' : share} a ${price2.format(next.price)}`,
      )
    } catch (error) {
      toast.error(userMessage(toApiError(error)))
    }
  })

  if (!view) {
    if (connection === 'missing') return <MissingRoom />
    return <PageLoader label="Entrando a la sala…" />
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Sala <span className="font-mono font-medium text-foreground">{view.code}</span>
        </span>
        {connection === 'reconnecting' && <span className="text-muted-foreground">Reconectando…</span>}
      </div>

      {view.phase === 'CANCELLED' ? (
        <EmptyState
          icon={SearchX}
          title="El anfitrión canceló la sala"
          description="Si pagaste cuota, ya te la devolvimos."
          action={
            <Button asChild variant="outline">
              <Link to="/carrera">Volver</Link>
            </Button>
          }
        />
      ) : view.phase === 'LOBBY' ? (
        <Lobby view={view} onJoin={() => join.run()} joining={join.isPending} />
      ) : view.phase === 'COUNTDOWN' ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">La carrera empieza en</p>
            <p className="font-display text-8xl text-accent-ink">{view.countdown}</p>
          </CardContent>
        </Card>
      ) : view.phase === 'FINISHED' ? (
        <Result view={view} />
      ) : view.me ? (
        <Trading
          view={view}
          fraction={fraction}
          onFraction={setFraction}
          onTrade={(side) => trade.run(side)}
          busy={trade.isPending}
          lastAction={lastAction}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              <h1>La carrera ya empezó</h1>
            </CardTitle>
            <CardDescription>Ya no se puede entrar, pero puedes mirarla.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RaceChart prices={view.prices ?? []} totalSteps={view.totalSteps} compact className="h-32" />
            <RaceRanking ranking={view.ranking} showInvested={false} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Lobby({ view, onJoin, joining }: { view: RaceView; onJoin: () => void; joining: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="font-display text-4xl font-normal">
            {view.joined ? (
              <>
                Ya estás <em className="text-accent-ink">dentro</em>
              </>
            ) : (
              <>
                Carrera de <em className="text-accent-ink">trading</em>
              </>
            )}
          </h1>
        </CardTitle>
        <CardDescription>
          {view.joined
            ? 'Cuando el anfitrión empiece, vas a ver la moneda misteriosa y tus botones para comprar y vender.'
            : 'Entra antes de que empiece. Todos arrancan con 10 000 puntos.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-2 rounded-xl border p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Cuota</dt>
            <dd className="font-medium">{view.entryFee > 0 ? formatTokens(view.entryFee) : 'Gratis'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Pozo</dt>
            <dd className="font-medium">{formatTokens(view.pot)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Jugadores</dt>
            <dd className="font-medium">
              {view.ranking.length} de {view.maxPlayers}
            </dd>
          </div>
        </dl>
        {view.joined ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-accent-ink" />
            Esperando al anfitrión…
          </p>
        ) : (
          <>
            <Button className="h-12 w-full rounded-xl" onClick={onJoin} disabled={joining}>
              {joining && <Loader2 className="animate-spin" aria-hidden="true" />}
              {view.entryFee > 0 ? `Entrar por ${formatTokens(view.entryFee)}` : 'Entrar gratis'}
            </Button>
            {view.entryFee > 0 && (
              <p className="text-xs text-muted-foreground">Si al final son menos de 3 jugadores, te devolvemos la cuota.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

interface TradingProps {
  view: RaceView
  fraction: string
  onFraction: (value: string) => void
  onTrade: (side: RaceSide) => void
  busy: boolean
  lastAction: string
}

function Trading({ view, fraction, onFraction, onTrade, busy, lastAction }: TradingProps) {
  const me = view.me!
  const change = view.price - 100
  const canBuy = me.cash >= 0.01
  const canSell = me.investedPercent > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Minuto <span className="font-mono text-foreground">{view.step + 1}</span> de {view.totalSteps}
        </span>
        <span className="rounded-full bg-accent px-2.5 py-1 font-medium">
          #{me.rank} de {view.ranking.length}
        </span>
      </div>

      <div>
        <p className="text-xs tracking-wider text-muted-foreground uppercase">Moneda misteriosa</p>
        <p className="flex items-baseline gap-2">
          <span className="font-display text-5xl tabular-nums">{price2.format(view.price)}</span>
          <span className={cn('text-sm font-medium', change >= 0 ? 'text-gain' : 'text-loss')}>
            {formatSignedPercent(change)}
          </span>
        </p>
      </div>

      <RaceChart prices={view.prices ?? []} totalSteps={view.totalSteps} compact className="h-28" />

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Tu capital</span>
            <span className={cn('font-mono text-sm font-medium', me.returnPercent >= 0 ? 'text-gain' : 'text-loss')}>
              {formatSignedPercent(me.returnPercent)}
            </span>
          </div>
          <p className="font-display text-4xl tabular-nums">
            {points.format(me.value)} <span className="font-sans text-sm text-muted-foreground">pts</span>
          </p>
          <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-accent-ink transition-[width] duration-300" style={{ width: `${me.investedPercent}%` }} />
          </div>
          <p className="flex justify-between text-xs text-muted-foreground">
            <span>Invertido {Math.round(me.investedPercent)} %</span>
            <span>Efectivo {Math.round(100 - me.investedPercent)} %</span>
          </p>
        </CardContent>
      </Card>

      <ToggleGroup
        type="single"
        variant="outline"
        value={fraction}
        onValueChange={(value) => value && onFraction(value)}
        aria-label="Cuánto comprar o vender"
        className="grid w-full grid-cols-3"
      >
        {FRACTIONS.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value} className="h-11">
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="grid grid-cols-2 gap-3">
        <Button
          className="h-14 rounded-xl bg-signal-up text-base font-semibold text-white hover:bg-signal-up/90"
          onClick={() => onTrade('BUY')}
          disabled={busy || !canBuy}
        >
          Comprar
        </Button>
        <Button
          className="h-14 rounded-xl bg-signal-down text-base font-semibold text-white hover:bg-signal-down/90"
          onClick={() => onTrade('SELL')}
          disabled={busy || !canSell}
        >
          Vender
        </Button>
      </div>
      <p role="status" className="min-h-5 text-center text-sm text-muted-foreground">
        {lastAction || 'Elige cuánto y toca Comprar o Vender.'}
      </p>
    </div>
  )
}

function Result({ view }: { view: RaceView }) {
  const me = view.me
  const scenario = view.scenario
  const refunded = view.ranking.length < 3 && view.entryFee > 0
  const realChange = scenario ? (scenario.realClose / scenario.realOpen - 1) * 100 : null

  return (
    <div className="space-y-4">
      {me ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h1 className="font-display text-5xl font-normal">
                Terminaste <em className="text-accent-ink">#{me.rank}</em>
              </h1>
            </CardTitle>
            <CardDescription>
              de {view.ranking.length} jugadores, con{' '}
              <span className={me.returnPercent >= 0 ? 'text-gain' : 'text-loss'}>
                {formatSignedPercent(me.returnPercent)}
              </span>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={cn('rounded-xl border p-5 text-center', me.prize > 0 && 'border-gain/40 bg-gain/10')}>
              <p className="text-sm text-muted-foreground">
                {me.prize > 0
                  ? 'Ganaste del pozo'
                  : refunded
                    ? 'Eran menos de 3 jugadores: te devolvimos la cuota'
                    : 'Esta vez no entraste al podio'}
              </p>
              <p className={cn('mt-1 font-display text-4xl', me.prize > 0 && 'text-gain')}>
                {me.prize > 0 ? `+${formatTokens(me.prize)}` : refunded ? formatTokens(view.entryFee) : '0 fichas'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              <h1>La carrera terminó</h1>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RaceRanking ranking={view.ranking} showInvested={false} />
          </CardContent>
        </Card>
      )}

      {scenario && (
        <Card>
          <CardHeader>
            <CardDescription>La moneda misteriosa era…</CardDescription>
            <CardTitle>
              <h2 className="font-display text-3xl font-normal">
                {scenario.coinName}, el {formatRaceDate(scenario.date)}
              </h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{scenario.title}</p>
            <p className="text-muted-foreground">{scenario.description}</p>
            <p className="text-muted-foreground">
              En esas 6 horas pasó de {formatUsd(scenario.realOpen)} a {formatUsd(scenario.realClose)} (
              <span className={(realChange ?? 0) >= 0 ? 'text-gain' : 'text-loss'}>{formatSignedPercent(realChange)}</span>
              ).
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button asChild variant="outline">
          <Link to="/carrera">Otra carrera</Link>
        </Button>
        <Button asChild>
          <Link to="/portafolio/mercado">Invertir mis fichas</Link>
        </Button>
      </div>
    </div>
  )
}

function MissingRoom() {
  return (
    <EmptyState
      icon={SearchX}
      title="No encontramos esta sala"
      description="Puede que el código esté mal, que la sala se haya cancelado o que la carrera haya terminado hace rato."
      action={
        <Button asChild variant="outline">
          <Link to="/carrera">Volver a la carrera</Link>
        </Button>
      }
    />
  )
}
