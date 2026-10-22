import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Check } from 'lucide-react'
import { formatSoles } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

const CAPITAL = 1000
const TEA = 0.1

// Mismo capital y tasa en las tres filas: lo unico que cambia es como crece.
const GROWTH = [
  { label: 'Interés compuesto', at: (years: number) => CAPITAL * (1 + TEA) ** years, highlight: true },
  { label: 'Interés simple', at: (years: number) => CAPITAL * (1 + TEA * years), highlight: false },
  { label: 'Bajo el colchón', at: () => CAPITAL, highlight: false },
]

const GOAL_DEPOSITS = [18, 26, 30, 28, 38, 44, 47, 56, 61, 64]

interface FeatureCardProps {
  preview: ReactNode
  title: string
  text: string
  linkLabel: string
  delay: number
}

function FeatureCard({ preview, title, text, linkLabel, delay }: FeatureCardProps) {
  return (
    <Reveal as="li" delay={delay} className="flex flex-col overflow-hidden rounded-2xl border bg-card">
      <div aria-hidden="true" className="flex min-h-56 items-center justify-center border-b bg-muted/40 px-6 py-8">
        {preview}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="font-display text-2xl tracking-tight">{title}</h3>
        <p className="text-sm text-pretty text-muted-foreground">{text}</p>
        <Link
          to="/registro"
          className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-medium underline-offset-4 hover:underline"
        >
          {linkLabel}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </Reveal>
  )
}

function GrowthTable() {
  return (
    <table className="w-full max-w-xs text-sm">
      <thead>
        <tr className="text-xs text-muted-foreground">
          <th className="pb-2 text-left font-normal">S/ 1,000 al 10 % TEA</th>
          <th className="pb-2 text-right font-normal">5 años</th>
          <th className="pb-2 text-right font-normal">10 años</th>
        </tr>
      </thead>
      <tbody>
        {GROWTH.map((row) => (
          <tr key={row.label} className="border-t">
            <td className={cn('py-2.5', row.highlight ? 'font-medium' : 'text-muted-foreground')}>{row.label}</td>
            <td className={cn('py-2.5 text-right tabular-nums', row.highlight && 'font-medium text-gain')}>
              {formatSoles(row.at(5))}
            </td>
            <td className={cn('py-2.5 text-right tabular-nums', row.highlight && 'font-medium text-gain')}>
              {formatSoles(row.at(10))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function GoalBars() {
  return (
    <div className="w-full max-w-xs space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Meta: Laptop</p>
          <p className="font-display text-3xl">64 %</p>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">S/ 1,920 de S/ 3,000</p>
      </div>
      <div className="flex h-24 items-end gap-1.5">
        {GOAL_DEPOSITS.map((height, i) => (
          <span
            key={i}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/50 to-primary"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <span className="block h-full w-[64%] rounded-full bg-gain" />
      </div>
    </div>
  )
}

function QuizCard() {
  return (
    <div className="w-full max-w-xs space-y-4 rounded-xl border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Situación 3 de 10</span>
        <span className="rounded-full bg-gain/10 px-2 py-0.5 font-medium text-gain">+35 fichas</span>
      </div>
      <p className="text-sm font-medium">Comprar una acción solo porque subió 30 % ayer.</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <span className="flex items-center justify-center gap-1.5 rounded-lg border border-gain bg-gain/10 py-2 font-medium">
          <Check className="size-4 text-gain" />
          Apuesta
        </span>
        <span className="flex items-center justify-center rounded-lg border py-2 text-muted-foreground">Inversión</span>
      </div>
    </div>
  )
}

export function FeatureShowcase() {
  return (
    <section aria-labelledby="funciones-titulo" className="mx-auto w-full max-w-6xl space-y-12 px-4 py-24">
      <SectionHeading
        id="funciones-titulo"
        title="Una forma nueva de"
        accent="aprender de finanzas"
        description="Todo lo que aprendes lo usas con tus propios números: tu ahorro, tus metas y un mercado de práctica."
      />
      <ul className="grid gap-5 lg:grid-cols-3">
        <FeatureCard
          preview={<GrowthTable />}
          title="Mira cómo crece tu ahorro."
          text="La proyección convierte la TEA a tasa mensual y compara interés simple con compuesto, para que veas la diferencia con tus montos."
          linkLabel="Probar la proyección"
          delay={0}
        />
        <FeatureCard
          preview={<GoalBars />}
          title="Ahorra con un objetivo."
          text="Crea metas con fecha límite, aparta dinero para cada una y gana fichas cuando las cumples."
          linkLabel="Crear mi primera meta"
          delay={120}
        />
        <FeatureCard
          preview={<QuizCard />}
          title="Gana fichas jugando."
          text="Trivias, quizzes y un simulador de préstamos que te enseñan y te pagan en fichas para invertir."
          linkLabel="Ver los minijuegos"
          delay={240}
        />
      </ul>
    </section>
  )
}
