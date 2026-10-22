import { useState } from 'react'
import type { NewsItem } from '@/types/news'
import { cn } from '@/lib/utils'

// Los degradados de la marca para las notas sin foto (o cuya foto no carga).
const COVERS = [
  'linear-gradient(135deg, #3f4058 0%, #87708a 55%, #c9b6c8 100%)',
  'linear-gradient(135deg, #2f3328 0%, #7d7f62 60%, #c8caae 100%)',
  'linear-gradient(135deg, #1d1d2d 0%, #3f4058 60%, #6b6f93 100%)',
  'linear-gradient(135deg, #3a1f2c 0%, #8f4a63 60%, #e0a8a0 100%)',
]

/** La foto de la nota, o un degradado con el simbolo que menciona. */
export function NewsCover({
  news,
  className,
  textClassName,
}: {
  news: NewsItem
  className?: string
  textClassName?: string
}) {
  const [failed, setFailed] = useState(false)
  const label = news.assets[0]?.symbol.replace('-USD', '') ?? 'NEWS'

  if (news.imageUrl && !failed) {
    return (
      <img
        src={news.imageUrl}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn('object-cover', className)}
      />
    )
  }
  return (
    <div
      aria-hidden="true"
      className={cn('relative overflow-hidden', className)}
      style={{ background: COVERS[news.id % COVERS.length] }}
    >
      <span className={cn('absolute right-3 bottom-1 font-mono font-medium text-white/15', textClassName)}>{label}</span>
    </div>
  )
}
