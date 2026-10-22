import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { Loader2, RefreshCw, RotateCcw } from 'lucide-react'
import { userMessage, type ApiError } from '@/api/errors'
import { formatTokens } from '@/lib/format'
import { formatSignedTokens } from '@/lib/market'
import type { MinigameSession } from '@/types/minigames'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { GameFact } from './GameFact'

export type SaveState =
  | { status: 'saving' }
  | { status: 'saved'; session: MinigameSession }
  | { status: 'error'; error: ApiError }

interface GameResultProps {
  correct: number
  total: number
  score: number
  save: SaveState
  /** Saldo ya actualizado; undefined mientras se vuelve a pedir. */
  balance: number | undefined
  onRetry: () => void
  onPlayAgain: () => void
}

function verdict(score: number): string {
  if (score >= 90) return '¡Excelente!'
  if (score >= 60) return 'Bien jugado.'
  return 'Puedes volver a intentarlo cuando quieras.'
}

export function GameResult({ correct, total, score, save, balance, onRetry, onPlayAgain }: GameResultProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 ref={headingRef} tabIndex={-1} className="text-xl outline-none">
            Tu puntaje: {score} de 100
          </h2>
        </CardTitle>
        <CardDescription>
          Acertaste {correct} de {total}. {verdict(score)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {save.status === 'saving' && (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Registrando tu partida…
          </p>
        )}
        {save.status === 'error' && (
          <Alert variant="destructive">
            <AlertTitle>No pudimos registrar tu partida</AlertTitle>
            <AlertDescription>{userMessage(save.error)}</AlertDescription>
          </Alert>
        )}
        {save.status === 'saved' && <SessionTokens session={save.session} balance={balance} />}
      </CardContent>
      <CardFooter className="flex-wrap gap-2">
        {save.status === 'error' && save.error.retryable && (
          <Button onClick={onRetry}>
            <RefreshCw aria-hidden="true" />
            Reintentar
          </Button>
        )}
        <Button variant={save.status === 'saved' ? 'default' : 'outline'} onClick={onPlayAgain} disabled={save.status === 'saving'}>
          <RotateCcw aria-hidden="true" />
          Jugar otra vez
        </Button>
        <Button asChild variant="outline">
          <Link to="/minijuegos">Ver todos los juegos</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

function SessionTokens({ session, balance }: { session: MinigameSession; balance: number | undefined }) {
  const net = session.tokensEarned - session.tokensSpent
  return (
    <>
      <dl className="grid gap-3 sm:grid-cols-3">
        <GameFact
          label="Costo de la partida"
          value={session.tokensSpent === 0 ? 'Gratis' : formatSignedTokens(-session.tokensSpent)}
          tone={session.tokensSpent > 0 ? 'loss' : undefined}
        />
        <GameFact label="Ganaste" value={formatSignedTokens(session.tokensEarned)} tone={session.tokensEarned > 0 ? 'gain' : undefined} />
        <GameFact label="Resultado" value={formatSignedTokens(net)} tone={net > 0 ? 'gain' : net < 0 ? 'loss' : undefined} />
      </dl>
      {balance !== undefined && <p className="text-sm text-muted-foreground">Ahora tienes {formatTokens(balance)}.</p>}
    </>
  )
}
