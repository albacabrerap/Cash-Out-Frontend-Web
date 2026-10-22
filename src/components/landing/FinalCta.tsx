import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { homePathFor } from '@/routes/navigation'
import { Button } from '@/components/ui/button'
import { Reveal } from './Reveal'

export function FinalCta() {
  const { status, user } = useAuth()
  const signedIn = status === 'authenticated'

  return (
    <section aria-labelledby="cta-titulo" className="mx-auto w-full max-w-6xl px-4 pb-24">
      <Reveal className="relative isolate overflow-hidden rounded-3xl border bg-card px-6 py-20 text-center">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_120%,color-mix(in_oklab,var(--mauve)_45%,transparent),transparent_70%)]"
        />
        <h2 id="cta-titulo" className="font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-6xl">
          Empieza tu camino financiero <em className="text-accent-ink">hoy mismo</em>
        </h2>
        <Button asChild size="lg" className="mt-8 h-11 rounded-full px-6">
          <Link to={signedIn ? homePathFor(user) : '/registro'}>
            {signedIn ? 'Ir a mi resumen' : 'Crear cuenta gratis'}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </Reveal>
    </section>
  )
}
