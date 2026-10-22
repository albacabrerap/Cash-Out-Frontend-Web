import { useState } from 'react'
import { Link } from 'react-router'
import { ChartCandlestick, Search } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { addDays } from '@/lib/dates'
import { formatTokens } from '@/lib/format'
import { lastDays, portfolioHistory, type PortfolioNow } from '@/lib/portfolioHistory'
import { marketService } from '@/services/marketService'
import { portfolioService } from '@/services/portfolioService'
import { walletService } from '@/services/walletService'
import type { OrderSide, Position, PricePoint } from '@/types/market'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { AllocationDonut } from '@/components/portfolio/AllocationDonut'
import { MetricStrip } from '@/components/portfolio/MetricStrip'
import { OrderTicket, type TicketAsset } from '@/components/portfolio/OrderTicket'
import { PortfolioHeader } from '@/components/portfolio/PortfolioHeader'
import { PositionsList } from '@/components/portfolio/PositionsList'
import { Button } from '@/components/ui/button'

const DAYS = 30
const SERIES = 7

export default function PortfolioPage() {
  // Sube con cada orden ejecutada: portafolio, saldo e historia se vuelven a pedir.
  const [version, setVersion] = useState(0)
  const portfolio = useApiQuery(['portfolio', version], (signal) => portfolioService.get(signal))
  const wallet = useApiQuery(['token-wallet', version], (signal) => walletService.get(signal))
  const days = lastDays(DAYS)
  const history = useApiQuery(['portfolio-history', days[0], version], async (signal) => {
    const [orders, transactions] = await Promise.all([
      portfolioService.allOrders(signal),
      walletService.transactionsSince(days[0], signal),
    ])
    const ids = [...new Set(orders.filter((order) => order.status === 'EXECUTED').map((order) => order.assetId))]
    // Unos dias antes del inicio, para tener un cierre con que valorar el primer dia aunque caiga en feriado.
    const range = { from: addDays(days[0], -7), to: days[DAYS - 1] }
    const closes = new Map<number, PricePoint[]>(
      await Promise.all(
        ids.map(async (id) => [id, await marketService.getPriceHistory(id, signal, range).catch(() => [])] as const),
      ),
    )
    return { orders, transactions, closes }
  })

  const [ticket, setTicket] = useState<TicketAsset | null>(null)
  const [side, setSide] = useState<OrderSide>('BUY')

  const data = portfolio.data
  const positions = data?.positions
  const now: PortfolioNow | undefined =
    data && wallet.data
      ? { tokens: wallet.data.tokenBalance, value: data.simulatedValue, unrealized: data.unrealizedPnl, realized: data.realizedPnl }
      : undefined
  const series =
    history.data && now
      ? portfolioHistory(days, history.data.orders, history.data.closes, history.data.transactions, now)
      : undefined
  const monthCloses = history.data
    ? new Map([...history.data.closes].map(([id, points]) => [id, points.filter((point) => point.date >= days[0])]))
    : undefined

  // El color sigue al activo (por id), no a su tamano en el portafolio.
  const byId = [...(positions ?? [])].sort((a, b) => a.assetId - b.assetId)
  const colorOf = (assetId: number) => {
    const index = byId.findIndex((position) => position.assetId === assetId)
    return index >= 0 && index < SERIES ? `var(--series-${index + 1})` : 'var(--muted-foreground)'
  }

  const trade = (position: Position, next: OrderSide) => {
    setTicket({ assetId: position.assetId, symbol: position.symbol, name: position.assetName })
    setSide(next)
    document.getElementById('portafolio-orden')?.scrollIntoView({ block: 'nearest' })
  }

  return (
    <>
      <PortfolioHeader
        actions={
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm">
            <strong className="font-semibold tabular-nums">
              {wallet.data ? formatTokens(wallet.data.tokenBalance) : '—'}
            </strong>
            <span className="text-muted-foreground">libres</span>
          </span>
        }
      />

      {portfolio.error && !data ? (
        <ErrorState error={portfolio.error} onRetry={portfolio.reload} title="No pudimos cargar tu portafolio" />
      ) : (
        <>
          <MetricStrip now={now} history={series} failed={Boolean(history.error && !history.data)} />

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <section aria-labelledby="portafolio-posiciones" className="min-w-0 overflow-hidden rounded-2xl border bg-card">
              <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
                <h2 id="portafolio-posiciones" className="text-base font-semibold">
                  Mis inversiones
                </h2>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/portafolio/mercado">
                    <Search aria-hidden="true" />
                    Explorar mercado
                  </Link>
                </Button>
              </div>
              {positions && positions.length === 0 ? (
                <EmptyState
                  className="m-5 mt-0"
                  icon={ChartCandlestick}
                  title="Todavía no tienes inversiones"
                  description="Busca una empresa que conozcas en «Nueva orden» y compra con tus fichas. Puedes comprar fracciones."
                />
              ) : (
                <div className="border-t">
                  <PositionsList positions={positions} closes={monthCloses} colorOf={colorOf} onTrade={trade} />
                </div>
              )}
            </section>

            <div className="space-y-5 lg:sticky lg:top-20">
              <OrderTicket
                asset={ticket}
                side={side}
                positions={positions}
                onAssetChange={(asset) => {
                  setTicket(asset)
                  setSide('BUY')
                }}
                onSideChange={setSide}
                onDone={() => setVersion((n) => n + 1)}
              />
              <AllocationDonut tokens={wallet.data?.tokenBalance} positions={positions} colorOf={colorOf} />
            </div>
          </div>
        </>
      )}
    </>
  )
}
