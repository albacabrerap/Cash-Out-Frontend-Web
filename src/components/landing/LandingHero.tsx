import { Link } from 'react-router'
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { homePathFor } from '@/routes/navigation'
import { Button } from '@/components/ui/button'
import { SILK_COLORS } from './palettes'
import { SilkWaves } from './SilkWaves'

export function LandingHero() {
  const { status, user } = useAuth()
  const { resolvedTheme } = useTheme()
  const signedIn = status === 'authenticated'

  // -mt-14 mete la seda bajo la barra de vidrio de PublicLayout.
  return (
    <section className="relative isolate -mt-14 overflow-hidden border-b pt-14">
      <SilkWaves
        colors={SILK_COLORS[resolvedTheme]}
        className="absolute inset-0 -z-10 size-full [mask-image:linear-gradient(to_bottom,black_80%,transparent)]"
      />
      {/* El velo radial protege el texto del hero en ambos temas. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(42%_40%_at_50%_45%,var(--background)_20%,transparent_100%)] opacity-80"
      />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-7 px-4 py-24 text-center sm:py-36">
        <p className="flex items-center gap-2 rounded-full border bg-background/70 px-3.5 py-1.5 text-xs font-medium backdrop-blur">
          <Sparkles className="size-3.5 text-accent-ink" aria-hidden="true" />
          Nuevo: acciones de EE. UU. con precios reales
        </p>
        <h1 className="max-w-3xl font-display text-5xl leading-[1.02] tracking-tight text-balance sm:text-7xl">
          Ahorra, planifica e invierte <em className="text-accent-ink">sin arriesgar tu dinero</em>
        </h1>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">
          Registra lo que entra y sale, ponle metas a tu ahorro y practica en el mercado con fichas. Equivocarte aquí
          no te cuesta nada.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {signedIn ? (
            <Button asChild size="lg" className="h-11 rounded-full px-6">
              <Link to={homePathFor(user)}>
                Ir a mi resumen
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="h-11 rounded-full px-6">
                <Link to="/registro">
                  Crear cuenta gratis
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 rounded-full bg-background/70 px-6 backdrop-blur">
                <Link to="/login">Ya tengo cuenta</Link>
              </Button>
            </>
          )}
        </div>
        <p className="flex items-center gap-2 rounded-full bg-background/70 px-3.5 py-1.5 text-sm text-muted-foreground backdrop-blur">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Inviertes con fichas: tu dinero real nunca está en juego.
        </p>
      </div>
    </section>
  )
}
