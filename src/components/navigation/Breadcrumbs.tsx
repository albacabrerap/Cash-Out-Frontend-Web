import { Fragment } from 'react'
import { Link, useMatches, type UIMatch } from 'react-router'
import type { RouteHandle } from '@/routes/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

/** Con un solo nivel no se muestra: repetiria el titulo de la pagina. */
export function Breadcrumbs() {
  const crumbs = (useMatches() as UIMatch<unknown, RouteHandle | undefined>[]).filter(
    (match) => match.handle?.crumb,
  )

  if (crumbs.length < 2) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((match, index) => {
          const isLast = index === crumbs.length - 1
          return (
            <Fragment key={match.id}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{match.handle?.crumb}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={match.pathname}>{match.handle?.crumb}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
