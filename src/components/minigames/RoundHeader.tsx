import { Progress } from '@/components/ui/progress'

interface RoundHeaderProps {
  /** "Pregunta", "Situación", "Ronda". */
  unit: string
  index: number
  total: number
  answered: boolean
  correct: number
}

export function RoundHeader({ unit, index, total, answered, correct }: RoundHeaderProps) {
  const done = index + (answered ? 1 : 0)
  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {unit} {index + 1} de {total}
        </span>
        <span className="tabular-nums">
          {correct} {correct === 1 ? 'acierto' : 'aciertos'}
        </span>
      </div>
      <Progress value={(done / total) * 100} aria-label="Avance de la partida" aria-valuetext={`${done} de ${total}`} />
    </div>
  )
}
