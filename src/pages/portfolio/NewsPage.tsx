import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Check, Star, X } from 'lucide-react'
import { useApiQuery } from '@/hooks/useApiQuery'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useNewsFeed } from '@/hooks/useNewsFeed'
import type { OrderTarget } from '@/hooks/useOrderForm'
import { useSavedNews } from '@/hooks/useSavedNews'
import { isNewsScope, NEWS_SCOPES } from '@/lib/news'
import { cn } from '@/lib/utils'
import { portfolioService } from '@/services/portfolioService'
import type { NewsAsset, NewsItem, NewsScope } from '@/types/news'
import { ErrorState } from '@/components/feedback/ErrorState'
import { SegmentButton, Segmented } from '@/components/filters/Segmented'
import { HoldingChips } from '@/components/news/HoldingChips'
import { NewsList } from '@/components/news/NewsList'
import { NewsReader } from '@/components/news/NewsReader'
import { TrendingBars } from '@/components/news/TrendingBars'
import { OrderDialog } from '@/components/portfolio/OrderDialog'
import { PortfolioHeader } from '@/components/portfolio/PortfolioHeader'
import { Button } from '@/components/ui/button'

const SCOPE_TEXT: Record<NewsScope, string> = { mine: 'de tus inversiones', market: 'del mercado', crypto: 'de cripto' }

export default function NewsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const isWide = useMediaQuery('(min-width: 1024px)')
  const portfolio = useApiQuery(['portfolio'], (signal) => portfolioService.get(signal))
  const saved = useSavedNews()
  const [picked, setPicked] = useState<number | null>(null)
  const [target, setTarget] = useState<OrderTarget | null>(null)

  const positions = portfolio.data?.positions ?? []
  const scopeParam = searchParams.get('alcance')
  const symbol = searchParams.get('simbolo') ?? undefined
  const onlySaved = searchParams.get('guardadas') === '1'
  // Sin alcance en la URL se espera al portafolio: con inversiones se abre en las suyas.
  let scope: NewsScope | undefined = isNewsScope(scopeParam) ? scopeParam : undefined
  if (!scope && portfolio.data) scope = positions.length > 0 ? 'mine' : 'market'
  if (!scope && portfolio.error) scope = 'market'

  const feed = useNewsFeed(scope, symbol)
  const feedItems = feed.items
  const items = onlySaved ? saved.saved.filter((news) => !symbol || news.assets.some((asset) => asset.symbol === symbol)) : feedItems
  const selected = items?.find((news) => news.id === picked) ?? (isWide ? items?.[0] : undefined)

  const update = (changes: Record<string, string | undefined>) => {
    setPicked(null)
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value) params.set(key, value)
          else params.delete(key)
        }
        return params
      },
      { replace: true, preventScrollReset: true },
    )
  }
  const setSymbol = (next: string | undefined) => update({ simbolo: next })
  const setScope = (next: NewsScope) => update({ alcance: next, simbolo: undefined, guardadas: undefined })
  const select = (news: NewsItem) => setPicked(!isWide && news.id === picked ? -1 : news.id)
  const trade = (asset: NewsAsset) =>
    setTarget({
      assetId: asset.assetId,
      symbol: asset.symbol,
      name: asset.name,
      side: 'BUY',
      held: positions.find((position) => position.assetId === asset.assetId)?.quantity ?? 0,
    })

  const about = symbol ? `de ${symbol}` : scope ? SCOPE_TEXT[scope] : ''
  const one = items?.length === 1
  const countLabel =
    items && `${items.length} ${onlySaved ? (one ? 'noticia guardada' : 'noticias guardadas') : `${one ? 'noticia' : 'noticias'} ${about}`}`

  return (
    <div className="space-y-5">
      <PortfolioHeader />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-4xl leading-none">
            Lo que mueve <em className="text-accent-ink">el mercado</em>
          </h2>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Noticias de Benzinga vía Alpaca, en inglés tal como se publicaron. Se renuevan cada 5 minutos.
          </p>
        </div>
        {positions.length > 0 && <HoldingChips positions={positions} active={symbol} onSymbol={setSymbol} />}
      </div>

      <TrendingBars active={symbol} onSymbol={setSymbol} />

      <div className="flex flex-wrap items-center gap-2.5">
        <Segmented label="Qué noticias ver">
          {NEWS_SCOPES.map(({ key, label }) => (
            <SegmentButton key={key} pressed={!symbol && !onlySaved && scope === key} onClick={() => setScope(key)}>
              {label}
            </SegmentButton>
          ))}
        </Segmented>
        <Button
          variant="outline"
          size="sm"
          aria-pressed={onlySaved}
          onClick={() => update({ guardadas: onlySaved ? undefined : '1' })}
          className={cn(onlySaved && 'border-accent-ink bg-accent')}
        >
          <Star aria-hidden="true" />
          Guardadas · {saved.saved.length}
        </Button>
        {symbol && (
          <span className="flex items-center gap-1.5 rounded-lg border border-accent-ink/50 bg-accent py-0.5 pr-1 pl-3 text-sm">
            Símbolo: <strong className="font-mono">{symbol}</strong>
            <button
              type="button"
              onClick={() => setSymbol(undefined)}
              aria-label="Quitar el filtro de símbolo"
              className="grid size-6 place-items-center rounded-md outline-none hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        )}
        {countLabel && <span className="ml-auto text-[12.5px] text-muted-foreground">{countLabel}</span>}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_25rem]">
        {!onlySaved && feed.error && !feedItems ? (
          <ErrorState error={feed.error} onRetry={feed.reload} title="No pudimos traer las noticias" />
        ) : (
          <NewsList
            items={items}
            selectedId={selected?.id}
            inline={!isWide}
            onSelect={select}
            isSaved={saved.isSaved}
            onToggleSave={saved.toggle}
            onSymbol={setSymbol}
            busy={!onlySaved && feed.isRefreshing}
            empty={
              <EmptyNews
                onlySaved={onlySaved}
                symbol={symbol}
                scope={scope}
                hasPositions={positions.length > 0}
                onReset={() => update({ alcance: 'market', simbolo: undefined, guardadas: undefined })}
              />
            }
            footer={
              !onlySaved &&
              feed.hasMore && (
                <div className="flex justify-center border-t p-3">
                  <Button variant="outline" size="sm" onClick={() => void feed.loadMore()} disabled={feed.isLoadingMore}>
                    {feed.isLoadingMore ? 'Cargando…' : 'Cargar más noticias'}
                  </Button>
                </div>
              )
            }
          />
        )}
        {isWide && (
          <NewsReader
            key={selected?.id}
            news={selected}
            heldIds={positions.map((position) => position.assetId)}
            saved={selected ? saved.isSaved(selected.id) : false}
            onToggleSave={saved.toggle}
            onTrade={trade}
          />
        )}
      </div>

      <OrderDialog
        target={target}
        onOpenChange={(open) => !open && setTarget(null)}
        onDone={() => {
          setTarget(null)
          portfolio.reload()
        }}
      />
    </div>
  )
}

