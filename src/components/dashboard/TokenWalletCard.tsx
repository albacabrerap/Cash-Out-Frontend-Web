import { useEffect, useState, type MouseEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check } from 'lucide-react'
import type { ApiQuery } from '@/hooks/useApiQuery'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { tokenMoveLabel } from '@/lib/dashboard'
import { parseServerDateTime } from '@/lib/format'
import { formatNewsTime } from '@/lib/news'
import type { TokenTransaction, TokenWallet } from '@/types/finance'
import type { PageResponse } from '@/types/api'
import { cn } from '@/lib/utils'

const tokens = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ROTATE_MS = 3200

interface TokenWalletCardProps {
  wallet: ApiQuery<TokenWallet>
  moves: ApiQuery<PageResponse<TokenTransaction>>
  ownerName: string
}

/** Las fichas como una tarjeta que se inclina con el mouse; debajo pasan sus ultimos movimientos. */
export function TokenWalletCard({ wallet, moves, ownerName }: TokenWalletCardProps) {
  const reduced = useReducedMotion()
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [shown, setShown] = useState(0)
  const recent = moves.data?.content.slice(0, 3) ?? []

  useEffect(() => {
    if (recent.length < 2) return
    const timer = setInterval(() => setShown((i) => (i + 1) % recent.length), ROTATE_MS)
    return () => clearInterval(timer)
  }, [recent.length])

  const lean = (event: MouseEvent<HTMLDivElement>) => {
    if (reduced) return
    const box = event.currentTarget.getBoundingClientRect()
    setTilt({
      x: -((event.clientY - box.top) / box.height - 0.5) * 16,
      y: ((event.clientX - box.left) / box.width - 0.5) * 20,
    })
  }

  const move = recent[shown % Math.max(recent.length, 1)]
  const incoming = move ? move.amount > 0 : true

  return (
    <section aria-labelledby="resumen-fichas" className="flex flex-col overflow-hidden rounded-2xl border bg-card">
      <div
        className="relative grid h-56 place-items-center [perspective:700px]"
        onMouseMove={lean}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1.4px)] bg-size-[14px_14px]"
          style={{ maskImage: 'radial-gradient(circle at 50% 48%, #000 0, #000 34%, transparent 70%)' }}
        />
        <span className="absolute top-4 left-4 flex items-center gap-1 rounded-full border bg-card px-2.5 py-0.5 text-xs">
          <Check className="size-3" aria-hidden="true" />
          Sin dinero real
        </span>
        <span className="absolute top-4 right-4 rounded-full border bg-card px-2.5 py-0.5 text-xs">1 ficha = 1 US$</span>
        <div
          className="relative mt-7 flex h-29 w-49 flex-col rounded-2xl bg-[linear-gradient(135deg,#3f4058,#6b5a6a)] px-4 py-3 text-[#f8f8f9] shadow-[0_24px_50px_-24px_rgb(0_0_0/0.55)] transition-transform duration-150 ease-out dark:bg-[linear-gradient(135deg,#f1f1f5,#d9ccd7)] dark:text-[#181928]"
          style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
        >
          <span className="flex items-center justify-between">
            <img src="/cashout-chip.svg" alt="" className="size-6" />
            <span className="text-[10px] tracking-[0.14em] opacity-60">FICHAS</span>
          </span>
          <span className="mt-auto font-mono text-2xl font-medium tracking-tight tabular-nums">
            {wallet.data ? tokens.format(wallet.data.tokenBalance) : '—'}
          </span>
          <span className="flex justify-between text-[10.5px] uppercase opacity-60">
            <span className="truncate">{ownerName}</span>
            <span>Cash-Out</span>
          </span>
        </div>
        <div
          key={move?.id ?? 'vacio'}
          className="absolute bottom-0.5 left-1/2 flex w-60 -translate-x-1/2 animate-in items-center gap-2.5 rounded-xl border bg-card px-3 py-2 shadow-[0_14px_30px_-16px_rgb(0_0_0/0.6)] duration-500 fade-in slide-in-from-bottom-2"
          aria-live="polite"
        >
          <span
            aria-hidden="true"
            className={cn(
              'grid size-7 flex-none place-items-center rounded-full',
              move && incoming ? 'bg-gain/15 text-gain' : 'bg-muted text-muted-foreground',
            )}
          >
            {move && !incoming ? <ArrowUpRight className="size-3.5" /> : <ArrowDownLeft className="size-3.5" />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <strong className="truncate text-xs font-semibold">{move ? tokenMoveLabel(move) : 'Todavía sin movimientos'}</strong>
            <span className="text-[11px] text-muted-foreground">
              {move ? formatNewsTime(parseServerDateTime(move.createdAt).toISOString()) : 'Gana fichas en los minijuegos'}
            </span>
          </span>
          {move && (
            <span className={cn('font-mono text-xs font-medium tabular-nums', incoming ? 'text-gain' : 'text-foreground')}>
              {incoming ? '+' : '−'}
              {tokens.format(Math.abs(move.amount))}
            </span>
          )}
        </div>
      </div>
      <div className="mt-auto p-5 pt-3">
        <h2 id="resumen-fichas" className="font-semibold">
          Tus fichas
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Para invertir en el mercado simulado. Las ganas en los minijuegos y en la carrera de trading.
        </p>
      </div>
    </section>
  )
}
