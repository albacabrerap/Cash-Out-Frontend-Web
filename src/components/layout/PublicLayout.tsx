import { Link, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { homePathFor } from '@/routes/navigation'
import { NavigationProgress } from '@/components/navigation/NavigationProgress'
import { Button } from '@/components/ui/button'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

export function PublicLayout() {
  const { status, user } = useAuth()
  const { pathname } = useLocation()
  // En el registro la barra solo lleva el logo: el enlace para iniciar sesion va sobre la tarjeta.
  const logoOnly = pathname === '/registro'

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <NavigationProgress />
      <header className="sticky top-0 z-40 h-14 border-b border-foreground/10 bg-background/60 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-full max-w-6xl items-center gap-2 px-4">
          <Logo />
          {!logoOnly && (
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              {status === 'authenticated' ? (
                <Button asChild size="sm">
                  <Link to={homePathFor(user)}>Ir a mi resumen</Link>
                </Button>
              ) : (
                <>
                  {pathname !== '/login' && (
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/login">Iniciar sesión</Link>
                    </Button>
                  )}
                  <Button asChild size="sm">
                    <Link to="/registro">Crear cuenta</Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </header>
      <main id="contenido" className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Cash-Out · Proyecto académico de educación financiera. Las inversiones son simuladas con fichas, no con
        dinero real.
      </footer>
    </div>
  )
}
