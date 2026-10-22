import { useState, type PointerEvent } from 'react'
import { Link } from 'react-router'
import { Gamepad2 } from 'lucide-react'
import { formatTokens } from '@/lib/format'
import { MINIGAME_TYPE_LABEL, packFor } from '@/lib/minigames'
import { cn } from '@/lib/utils'
import type { Minigame } from '@/types/minigames'
import { Button } from '@/components/ui/button'
import { GameThumb } from './GameThumb'

interface MinigameCardProps {
  game: Minigame
  /** Saldo de fichas; undefined mientras carga. */
  balance: number | undefined
  /** Cuantas veces se jugo y el mejor puntaje, si se jugo. */
  stats: { plays: number; best: number | null }
  featured: boolean
}

/** Un juego como un plan: lo que cuesta, lo que paga y tu mejor resultado. Se inclina hacia el mouse. */
export function MinigameCard({ game, balance, stats, featured }: MinigameCardProps) {
  const pack = packFor(game)
  const missing = balance === undefined ? 0 : game.tokenCost - balance
  const [tilt, setTilt] = useState<{ x: number; y: number } | null>(null)
  const length = pack ? (pack.type === 'SIMULATION' ? `${pack.rounds.length} rondas` : `${pack.questions.length} preguntas`) : null

  const track = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return
    const box = event.currentTarget.getBoundingClientRect()
    setTilt({ x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height })
  }
  const lift = featured ? -6 : 0
  const transform = tilt
    ? `perspective(900px) rotateX(${((0.5 - tilt.y) * 7).toFixed(2)}deg) rotateY(${((tilt.x - 0.5) * 9).toFixed(2)}deg) translateY(${lift}px)`
    : `translateY(${lift}px)`

  return (
    <article
      aria-labelledby={`juego-${game.id}`}
      onPointerMove={track}
      onPointerLeave={() => setTilt(null)}
      style={{ transform }}
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-5 transition-transform duration-200 ease-out motion-reduce:transform-none!',
        featured && 'border-accent-ink shadow-[0_18px_40px_-30px_var(--accent-ink)]',
      )}
    >
      {tilt && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle at ${tilt.x * 100}% ${tilt.y * 100}%, color-mix(in oklab, var(--accent-ink) 14%, transparent), transparent 55%)`,
          }}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
          {MINIGAME_TYPE_LABEL[game.type]}
          {length && ` · ${length}`}
        </span>
        {featured && <span className="rounded-full bg-accent px-2 py-0.5 text-[11.5px] text-accent-ink">Más jugado</span>}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <GameThumb id={game.id} title={game.title} className="size-10 text-sm" />
        <h3 id={`juego-${game.id}`} className="text-lg leading-tight font-semibold">
          {game.title}
        </h3>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        {pack ? pack.description : 'Este juego todavía no se puede jugar en la web.'}
      </p>
      <p className="mt-4 text-xs text-muted-foreground">Ganas hasta</p>
      <p className="text-[1.75rem] leading-tight font-semibold tracking-tight text-gain tabular-nums">
        {formatTokens(game.maxTokenReward)}
      </p>
      <dl className="mt-4 space-y-1.5 border-t pt-3.5 text-[13px]">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Entrada</dt>
          <dd className="font-medium tabular-nums">{game.tokenCost === 0 ? 'Gratis' : formatTokens(game.tokenCost)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Tu mejor puntaje</dt>
          <dd className="tabular-nums">{stats.best === null ? '—' : `${stats.best} / 100`}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Partidas</dt>
          <dd className="tabular-nums">{stats.plays}</dd>
        </div>
      </dl>
      {pack && missing > 0 && <p className="mt-3 text-xs text-muted-foreground">Te faltan {formatTokens(missing)} para jugar.</p>}
      <div className="mt-auto pt-4">
        {pack ? (
          <Button asChild className="w-full" variant={featured ? 'default' : 'outline'}>
            <Link to={`/minijuegos/${game.id}`} aria-label={`Jugar ${game.title}`}>
              <Gamepad2 aria-hidden="true" />
              Jugar
            </Link>
          </Button>
        ) : (
          <Button variant="outline" className="w-full" disabled>
            Pronto
          </Button>
        )}
      </div>
    </article>
  )
}
