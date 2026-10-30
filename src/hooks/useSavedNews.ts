import { useState } from 'react'
import type { NewsItem } from '@/types/news'

const KEY = 'cashout.savedNews'
const LIMIT = 50

// Se guarda la nota entera: el mural de Alpaca solo cubre los ultimos dias.
function read(): NewsItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as NewsItem[]) : []
  } catch {
    return []
  }
}

/** Las noticias que el usuario guarda para leer despues; viven en este navegador. */
export function useSavedNews() {
  const [saved, setSaved] = useState<NewsItem[]>(read)

  const toggle = (news: NewsItem) => {
    const next = saved.some((item) => item.id === news.id)
      ? saved.filter((item) => item.id !== news.id)
      : [news, ...saved].slice(0, LIMIT)
    setSaved(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // Modo privado o cuota llena: se pierde al recargar, nada mas.
    }
  }

  return { saved, isSaved: (id: number) => saved.some((item) => item.id === id), toggle }
}
