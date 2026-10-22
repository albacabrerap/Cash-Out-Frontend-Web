import { useState } from 'react'
import { Link, useBlocker, useParams } from 'react-router'
import { Construction, SearchX } from 'lucide-react'
import { ApiError, toApiError } from '@/api/errors'
import { useApiQuery } from '@/hooks/useApiQuery'
import { MINIGAME_TYPE_LABEL, packFor, prepareRun, runLength, scoreFor, type GameRun } from '@/lib/minigames'
import { parseId } from '@/lib/routeParams'
import { minigameService } from '@/services/minigameService'
import { walletService } from '@/services/walletService'
import type { Minigame } from '@/types/minigames'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageLoader } from '@/components/feedback/PageLoader'
import { PageHeader } from '@/components/layout/PageHeader'
import { ChoiceGame } from '@/components/minigames/ChoiceGame'
import { GameIntro } from '@/components/minigames/GameIntro'
import { GameResult, type SaveState } from '@/components/minigames/GameResult'
import { GameThumb } from '@/components/minigames/GameThumb'
import { LoanGame } from '@/components/minigames/LoanGame'
import { BackLink } from '@/components/navigation/BackLink'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Phase =
  | { name: 'intro' }
  | { name: 'playing'; run: GameRun }
  | { name: 'done'; correct: number; total: number; score: number }

function BackToGames() {
  return (
    <Button asChild variant="outline">
      <Link to="/minijuegos">Volver a minijuegos</Link>
    </Button>
  )
}

export default function MinigamePlayPage() {
  const id = parseId(useParams().id)
  const notFound = () => Promise.reject(new ApiError({ kind: 'http', status: 404 }))
  const game = useApiQuery(['minigame', id], (signal) => (id ? minigameService.get(id, signal) : notFound()))
  const wallet = useApiQuery(['wallet'], (signal) => walletService.get(signal))
  const [phase, setPhase] = useState<Phase>({ name: 'intro' })
  const [save, setSave] = useState<SaveState>({ status: 'saving' })

  // La partida se registra recien al terminar: salir a la mitad no cobra, pero se pierde lo jugado.
  const blocker = useBlocker(phase.name === 'playing')

  if (game.error?.status === 404) {
    return (
      <EmptyState
        icon={SearchX}
        title="No encontramos este juego"
        description="Puede que ya no esté publicado o que el enlace no sea correcto."
        action={<BackToGames />}
      />
    )
  }
  if (game.error && !game.data) {
    return <ErrorState error={game.error} onRetry={game.reload} title="No pudimos cargar el juego" />
  }
  if (!game.data) return <PageLoader label="Cargando el juego…" />

  const data = game.data
  const pack = packFor(data)
  if (!pack) {
    return (
      <EmptyState
        icon={Construction}
        title="Este juego todavía no se puede jugar en la web"
        description="Ya está en el catálogo, pero su contenido aún no llega a esta versión."
        action={<BackToGames />}
      />
    )
  }

  const register = async (target: Minigame, score: number) => {
    setSave({ status: 'saving' })
    try {
      const session = await minigameService.play({ minigameId: target.id, score })
      setSave({ status: 'saved', session })
      wallet.reload()
    } catch (err) {
      setSave({ status: 'error', error: toApiError(err) })
    }
  }

  const finish = (run: GameRun, correct: number) => {
    const total = runLength(run)
    const score = scoreFor(correct, total)
    setPhase({ name: 'done', correct, total, score })
    void register(data, score)
  }

  return (
    <>
      <BackLink to="/minijuegos">Volver a minijuegos</BackLink>
      <div className="flex items-start gap-4">
        <GameThumb id={data.id} title={data.title} className="mt-1" />
        <div className="min-w-0 flex-1">
          <PageHeader
            title={data.title}
            description={pack.description}
            actions={<Badge variant="outline">{MINIGAME_TYPE_LABEL[data.type]}</Badge>}
          />
        </div>
      </div>

      {phase.name === 'intro' && (
        <GameIntro game={data} pack={pack} wallet={wallet} onStart={() => setPhase({ name: 'playing', run: prepareRun(pack) })} />
      )}

      {phase.name === 'playing' &&
        (phase.run.type === 'SIMULATION' ? (
          <LoanGame rounds={phase.run.rounds} onFinish={(correct) => finish(phase.run, correct)} />
        ) : (
          <ChoiceGame
            questions={phase.run.questions}
            unit={phase.run.type === 'QUIZ' ? 'Situación' : 'Pregunta'}
            onFinish={(correct) => finish(phase.run, correct)}
          />
        ))}

      {phase.name === 'done' && (
        <GameResult
          correct={phase.correct}
          total={phase.total}
          score={phase.score}
          save={save}
          balance={wallet.isRefreshing ? undefined : wallet.data?.tokenBalance}
          onRetry={() => void register(data, phase.score)}
          onPlayAgain={() => setPhase({ name: 'intro' })}
        />
      )}

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title="¿Salir de la partida?"
        description="Si sales ahora, la partida no se registra: no se cobra nada, pero tampoco ganas fichas."
        confirmLabel="Salir"
        onConfirm={() => blocker.proceed?.()}
      />
    </>
  )
}
