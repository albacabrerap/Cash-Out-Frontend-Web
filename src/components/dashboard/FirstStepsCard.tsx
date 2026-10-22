import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    title: 'Registra tu primer ingreso',
    text: 'Tu mesada, tu pago de prácticas o lo que recibas este mes.',
    cta: 'Registrar ingreso',
    to: '/movimientos/ingresos?nuevo=1',
  },
  {
    title: 'Crea una meta',
    text: 'Ponle nombre, monto y fecha: te decimos cuánto apartar al mes.',
    cta: 'Crear meta',
    to: '/metas?nuevo=1',
  },
  {
    title: 'Gana tus primeras fichas',
    text: 'Juega un minijuego o una carrera y empieza a invertir.',
    cta: 'Ir a minijuegos',
    to: '/minijuegos',
  },
] as const

/** Lo que ve una cuenta sin movimientos en lugar de Tu ahorro. */
export function FirstStepsCard() {
  return (
    <section aria-labelledby="resumen-pasos" className="rounded-2xl border bg-card p-6 lg:p-7">
      <p className="text-xs tracking-wider text-muted-foreground uppercase">Primeros pasos · 0 de 3</p>
      <h2 id="resumen-pasos" className="mt-3 font-display text-4xl leading-tight">
        Tu cuenta está <em className="text-accent-ink">lista</em>.
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">Tres pasos para empezar. Te toman menos de cinco minutos.</p>
      <ol className="relative mt-8 grid gap-6 md:grid-cols-3 md:gap-4">
        <span aria-hidden="true" className="absolute inset-x-5 top-4 hidden border-t border-dashed md:block" />
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative flex flex-col gap-2">
            <span
              className={cn(
                'grid size-8 place-items-center rounded-full border text-sm font-semibold',
                i === 0 ? 'bg-primary text-primary-foreground' : 'bg-card',
              )}
            >
              {i + 1}
            </span>
            <strong className="text-sm font-semibold">{step.title}</strong>
            <span className="text-sm text-muted-foreground">{step.text}</span>
            <Link
              to={step.to}
              className="flex items-center gap-1 text-sm font-medium text-accent-ink underline-offset-4 hover:underline"
            >
              {step.cta}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
