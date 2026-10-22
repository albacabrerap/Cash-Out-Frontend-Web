import { Link } from 'react-router'
import { ArrowRight, ChartColumn, Landmark, ShieldCheck, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

const PILLARS = [
  { icon: Landmark, label: 'Precios reales del mercado' },
  { icon: ShieldCheck, label: 'Fichas, nunca dinero real' },
  { icon: Target, label: 'Metas con recompensa' },
  { icon: ChartColumn, label: 'Proyecciones con TEA real' },
]

// Solo hechos de la app tal como funciona hoy: nada de usuarios ni volumenes inventados.
const FACTS = [
  { value: '13,500+', label: 'acciones de EE. UU. para practicar' },
  { value: '15 s', label: 'entre actualizaciones de precio' },
  { value: 'S/ 0', label: 'de dinero real en riesgo' },
  { value: '100 %', label: 'gratis para estudiantes' },
]

export function WhySection() {
  return (
    <section aria-labelledby="por-que-titulo" className="mx-auto w-full max-w-6xl space-y-16 px-4 py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="space-y-8">
          <Reveal as="p" className="text-sm font-medium text-accent-ink">
            ¿Por qué Cash-Out?
          </Reveal>
          <SectionHeading
            id="por-que-titulo"
            align="start"
            title="Educación financiera"
            accent="con práctica real"
            description="Leer sobre inversiones no es lo mismo que hacerlo. Aquí practicas con el mercado de verdad y sin consecuencias."
          />
          <Reveal delay={300}>
            <Button asChild size="lg" className="h-11 rounded-full px-6">
              <Link to="/registro">
                Abrir mi cuenta
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </Reveal>
        </div>
        <ul className="grid grid-cols-2 gap-4">
          {PILLARS.map(({ icon: Icon, label }, i) => (
            <Reveal
              as="li"
              key={label}
              delay={i * 100}
              className="flex aspect-square flex-col items-center justify-center gap-4 rounded-2xl border bg-card p-4 text-center"
            >
              <Icon className="size-8 stroke-[1.4] text-accent-ink" aria-hidden="true" />
              <span className="text-sm font-medium">{label}</span>
            </Reveal>
          ))}
        </ul>
      </div>
      <dl className="grid grid-cols-2 gap-8 border-t pt-12 lg:grid-cols-4">
        {FACTS.map((fact, i) => (
          <Reveal key={fact.label} delay={i * 100} className="space-y-1">
            <dt className="sr-only">{fact.label}</dt>
            <dd className="font-display text-5xl tracking-tight">{fact.value}</dd>
            <dd className="text-sm text-muted-foreground">{fact.label}</dd>
          </Reveal>
        ))}
      </dl>
    </section>
  )
}
