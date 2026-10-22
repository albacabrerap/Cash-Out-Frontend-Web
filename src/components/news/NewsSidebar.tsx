import { useApiQuery } from '@/hooks/useApiQuery'
import { newsService } from '@/services/newsService'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Los activos del catalogo que mas nombran las ultimas noticias del mercado. */
export function TrendingCard({ active, onSymbol }: { active: string | undefined; onSymbol(symbol: string): void }) {
  const trending = useApiQuery(['news-trending'], (signal) => newsService.trending(signal))

  return (
    <section aria-labelledby="mural-menciones" className="rounded-2xl border bg-card p-4">
      <h3 id="mural-menciones" className="text-sm font-semibold">
        Más mencionadas
      </h3>
      <p className="mb-2.5 text-xs text-muted-foreground">En las últimas 100 noticias del mercado</p>
      {trending.error && !trending.data ? (
        <p className="text-sm text-muted-foreground">No pudimos cargar el ranking.</p>
      ) : !trending.data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : trending.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ninguna noticia reciente nombra activos del catálogo.</p>
      ) : (
        <ol className="grid gap-0.5">
          {trending.data.map((asset, i) => (
            <li key={asset.assetId}>
              <button
                type="button"
                aria-pressed={active === asset.symbol}
                onClick={() => onSymbol(asset.symbol)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-1.5 py-2 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                  active === asset.symbol && 'bg-accent',
                )}
              >
                <span className="w-4 font-mono text-xs text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-medium">{asset.symbol}</span>
                  <span className="block truncate text-xs text-muted-foreground">{asset.name}</span>
                </span>
                <span className="font-mono text-sm tabular-nums">
                  {asset.mentions}
                  <span className="sr-only"> noticias</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export function NewsTips() {
  return (
    <section aria-labelledby="mural-consejos" className="rounded-2xl border border-accent-ink/30 bg-accent p-4.5">
      <h3 id="mural-consejos" className="mb-2.5 font-display text-2xl">
        Cómo leer una <em className="text-accent-ink">noticia</em>
      </h3>
      <ol className="grid list-decimal gap-2 pl-4.5 text-sm leading-snug text-foreground/85">
        <li>El titular busca clics: lee el resumen antes de sacar conclusiones.</li>
        <li>Cuando la noticia llega a ti, el precio muchas veces ya se movió.</li>
        <li>Una subida por redes sociales, sin noticias del proyecto, suele revertirse.</li>
        <li>Nunca compres o vendas solo por un titular: mira el gráfico y tu plan.</li>
      </ol>
    </section>
  )
}
