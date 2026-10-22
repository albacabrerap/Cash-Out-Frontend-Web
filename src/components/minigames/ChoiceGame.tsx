import { useEffect, useRef, useState } from 'react'
import { CircleCheck, CircleX } from 'lucide-react'
import type { ChoiceQuestion } from '@/games/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { RoundFeedback } from './RoundFeedback'
import { RoundHeader } from './RoundHeader'

interface ChoiceGameProps {
  questions: ChoiceQuestion[]
  /** "Pregunta" en una trivia, "Situación" en el quiz. */
  unit: string
  onFinish: (correct: number) => void
}

/** Trivia y quiz: una pregunta a la vez, con la explicacion apenas se responde. */
export function ChoiceGame({ questions, unit, onFinish }: ChoiceGameProps) {
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const question = questions[index]
  const answered = picked !== null
  const last = index === questions.length - 1

  useEffect(() => headingRef.current?.focus(), [index])
  // El boton elegido queda deshabilitado y perderia el foco: pasa a "Siguiente".
  useEffect(() => {
    if (answered) nextRef.current?.focus()
  }, [answered])

  const pick = (option: number) => {
    setPicked(option)
    if (option === question.answer) setCorrect((count) => count + 1)
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
      <RoundHeader unit={unit} index={index} total={questions.length} answered={answered} correct={correct} />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 ref={headingRef} tabIndex={-1} className="text-lg leading-snug outline-none">
              {question.prompt}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className={cn('grid gap-2', question.options.length > 2 ? 'sm:grid-cols-2' : 'grid-cols-2')}>
            {question.options.map((option, i) => {
              const isAnswer = i === question.answer
              const isPicked = i === picked
              return (
                <li key={option}>
                  <Button
                    variant="outline"
                    disabled={answered}
                    onClick={() => pick(i)}
                    className={cn(
                      'h-auto min-h-11 w-full justify-start py-2.5 text-left whitespace-normal',
                      answered && isAnswer && 'border-gain bg-gain/10 disabled:opacity-100 dark:border-gain dark:bg-gain/10',
                      answered &&
                        isPicked &&
                        !isAnswer &&
                        'border-loss bg-loss/10 disabled:opacity-100 dark:border-loss dark:bg-loss/10',
                    )}
                  >
                    <span className="flex-1">{option}</span>
                    {answered && isAnswer && (
                      <span className="flex items-center gap-1 text-xs font-medium text-gain">
                        <CircleCheck aria-hidden="true" />
                        Correcta
                      </span>
                    )}
                    {answered && isPicked && !isAnswer && (
                      <span className="flex items-center gap-1 text-xs font-medium text-loss">
                        <CircleX aria-hidden="true" />
                        Tu respuesta
                      </span>
                    )}
                  </Button>
                </li>
              )
            })}
          </ul>

          <RoundFeedback
            result={
              answered
                ? {
                    right: picked === question.answer,
                    verdict:
                      picked === question.answer
                        ? '¡Correcto!'
                        : `No era esa. La respuesta es «${question.options[question.answer]}».`,
                    explanation: question.explanation,
                  }
                : null
            }
            nextLabel={last ? 'Ver resultado' : `Siguiente ${unit.toLowerCase()}`}
            nextRef={nextRef}
            onNext={next}
          />
        </CardContent>
      </Card>
    </div>
  )
}
