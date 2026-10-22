import { Link } from 'react-router'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Calculator, ChartPie, TrendingUp } from 'lucide-react'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

const POINTS = [
  { icon: ChartPie, text: 'Ve en qué se va cada sol, por categoría.' },
  { icon: TrendingUp, text: 'Compara tus ingresos y gastos mes a mes.' },
  { icon: Calculator, text: 'Proyecta tu ahorro con la TEA real de tu banco.' },
]

// Solo ilustra la pantalla de Resumen; no son datos de nadie.
function PhonePreview() {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-sm rounded-[2.25rem] border bg-muted/40 p-3 shadow-xl">
      <div className="space-y-5 rounded-[1.75rem] border bg-background p-6">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Ahorro total</p>
          <p className="font-display text-4xl tabular-nums">S/ 1,906.02</p>
          <p className="text-sm font-medium text-gain">+S/ 706.02 este mes</p>
        </div>
        <svg viewBox="0 0 240 70" className="h-20 w-full">
          <path
            d="M0 62 C 30 60 40 52 60 54 S 95 40 115 44 S 150 22 170 26 S 205 10 240 6"
            fill="none"
            stroke="var(--gain)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-income/10 text-income">
              <ArrowDownRight className="size-4" />
            </span>
            <span className="flex-1">
              <span className="block font-medium">Beca</span>
              <span className="text-xs text-muted-foreground">Ingreso · hoy</span>
            </span>
            <span className="font-medium text-income tabular-nums">+S/ 800.00</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-expense/10 text-expense">
              <ArrowUpRight className="size-4" />
            </span>
            <span className="flex-1">
              <span className="block font-medium">Supermercado</span>
              <span className="text-xs text-muted-foreground">Comida · ayer</span>
            </span>
            <span className="font-medium text-expense tabular-nums">−S/ 34.81</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export function InsightsSection() {
  return (
    <section aria-labelledby="datos-titulo" className="border-y bg-muted/30">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-24 lg:grid-cols-2">
        <div className="space-y-8">
          <SectionHeading
            id="datos-titulo"
            align="start"
            title="Toma decisiones"
            accent="con tus propios datos"
            description="Tu resumen junta ahorro, metas, fichas y el flujo de cada mes en una sola pantalla."
          />
          <ul className="space-y-4">
            {POINTS.map(({ icon: Icon, text }, i) => (
              <Reveal as="li" key={text} delay={i * 100} className="flex items-center gap-3">
                <Icon className="size-5 text-accent-ink" aria-hidden="true" />
                <span>{text}</span>
              </Reveal>
            ))}
          </ul>
          <Reveal delay={300}>
            <Link to="/registro" className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline">
              Empezar a registrar
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
        <Reveal delay={150}>
          <PhonePreview />
        </Reveal>
      </div>
    </section>
  )
}
