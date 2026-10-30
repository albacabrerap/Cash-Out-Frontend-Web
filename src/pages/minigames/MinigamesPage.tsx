import { Coins, Gamepad2 } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { formatTokens } from '@/lib/format'
import { gameStats, playHistory } from '@/lib/minigames'
import { minigameService } from '@/services/minigameService'
import { walletService } from '@/services/walletService'
import type { Minigame } from '@/types/minigames'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { MinigameCard } from '@/components/minigames/MinigameCard'
import { RaceHero } from '@/components/minigames/RaceHero'
import { SessionHistory } from '@/components/minigames/SessionHistory'
import { LiveGameHero } from '@/components/minigames/LiveGameHero'
import { PORTFOLIO_GAME_RULES } from '@/components/portfolioGame/portfolioGameRules'
import { UPDOWN_RULES } from '@/components/updown/updownRules'
import { portfolioGameService } from '@/services/portfolioGameService'
import { updownService } from '@/services/updownService'
import { Skeleton } from '@/components/ui/skeleton'

/** Los gratis primero: son la puerta de entrada para quien todavia no tiene fichas. */
function sortByCost(games: Minigame[]): Minigame[] {
  return [...games].sort((a, b) => a.tokenCost - b.tokenCost || a.title.localeCompare(b.title, 'es'))
}

export default function MinigamesPage() {
  const games = useApiQuery(['minigames'], (signal) => minigameService.list(signal))
  const sessions = useApiQuery(['minigame-sessions'], (signal) => minigameService.sessions(signal))
  const wallet = useApiQuery(['wallet'], (signal) => walletService.get(signal))
  // Las carreras no tienen historial propio: salen de los ultimos movimientos de fichas.
  const ledger = useApiQuery(['token-moves', 'races'], (signal) =>
    walletService.transactions({ page: 0, size: 100, sort: 'createdAt,desc' }, signal),
  )
  const balance = wallet.data?.tokenBalance

  const stats = gameStats(sessions.data ?? [])
  // Solo se destaca si de verdad hay uno mas jugado que el resto: con empate no hay favorito.
  const [first, second] = [...stats].sort((a, b) => b[1].plays - a[1].plays)
  const mostPlayed = first && (!second || first[1].plays > second[1].plays) ? first[0] : undefined
  const records = sessions.data && ledger.data ? playHistory(sessions.data, ledger.data.content) : undefined

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            Juega y gana <em className="text-accent-ink">fichas</em>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Aprende de finanzas jugando y usa lo que ganes en el simulador de mercado.</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border bg-card px-3.5 py-1.5 text-sm whitespace-nowrap sm:self-auto">
          <Coins className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-muted-foreground">Tus fichas</span>
          {balance !== undefined ? (
            <span className="font-semibold tabular-nums">{formatTokens(balance)}</span>
          ) : wallet.error ? (
            <span>—</span>
          ) : (
            <Skeleton className="h-4 w-20" aria-label="Cargando tus fichas" />
          )}
        </div>
      </div>

      <RaceHero />
      <LiveGameHero
        id="minijuegos-subebaja"
        eyebrow={
          <>
            <span aria-hidden="true" className="text-gain">
              ▲
            </span>
            Macroeconomía en vivo
            <span aria-hidden="true" className="text-loss">
              ▼
            </span>
          </>
        }
        title={
          <>
            ¿Sube o <em className="text-accent-ink">baja</em>?
          </>
        }
        description="Una noticia real, el gráfico hasta ese día y un mes tapado. La clase apuesta qué pasó y al revelar se ve por qué: tasas, inflación, crisis bancarias y resultados de empresas."
        rules={UPDOWN_RULES}
        create={updownService.create}
        basePath="/minijuegos/sube-o-baja"
      />
      <LiveGameHero
        id="minijuegos-portafolio"
        eyebrow="Diversificación en vivo"
        title={
          <>
            Arma tu <em className="text-accent-ink">portafolio</em>
          </>
        }
        description="Reparte tu dinero entre 8 sectores y mira cómo le va en cinco semestres reales del mercado, entre la inflación de 2022, el boom de la IA y la guerra de aranceles."
        rules={PORTFOLIO_GAME_RULES}
        create={portfolioGameService.create}
        basePath="/minijuegos/arma-tu-portafolio"
      />

      <section aria-labelledby="minijuegos-juegos" className="space-y-3">
        <h2 id="minijuegos-juegos" className="text-base font-semibold">
          Juegos
        </h2>
        {games.error && !games.data ? (
          <ErrorState error={games.error} onRetry={games.reload} title="No pudimos cargar los minijuegos" />
        ) : games.data?.length === 0 ? (
          <EmptyState
            icon={Gamepad2}
            title="Todavía no hay juegos publicados"
            description="Cuando haya un juego disponible aparecerá aquí, con lo que cuesta y lo que puedes ganar."
          />
        ) : (
          <ul className="grid gap-5 pt-1.5 md:grid-cols-2 xl:grid-cols-3" aria-busy={!games.data}>
            {games.data
              ? sortByCost(games.data).map((game) => {
                  const played = stats.get(game.title)
                  return (
                    <li key={game.id} className="grid">
                      <MinigameCard
                        game={game}
                        balance={balance}
                        stats={{ plays: played?.plays ?? 0, best: played ? played.best : null }}
                        featured={game.title === mostPlayed}
                      />
                    </li>
                  )
                })
              : [0, 1, 2].map((i) => (
                  <li key={i}>
                    <Skeleton className="h-96 rounded-2xl" />
                  </li>
                ))}
          </ul>
        )}
      </section>

      <SessionHistory
        records={records}
        error={sessions.error ?? ledger.error}
        onRetry={() => {
          sessions.reload()
          ledger.reload()
        }}
      />

      <p className="rounded-2xl border border-dashed px-5 py-4 text-[13px] leading-relaxed text-muted-foreground">
        <strong className="font-medium text-foreground">¿De dónde salen las fichas?</strong> Las ganas cumpliendo tus metas de ahorro y
        jugando. Sirven solo dentro de Cash-Out: puedes invertirlas en el simulador de mercado, pero nunca son dinero real.
      </p>
    </>
  )
}
