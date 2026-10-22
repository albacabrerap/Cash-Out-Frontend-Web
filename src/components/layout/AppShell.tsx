import { Outlet } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { homePathFor } from '@/routes/navigation'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { NavigationProgress } from '@/components/navigation/NavigationProgress'
import { Logo } from './Logo'
import { MainNav, MobileNav } from './MainNav'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

export function AppShell() {
  const { user } = useAuth()
  const homePath = homePathFor(user)

  return (
    <div className="min-h-svh bg-background">
      <NavigationProgress />
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-4">
          <MobileNav homePath={homePath} />
          <Logo to={homePath} />
          <MainNav className="hidden md:block" />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <main id="contenido" tabIndex={-1} className="mx-auto max-w-6xl space-y-6 px-4 py-6 outline-none sm:py-8">
        <Breadcrumbs />
        <Outlet />
      </main>
    </div>
  )
}
