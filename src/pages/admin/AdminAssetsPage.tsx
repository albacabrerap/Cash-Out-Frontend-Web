import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import { Ban, DollarSign, ExternalLink, MoreHorizontal, Plus, SearchX } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useListParams } from '@/hooks/useListParams'
import type { ListConfig } from '@/lib/listParams'
import { ASSET_SOURCE_LABEL, ASSET_TYPE_LABEL } from '@/lib/market'
import { marketService } from '@/services/marketService'
import type { Asset, AssetType } from '@/types/market'
import { DataPagination } from '@/components/data/DataPagination'
import { DataTable, type Column } from '@/components/data/DataTable'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { FilterSelect } from '@/components/filters/FilterSelect'
import { SearchInput } from '@/components/filters/SearchInput'
import { AssetFormDialog } from '@/components/admin/AssetFormDialog'
import { PriceDialog } from '@/components/admin/PriceDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Filter = 'search' | 'type'

const LIST_CONFIG: ListConfig<Filter> = { sorts: ['symbol'], defaultSort: 'symbol', filters: ['search', 'type'] }
const TYPE_OPTIONS = [
  { value: 'STOCK', label: 'Acciones' },
  { value: 'ETF', label: 'ETF' },
  { value: 'FUND', label: 'Fondos' },
  { value: 'CRYPTO', label: 'Cripto' },
]
const isAssetType = (value: string): value is AssetType =>
  value === 'STOCK' || value === 'ETF' || value === 'FUND' || value === 'CRYPTO'

export default function AdminAssetsPage() {
  const list = useListParams(LIST_CONFIG)
  const { page, size, filters } = list
  const [creating, setCreating] = useState(false)
  const [pricing, setPricing] = useState<Asset | null>(null)
  const [deactivating, setDeactivating] = useState<Asset | null>(null)

  const params = {
    page: page - 1,
    size,
    search: filters.search || undefined,
    type: isAssetType(filters.type) ? filters.type : undefined,
  }
  const query = useApiQuery(['admin-assets', params], (signal) => marketService.searchAllAssets(params, signal))
  const data = query.data

  const deactivate = useAsyncAction(async (asset: Asset) => {
    try {
      await marketService.deactivateAsset(asset.id)
      toast.success(`${asset.symbol} dado de baja`)
      setDeactivating(null)
      query.reload()
    } catch (err) {
      setDeactivating(null)
      toast.error(userMessage(toApiError(err)))
    }
  })

  if (data && !query.isRefreshing && data.totalPages > 0 && page > data.totalPages) {
    return <Navigate to={list.hrefForPage(data.totalPages)} replace />
  }

  const columns: Column<Asset>[] = [
    {
      id: 'symbol',
      header: 'Símbolo',
      cell: (asset) => (
        <div>
          <p className="font-semibold">{asset.symbol}</p>
          <p className="text-xs text-muted-foreground">{asset.exchange ?? asset.currency}</p>
        </div>
      ),
    },
    {
      id: 'name',
      header: 'Nombre',
      className: 'w-full max-w-0',
      cell: (asset) => <span className="line-clamp-1">{asset.name}</span>,
    },
    {
      id: 'type',
      header: 'Tipo',
      className: 'hidden md:table-cell',
      cell: (asset) => ASSET_TYPE_LABEL[asset.type],
    },
    {
      id: 'source',
      header: 'Origen',
      className: 'hidden sm:table-cell',
      cell: (asset) => <Badge variant={asset.source === 'MANUAL' ? 'secondary' : 'outline'}>{ASSET_SOURCE_LABEL[asset.source]}</Badge>,
    },
    {
      id: 'status',
      header: 'Estado',
      cell: (asset) => (
        <Badge variant={asset.active ? 'outline' : 'secondary'} className={asset.active ? undefined : 'text-muted-foreground'}>
          {asset.active ? 'Activo' : 'Dado de baja'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: <span className="sr-only">Acciones</span>,
      className: 'w-0',
      cell: (asset) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${asset.symbol}`}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {asset.active && (
              <DropdownMenuItem asChild>
                <Link to={`/portafolio/mercado/${asset.id}`}>
                  <ExternalLink aria-hidden="true" />
                  Ver en el mercado
                </Link>
              </DropdownMenuItem>
            )}
            {asset.source === 'MANUAL' && (
              <DropdownMenuItem onSelect={() => setPricing(asset)}>
                <DollarSign aria-hidden="true" />
                Fijar precio
              </DropdownMenuItem>
            )}
            {asset.active ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeactivating(asset)}>
                  <Ban aria-hidden="true" />
                  Dar de baja
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem disabled>
                {asset.source === 'ALPACA'
                  ? 'Vuelve si Alpaca lo lista al sincronizar'
                  : asset.source === 'COINBASE'
                    ? 'Vuelve si se agrega a los pares configurados'
                    : 'Dado de baja'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const isEmpty = data !== undefined && data.totalElements === 0 && !query.isRefreshing

  return (
    <>
      <PageHeader
        title="Activos"
        description="Todo el catálogo, incluidos los dados de baja. Las acciones de Alpaca se actualizan desde el panel."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Añadir activo
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          className="sm:w-80"
          defaultValue={filters.search}
          onSearch={(search) => list.update({ search }, { replace: true })}
          label="Buscar activos"
          placeholder="Nombre o símbolo"
        />
        <FilterSelect
          label="Tipo de activo"
          allLabel="Todos los tipos"
          value={params.type ?? ''}
          options={TYPE_OPTIONS}
          onChange={(type) => list.update({ type })}
        />
      </div>

      {query.error && !data ? (
        <ErrorState error={query.error} onRetry={query.reload} title="No pudimos cargar el catálogo" />
      ) : isEmpty ? (
        <EmptyState icon={SearchX} title="Ningún activo coincide" description="Prueba con el símbolo exacto o con otra parte del nombre." />
      ) : (
        <div className="space-y-4">
          <DataTable
            caption="Catálogo de activos"
            columns={columns}
            rows={data?.content}
            rowKey={(asset) => asset.id}
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
              noun={{ one: 'activo', other: 'activos' }}
            />
          )}
        </div>
      )}

      <AssetFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={() => {
          setCreating(false)
          query.reload()
        }}
      />
      <PriceDialog asset={pricing} onOpenChange={(open) => !open && setPricing(null)} onSaved={() => setPricing(null)} />
      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title={deactivating ? `¿Dar de baja ${deactivating.symbol}?` : ''}
        description="Deja de aparecer en el mercado y nadie puede comprarlo. Las posiciones abiertas se conservan y se siguen valorando."
        confirmLabel="Dar de baja"
        pendingLabel="Dando de baja…"
        onConfirm={() => deactivating && void deactivate.run(deactivating)}
        pending={deactivate.isPending}
      />
    </>
  )
}
