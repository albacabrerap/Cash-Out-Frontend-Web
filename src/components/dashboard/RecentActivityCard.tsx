import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowDownLeft, ArrowRight, Plus, ReceiptText } from 'lucide-react'
import type { ApiQuery } from '@/hooks/useApiQuery'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { CATEGORY_META } from '@/lib/categories'
import { formatDate, formatSoles } from '@/lib/format'
import type { PageResponse } from '@/types/api'
import type { Movement } from '@/types/movements'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const ROW = 49
const UNFOLD_MS = 900

/** Los ultimos movimientos, apilados como notificaciones que se despliegan al cargar. */
export function RecentActivityCard({ movements }: { movements: ApiQuery<PageResponse<Movement>> }) {
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false)
  const items = movements.data?.content.slice(0, 5)

  useEffect(() => {
    if (!items?.length) return
    const timer = setTimeout(() => setOpen(true), reduced ? 0 : UNFOLD_MS)
    return () => clearTimeout(timer)
  }, [items?.length, reduced])

  return (
    <section aria-labelledby="resumen-actividad" className="flex min-h-80 flex-col rounded-2xl border bg-card p-5 pb-0">
      <div className="flex items-baseline justify-between">
        <h2 id="resumen-actividad" className="text-sm font-medium text-muted-foreground">
          Actividad reciente
        </h2>
        {items && items.length > 0 && (
          <Link to="/movimientos/todos" className="flex items-center gap-1 text-[13px] font-medium whitespace-nowrap underline-offset-4 hover:underline">
            Ver movimientos
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="relative mt-3.5 flex-1 pb-5">
        {movements.error && !items ? (
          <p className="pt-6 text-center text-sm text-muted-foreground">No pudimos cargar tus movimientos.</p>
        ) : !items ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2.5 text-center">
            <span aria-hidden="true" className="grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
              <ReceiptText className="size-5" />
            </span>
            <strong className="text-sm font-semibold">Aún no hay movimientos</strong>
            <span className="max-w-60 text-[13px] text-muted-foreground">
              Tus ingresos y gastos van a aparecer aquí.
            </span>
            <Button asChild size="sm" className="mt-1">
              <Link to="/movimientos/ingresos?nuevo=1">
                <Plus aria-hidden="true" />
                Registrar mi primer ingreso
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="relative" style={{ height: items.length * ROW }}>
            {items.map((item, i) => (
              <ActivityRow key={`${item.kind}-${item.id}`} item={item} index={i} open={open} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function ActivityRow({ item, index, open }: { item: Movement; index: number; open: boolean }) {
  const income = item.kind === 'INCOME'
  const category = item.category ? CATEGORY_META[item.category] : undefined
  const Icon = income ? ArrowDownLeft : (category?.icon ?? ReceiptText)
  const title = item.label || (income ? 'Ingreso' : (category?.label ?? 'Gasto'))
  const meta = [income ? 'Ingreso' : category?.label, formatDate(item.date)].filter(Boolean).join(' · ')

  return (
    <li
      className="absolute inset-x-0 top-0 flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2 shadow-sm transition-[transform,opacity] duration-300 ease-out"
      style={{
        zIndex: 10 - index,
        transform: open ? `translateY(${index * ROW}px)` : `translateY(${index * 9}px) scale(${1 - index * 0.05})`,
        opacity: open ? 1 : index < 3 ? 1 - index * 0.28 : 0,
      }}
    >
      <span
        aria-hidden="true"
        className={income ? 'grid size-7 flex-none place-items-center rounded-lg bg-gain/15 text-gain' : 'grid size-7 flex-none place-items-center rounded-lg bg-muted text-muted-foreground'}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <strong className="truncate text-[13px] font-semibold">{title}</strong>
        <span className="truncate text-[11.5px] text-muted-foreground">{meta}</span>
      </span>
      <span className={income ? 'font-mono text-xs font-medium whitespace-nowrap text-income tabular-nums' : 'font-mono text-xs font-medium whitespace-nowrap tabular-nums'}>
        {income ? '+' : '−'}
        {formatSoles(item.amount)}
      </span>
    </li>
  )
}
