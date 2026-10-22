import { useEffect, useRef, useState } from 'react'
import type { LoanRound } from '@/games/types'
import { formatSoles } from '@/lib/format'
import { installment, loanTotal, type LoanOffer } from '@/lib/loans'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { RoundFeedback } from './RoundFeedback'
import { RoundHeader } from './RoundHeader'

const percent = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 })
const LETTERS = 'ABCDEFGH'

function extrasText(offer: LoanOffer): string {
  const parts = [
    offer.fee > 0 && `comisión de ${formatSoles(offer.fee)}`,
    offer.monthlyInsurance > 0 && `seguro de ${formatSoles(offer.monthlyInsurance)} al mes`,
  ].filter(Boolean)
  return parts.length === 0 ? 'Sin costos extra' : parts.join(' y ').replace(/^./, (c) => c.toUpperCase())
}

/** Cada ronda: tres ofertas para la misma necesidad; gana quien elige la que cuesta menos en total. */
export function LoanGame({ rounds, onFinish }: { rounds: LoanRound[]; onFinish: (correct: number) => void }) {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const round = rounds[index]
  const totals = round.offers.map((offer) => loanTotal(round.principal, offer))
  const cheapest = totals.indexOf(Math.min(...totals))
  const answered = picked !== null
  const last = index === rounds.length - 1

  useEffect(() => headingRef.current?.focus(), [index])
  useEffect(() => {
    if (answered) nextRef.current?.focus()
  }, [answered])

  const pick = (offer: number) => {
    setPicked(offer)
    if (offer === cheapest) setCorrect((count) => count + 1)
  }

  const next = () => {
    if (last) {
      onFinish(correct)
      return
    }
    setIndex(index + 1)
    setPicked(null)
  }

  return (
    <div className="space-y-4">
      <RoundHeader unit="Ronda" index={index} total={rounds.length} answered={answered} correct={correct} />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 ref={headingRef} tabIndex={-1} className="text-lg leading-snug outline-none">
              Necesitas {formatSoles(round.principal)} para {round.need}. ¿Qué préstamo te cuesta menos?
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="grid gap-3 md:grid-cols-3">
            {round.offers.map((offer, i) => {
              const letter = LETTERS[i]
              const total = totals[i]
              return (
                <li
                  key={offer.lender}
                  className={cn(
                    'flex flex-col gap-3 rounded-xl border bg-card p-4',
                    answered && i === cheapest && 'border-gain bg-gain/5',
                    answered && i === picked && i !== cheapest && 'border-loss bg-loss/5',
                  )}
                >
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Oferta {letter}</p>
                    <h3 className="font-medium">{offer.lender}</h3>
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">TEA</dt>
                    <dd className="text-right tabular-nums">{percent.format(offer.tea * 100)} %</dd>
                    <dt className="text-muted-foreground">Plazo</dt>
                    <dd className="text-right tabular-nums">{offer.months} meses</dd>
                    <dt className="text-muted-foreground">Cuota</dt>
                    <dd className="text-right font-medium tabular-nums">
                      {formatSoles(installment(round.principal, offer.tea, offer.months))}
                    </dd>
                  </dl>
                  <p className="text-sm text-muted-foreground">{extrasText(offer)}</p>

                  {answered ? (
                    <div className="mt-auto space-y-1 border-t pt-3">
                      <p className="text-xs text-muted-foreground">Total a pagar</p>
                      <p className="text-lg font-semibold tabular-nums">{formatSoles(total)}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatSoles(total - round.principal)} en intereses y costos
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {i === cheapest && (
                          <Badge variant="outline" className="border-gain/40 text-gain">
                            La más barata
                          </Badge>
                        )}
                        {i === picked && <Badge variant="outline">Tu elección</Badge>}
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" className="mt-auto" onClick={() => pick(i)}>
                      Elegir la oferta {letter}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>

          <RoundFeedback
            result={
              answered
                ? {
                    right: picked === cheapest,
                    verdict:
                      picked === cheapest
                        ? '¡Bien elegido! Es la que menos te cuesta.'
                        : `La más barata era la oferta ${LETTERS[cheapest]}: te ahorraba ${formatSoles(totals[picked] - totals[cheapest])}.`,
                    explanation: round.explanation,
                  }
                : null
            }
            nextLabel={last ? 'Ver resultado' : 'Siguiente ronda'}
            nextRef={nextRef}
            onNext={next}
          />
        </CardContent>
      </Card>
    </div>
  )
}
