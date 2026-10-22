import { useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { marketService } from '@/services/marketService'
import type { CatalogSyncResult } from '@/types/market'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const count = new Intl.NumberFormat('es-PE')

export function CatalogSyncCard({ onSynced }: { onSynced: () => void }) {
  const [result, setResult] = useState<CatalogSyncResult | null>(null)

  const sync = useAsyncAction(async () => {
    try {
      const synced = await marketService.syncCatalog()
      setResult(synced)
      onSynced()
      toast.success('Catálogo sincronizado', {
        description: `${count.format(synced.created)} nuevas · ${count.format(synced.deactivated)} dadas de baja`,
      })
    } catch (err) {
      toast.error(userMessage(toApiError(err)))
    }
  })

  const items = result && [
    { label: 'Recibidas', value: result.received },
    { label: 'Nuevas', value: result.created },
    { label: 'Actualizadas', value: result.updated },
    { label: 'Dadas de baja', value: result.deactivated },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Catálogo de acciones</h2>
        </CardTitle>
        <CardDescription>
          Trae de Alpaca las acciones de EE. UU.: agrega las nuevas, actualiza las que cambiaron y da de baja las que ya
          no se negocian. Puede tardar unos segundos.
        </CardDescription>
      </CardHeader>
      {items && (
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((item) => (
              <div key={item.label} className="rounded-lg bg-muted/60 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{count.format(item.value)}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      )}
      <CardFooter>
        <Button onClick={() => void sync.run()} disabled={sync.isPending}>
          {sync.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
          {sync.isPending ? 'Sincronizando…' : 'Sincronizar con Alpaca'}
        </Button>
      </CardFooter>
    </Card>
  )
}
