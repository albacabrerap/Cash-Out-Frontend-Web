import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { ListOrdered, Search } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useListParams } from '@/hooks/useListParams'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { OrderTarget } from '@/hooks/useOrderForm'
import type { ListConfig } from '@/lib/listParams'
import { inPeriod, isOrderKind, isOrderPeriod, matchesKind, newestFirst, orderMetrics, type OrderKind } from '@/lib/orders'
import { marketService } from '@/services/marketService'
import { portfolioService } from '@/services/portfolioService'
import type { TradeOrder } from '@/types/market'
import { DataPagination } from '@/components/data/DataPagination'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { OrderHistory, type Density } from '@/components/orders/OrderHistory'
import { OrderMetrics } from '@/components/orders/OrderMetrics'
import { OrderReceipt } from '@/components/orders/OrderReceipt'
import { OrderDialog } from '@/components/portfolio/OrderDialog'
import { PortfolioHeader } from '@/components/portfolio/PortfolioHeader'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

type Filter = 'periodo' | 'tipo' | 'q'

// /orders no filtra ni busca: el historial completo se trae una vez y se filtra aqui.
const LIST_CONFIG: ListConfig<Filter> = { sorts: ['createdAt,desc'], defaultSort: 'createdAt,desc', filters: ['periodo', 'tipo', 'q'] }
const KINDS: OrderKind[] = ['todas', 'compras', 'ventas', 'rechazadas']

export default function OrdersPage() {
  const list = useListParams(LIST_CONFIG)
  const { page, size, filters } = list
  const isWide = useMediaQuery('(min-width: 1024px)')
  const [density, setDensity] = useState<Density>('comoda')
  const [picked, setPicked] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [target, setTarget] = useState<OrderTarget | null>(null)

  const period = isOrderPeriod(filters.periodo) ? filters.periodo : '30d'
  const kind = isOrderKind(filters.tipo) ? filters.tipo : 'todas'
  const search = filters.q.trim().toUpperCase()

  const orders = useApiQuery(['orders-all'], (signal) => portfolioService.allOrders(signal).then(newestFirst))
  const portfolio = useApiQuery(['portfolio'], (signal) => portfolioService.get(signal))
  const assetIds = [...new Set(orders.data?.map((order) => order.assetId))].sort((a, b) => a - b)
  const assets = useApiQuery(['order-assets', assetIds], (signal) =>
    Promise.all(assetIds.map((id) => marketService.getAsset(id, signal).catch(() => null))),
  )
  const names = Object.fromEntries((assets.data ?? []).flatMap((asset) => (asset ? [[asset.id, asset.name]] : [])))

  const periodOrders = orders.data && inPeriod(orders.data, period)
  const counts = periodOrders && (Object.fromEntries(KINDS.map((k) => [k, periodOrders.filter((order) => matchesKind(order, k)).length])) as Record<OrderKind, number>)
  const visible = periodOrders?.filter((order) => matchesKind(order, kind) && (!search || order.symbol.includes(search)))
  const totalPages = visible ? Math.max(1, Math.ceil(visible.length / size)) : 1
  const pageOrders = visible?.slice((page - 1) * size, page * size)

  if (visible && page > totalPages) {
    return <Navigate to={list.hrefForPage(totalPages)} replace />
  }

  const selected = orders.data?.find((order) => order.id === picked) ?? (isWide ? pageOrders?.[0] : undefined)
  const select = (order: TradeOrder) => {
    setPicked(order.id)
    if (!isWide) setSheetOpen(true)
  }
  const repeat = (order: TradeOrder) => {
    setSheetOpen(false)
    setTarget({
      assetId: order.assetId,
      symbol: order.symbol,
      name: names[order.assetId] ?? order.symbol,
      side: order.side,
      held: portfolio.data?.positions.find((position) => position.assetId === order.assetId)?.quantity ?? 0,
    })
  }
  const receipt = selected && (
    <OrderReceipt key={selected.id} order={selected} name={names[selected.assetId]} onRepeat={repeat} className="lg:sticky lg:top-20" />
  )

  return (
    <>
      <PortfolioHeader />

      {orders.error && !orders.data ? (
        <ErrorState error={orders.error} onRetry={orders.reload} title="No pudimos cargar tus órdenes" />
      ) : orders.data && orders.data.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title="Todavía no hiciste órdenes"
          description="Cada compra o venta queda registrada aquí, también las que no se pudieron ejecutar y por qué."
          action={
            <Button asChild variant="outline">
              <Link to="/portafolio/mercado">
                <Search aria-hidden="true" />
                Explorar el mercado
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <OrderMetrics
            metrics={periodOrders && orderMetrics(periodOrders, period)}
            period={period}
            onPeriodChange={(value) => list.update({ periodo: value === '30d' ? '' : value })}
          />
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <OrderHistory
              orders={pageOrders}
              counts={counts}
              kind={kind}
              onKindChange={(value) => list.update({ tipo: value === 'todas' ? '' : value })}
              search={filters.q}
              onSearch={(value) => list.update({ q: value }, { replace: true })}
              density={density}
              onDensityChange={setDensity}
              names={names}
              selectedId={selected?.id}
              onSelect={select}
              empty={
                <div className="px-6 py-11 text-center">
                  <p className="font-semibold">No hay órdenes con estos filtros</p>
                  <Button size="sm" variant="outline" className="mt-2.5" onClick={() => list.update({ periodo: 'todo', tipo: '', q: '' })}>
                    Ver todas
                  </Button>
                </div>
              }
              footer={
                visible && visible.length > 0 ? (
                  <DataPagination
                    page={page}
                    size={size}
                    totalElements={visible.length}
                    totalPages={totalPages}
                    hrefForPage={list.hrefForPage}
                    onSizeChange={(value) => list.update({ size: value })}
                    noun={{ one: 'orden', other: 'órdenes' }}
                  />
                ) : null
              }
            />
            {isWide && receipt}
          </div>
        </>
      )}

      {!isWide && (
        <Sheet open={sheetOpen && Boolean(selected)} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto p-0 pt-10 [&_aside]:rounded-none [&_aside]:border-0">
            <SheetTitle className="sr-only">Comprobante de la orden</SheetTitle>
            {receipt}
          </SheetContent>
        </Sheet>
      )}

      <OrderDialog
        target={target}
        onOpenChange={(open) => !open && setTarget(null)}
        onDone={() => {
          setTarget(null)
          orders.reload()
          portfolio.reload()
        }}
      />
    </>
  )
}
