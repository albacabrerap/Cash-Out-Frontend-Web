import { Link, Navigate } from 'react-router'
import { ListOrdered, Search } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useListParams } from '@/hooks/useListParams'
import { formatDateTime } from '@/lib/format'
import type { ListConfig } from '@/lib/listParams'
import { formatQuantity, formatSignedTokens, formatUsd, ORDER_SIDE_LABEL, ORDER_STATUS_LABEL } from '@/lib/market'
import { portfolioService } from '@/services/portfolioService'
import type { TradeOrder } from '@/types/market'
import { DataPagination } from '@/components/data/DataPagination'
import { DataTable, type Column } from '@/components/data/DataTable'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PortfolioHeader } from '@/components/portfolio/PortfolioHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// El historial va siempre del mas reciente al mas antiguo.
const LIST_CONFIG: ListConfig<never> = { sorts: ['createdAt,desc'], defaultSort: 'createdAt,desc', filters: [] }

const COLUMNS: Column<TradeOrder>[] = [
  {
    id: 'date',
    header: 'Fecha',
    className: 'hidden md:table-cell',
    cell: (order) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(order.createdAt)}</span>,
  },
  {
    id: 'asset',
    header: 'Activo',
    cell: (order) => (
      <div>
        <Link to={`/portafolio/mercado/${order.assetId}`} className="font-medium underline-offset-4 hover:underline">
          {order.symbol}
        </Link>
        <p className="text-xs whitespace-nowrap text-muted-foreground md:hidden">
          {ORDER_SIDE_LABEL[order.side]} · {formatDateTime(order.createdAt)}
        </p>
      </div>
    ),
  },
  {
    id: 'side',
    header: 'Operación',
    className: 'hidden md:table-cell',
    cell: (order) => (
      <Badge variant={order.side === 'BUY' ? 'secondary' : 'outline'}>{ORDER_SIDE_LABEL[order.side]}</Badge>
    ),
  },
  {
    id: 'quantity',
    header: 'Cantidad',
    className: 'text-right',
    cell: (order) => <span className="tabular-nums">{formatQuantity(order.quantity)}</span>,
  },
  {
    id: 'price',
    header: 'Precio',
    className: 'hidden text-right lg:table-cell',
    cell: (order) => <span className="tabular-nums">{formatUsd(order.executionPrice)}</span>,
  },
  {
    id: 'tokens',
    header: 'Fichas',
    className: 'text-right',
    cell: (order) =>
      order.status === 'EXECUTED' ? (
        <span className={cn('tabular-nums', order.side === 'SELL' ? 'text-gain' : 'text-loss')}>
          {formatSignedTokens(order.side === 'BUY' ? -order.tokensMoved : order.tokensMoved)}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'status',
    header: 'Estado',
    className: 'w-full max-w-0',
    cell: (order) => (
      <div className="min-w-28">
        <Badge variant={order.status === 'REJECTED' ? 'destructive' : order.status === 'EXECUTED' ? 'outline' : 'secondary'}>
          {ORDER_STATUS_LABEL[order.status]}
        </Badge>
        {order.rejectionReason && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{order.rejectionReason}</p>}
      </div>
    ),
  },
]

export default function OrdersPage() {
  const list = useListParams(LIST_CONFIG)
  const { page, size } = list
  const params = { page: page - 1, size }
  const query = useApiQuery(['orders', params], (signal) => portfolioService.listOrders(params, signal))
  const data = query.data

  if (data && !query.isRefreshing && data.totalPages > 0 && page > data.totalPages) {
    return <Navigate to={list.hrefForPage(data.totalPages)} replace />
  }

  return (
    <>
      <PortfolioHeader />

      {query.error && !data ? (
        <ErrorState error={query.error} onRetry={query.reload} title="No pudimos cargar tus órdenes" />
      ) : data && data.totalElements === 0 ? (
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
        <div className="space-y-4">
          <DataTable
            caption="Tus órdenes de compra y venta"
            columns={COLUMNS}
            rows={data?.content}
            rowKey={(order) => order.id}
            loading={query.isLoading}
            refreshing={query.isRefreshing}
            skeletonRows={Math.min(size, 8)}
          />
          {data && (
            <DataPagination
              page={page}
              size={size}
              totalElements={data.totalElements}
              totalPages={data.totalPages}
              hrefForPage={list.hrefForPage}
              onSizeChange={(value) => list.update({ size: value })}
              noun={{ one: 'orden', other: 'órdenes' }}
            />
          )}
        </div>
      )}
    </>
  )
}
