import { Outlet, ScrollRestoration, useMatches, type UIMatch } from 'react-router'
import type { RouteHandle } from '@/routes/navigation'

/** React 19 sube el <title> al <head> por su cuenta. */
export function RootLayout() {
  const matches = useMatches() as UIMatch<unknown, RouteHandle | undefined>[]
  const title = matches.findLast((match) => match.handle?.title)?.handle?.title

  return (
    <>
      <title>{title ? `${title} · Cash-Out` : 'Cash-Out'}</title>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}
