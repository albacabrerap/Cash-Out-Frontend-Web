import { Link, useSearchParams } from 'react-router'
import { Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useApiQuery } from '@/hooks/useApiQuery'
import { DEFAULT_CASH_FLOW_RANGE, isCashFlowRange, monthsFor, monthsThisYear, type CashFlowRange } from '@/lib/cashFlow'
import { firstName, formatDateTime } from '@/lib/format'
import { goalService } from '@/services/goalService'
import { movementService } from '@/services/movementService'
import { portfolioService } from '@/services/portfolioService'
import { savingsService } from '@/services/savingsService'
import { walletService } from '@/services/walletService'
import { CashFlowBars } from '@/components/dashboard/CashFlowBars'
import { FirstStepsCard } from '@/components/dashboard/FirstStepsCard'
import { GoalsPaceCard } from '@/components/dashboard/GoalsPaceCard'
import { MarketComparisonCard } from '@/components/dashboard/MarketComparisonCard'
import { PortfolioSummaryCard } from '@/components/dashboard/PortfolioSummaryCard'
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard'
import { SavingsCard } from '@/components/dashboard/SavingsCard'
import { SavingsRateCard } from '@/components/dashboard/SavingsRateCard'
import { TokenWalletCard } from '@/components/dashboard/TokenWalletCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const { user } = useAuth()
  const savings = useApiQuery(['savings'], (signal) => savingsService.get(signal))
  const wallet = useApiQuery(['token-wallet'], (signal) => walletService.get(signal))
  const tokenMoves = useApiQuery(['token-moves'], (signal) =>
    walletService.transactions({ page: 0, size: 3, sort: 'createdAt,desc' }, signal),
  )
  const goals = useApiQuery(['goals'], (signal) => goalService.list(signal))
  const portfolio = useApiQuery(['portfolio'], (signal) => portfolioService.get(signal))
  // Los ultimos movimientos tambien dicen si la cuenta es nueva: un grafico en cero no alcanza para saberlo.
  const recent = useApiQuery(['movements', 'recent'], (signal) => movementService.list({ page: 0, size: 5 }, signal))

  const [searchParams, setSearchParams] = useSearchParams()
  const rangeParam = searchParams.get('rango')
  const range: CashFlowRange = isCashFlowRange(rangeParam) ? rangeParam : DEFAULT_CASH_FLOW_RANGE
  const months = monthsFor(range)
  const flows = useApiQuery(['movements', 'monthly', months], (signal) => movementService.monthly(months, signal))
  const yearMonths = monthsThisYear()
  const year = useApiQuery(['movements', 'monthly', yearMonths], (signal) => movementService.monthly(yearMonths, signal))

  const s = savings.data
  const isNewAccount = recent.data?.totalElements === 0
  const hasPositions = (portfolio.data?.positions.length ?? 0) > 0
  const goalsInProgress = goals.data?.filter((goal) => goal.status === 'IN_PROGRESS').length

  const changeRange = (next: CashFlowRange) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.set('rango', next)
        return params
      },
      // Cambiar el rango no es navegar: la pagina se queda donde esta.
      { replace: true, preventScrollReset: true },
    )

  return (
    <>
      <PageHeader
        title={user ? `Hola, ${firstName(user.name)}` : 'Resumen'}
        description={
          isNewAccount
            ? 'Bienvenida a Cash-Out. Empecemos por lo básico.'
            : s
              ? `Saldos actualizados el ${formatDateTime(s.updatedAt)}`
              : 'Así van tus finanzas.'
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/movimientos/gastos?nuevo=1">
                <Plus aria-hidden="true" />
                Registrar gasto
              </Link>
            </Button>
            <Button asChild>
              <Link to="/movimientos/ingresos?nuevo=1">
                <Plus aria-hidden="true" />
                Registrar ingreso
              </Link>
            </Button>
          </>
        }
      />

      {isNewAccount ? <FirstStepsCard /> : <SavingsCard savings={savings} year={year} goalsInProgress={goalsInProgress} />}

      <div className="grid gap-5 lg:grid-cols-3">
        <TokenWalletCard wallet={wallet} moves={tokenMoves} ownerName={user?.name ?? ''} />
        <SavingsRateCard year={year} />
        <RecentActivityCard movements={recent} />

        {!isNewAccount && (
          <>
            <CashFlowBars query={flows} range={range} onRangeChange={changeRange} />
            <GoalsPaceCard query={goals} />
          </>
        )}

        {(!isNewAccount || hasPositions) && <PortfolioSummaryCard query={portfolio} />}
        {hasPositions && portfolio.data && <MarketComparisonCard portfolio={portfolio.data} />}
      </div>
    </>
  )
}
