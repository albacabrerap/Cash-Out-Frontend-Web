import { ChevronDown } from 'lucide-react'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

const QUESTIONS = [
  {
    question: '¿Invierto dinero real?',
    answer:
      'No. En el mercado inviertes fichas, la moneda de Cash-Out. Los precios son reales, pero lo que ganas o pierdes son fichas.',
  },
  {
    question: '¿Cómo consigo fichas?',
    answer: 'Cumpliendo tus metas de ahorro y jugando los minijuegos. Algunos juegos son gratis y otros cuestan unas fichas.',
  },
  {
    question: '¿De dónde salen los precios de las acciones?',
    answer:
      'Del mercado de EE. UU., a través de Alpaca. Mientras miras una acción, el precio se actualiza cada 15 segundos.',
  },
  {
    question: '¿Cómo calcula la proyección de ahorro?',
    answer:
      'Convierte la TEA a una tasa mensual efectiva, (1 + TEA)^(1/12) − 1, y compara mes a mes el interés simple con el compuesto.',
  },
  {
    question: '¿Cuánto cuesta?',
    answer: 'Nada. Cash-Out es un proyecto académico de educación financiera.',
  },
]

export function FaqSection() {
  return (
    <section aria-labelledby="faq-titulo" className="border-t">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 lg:grid-cols-[2fr_3fr]">
        <SectionHeading
          id="faq-titulo"
          align="start"
          title="Preguntas"
          accent="frecuentes"
          description="Lo que más nos preguntan antes de crear una cuenta."
        />
        <div className="divide-y border-y">
          {QUESTIONS.map(({ question, answer }, i) => (
            <Reveal key={question} delay={i * 80}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  {question}
                  <ChevronDown
                    className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="pb-5 text-pretty text-muted-foreground">{answer}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
