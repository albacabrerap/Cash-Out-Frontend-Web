import type { ReactNode, Ref } from 'react'
import { ArrowRight, CircleCheck, CircleX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RoundFeedbackProps {
  /** null mientras no se responde: la region ya existe y el lector de pantalla anuncia lo que aparezca. */
  result: { right: boolean; verdict: ReactNode; explanation: string } | null
  nextLabel: string
  nextRef: Ref<HTMLButtonElement>
  onNext: () => void
}

export function RoundFeedback({ result, nextLabel, nextRef, onNext }: RoundFeedbackProps) {
  return (
    <>
      <div aria-live="polite">
        {result && (
          <div
            className={cn(
              'flex gap-3 rounded-lg border p-4',
              result.right ? 'border-gain/40 bg-gain/5' : 'border-loss/40 bg-loss/5',
            )}
          >
            {result.right ? (
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-gain" aria-hidden="true" />
            ) : (
              <CircleX className="mt-0.5 size-5 shrink-0 text-loss" aria-hidden="true" />
            )}
            <div className="space-y-1">
              <p className="font-medium">{result.verdict}</p>
              <p className="text-sm text-muted-foreground">{result.explanation}</p>
            </div>
          </div>
        )}
      </div>
      {result && (
        <div className="flex justify-end">
          <Button ref={nextRef} onClick={onNext}>
            {nextLabel}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </>
  )
}