interface EmptyNewsProps {
  onlySaved: boolean
  symbol: string | undefined
  scope: NewsScope | undefined
  hasPositions: boolean
  onReset(): void
}

function EmptyNews({ onlySaved, symbol, scope, hasPositions, onReset }: EmptyNewsProps) {
  let title = 'No hay noticias por ahora'
  let text = 'Vuelve en unos minutos: el mural se renueva cada 5.'
  if (onlySaved) {
    title = 'No tienes noticias guardadas aquí'
    text = 'Usa «Guardar» en una noticia para tenerla a mano. Las guardadas viven en este navegador.'
  } else if (symbol) {
    title = `Sin noticias recientes de ${symbol}`
    text = 'Ninguna nota reciente lo menciona.'
  } else if (scope === 'mine') {
    title = hasPositions ? 'Sin noticias de tus inversiones' : 'Todavía no tienes inversiones'
    text = hasPositions
      ? 'Ninguna nota reciente menciona lo que tienes: estás al día.'
      : 'Cuando compres una acción o una cripto, aquí vas a ver las noticias que la mencionan.'
  }

  return (
    <div className="px-7 py-12 text-center">
      <span aria-hidden="true" className="inline-grid size-12 place-items-center rounded-full bg-gain/15 text-gain">
        <Check className="size-5" />
      </span>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{text}</p>
      {(onlySaved || symbol || scope !== 'market') && (
        <Button variant="outline" size="sm" className="mt-3.5" onClick={onReset}>
          Ver todo el mercado
        </Button>
      )}
    </div>
  )
}
