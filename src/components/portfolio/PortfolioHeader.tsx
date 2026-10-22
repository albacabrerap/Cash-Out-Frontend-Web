import type { ReactNode } from 'react'
import { ChartCandlestick, ListOrdered, Newspaper, Wallet } from 'lucide-react'
import { SectionTabs } from '@/components/navigation/SectionTabs'

const TABS = [
  { to: '/portafolio', label: 'Mis inversiones', icon: Wallet, end: true },
  { to: '/portafolio/mercado', label: 'Mercado', icon: ChartCandlestick },
  { to: '/portafolio/ordenes', label: 'Órdenes', icon: ListOrdered },
  { to: '/portafolio/noticias', label: 'Noticias', icon: Newspaper },
] as const

export function PortfolioHeader({ actions }: { actions?: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            Tu <em className="text-accent-ink">portafolio</em>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inviertes fichas en acciones de EE. UU. y criptomonedas con precios reales: nada de esto es dinero real.
          </p>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <SectionTabs label="Secciones del portafolio" tabs={TABS} />
    </div>
  )
}
