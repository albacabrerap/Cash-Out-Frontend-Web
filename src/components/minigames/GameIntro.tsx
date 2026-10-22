import { CircleAlert, Play } from 'lucide-react'
import type { GamePack } from '@/games/types'
import type { ApiQuery } from '@/hooks/useApiQuery'
import { formatTokens } from '@/lib/format'
import type { TokenWallet } from '@/types/finance'
import type { Minigame } from '@/types/minigames'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { GameFact } from './GameFact'

interface GameIntroProps {
  game: Minigame
  pack: GamePack
  wallet: ApiQuery<TokenWallet>
  onStart: () => void
}

export function GameIntro({ game, pack, wallet, onStart }: GameIntroProps) {
  const balance = wallet.data?.tokenBalance
  const missing = balance === undefined ? 0 : game.tokenCost - balance

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Cómo se juega</h2>
        </CardTitle>
        <CardDescription>{pack.rules}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-3">
          <GameFact label="Costo" value={game.tokenCost === 0 ? 'Gratis' : formatTokens(game.tokenCost)} />
          <GameFact label="Premio máximo" value={formatTokens(game.maxTokenReward)} tone="gain" />
          <GameFact label="Tus fichas" value={balance === undefined ? '—' : formatTokens(balance)} />
        </dl>
        <p className="text-sm text-muted-foreground">
          Ganas según tu puntaje, de 0 a 100: con 100 te llevas el premio completo y con 50, la mitad.
          {game.tokenCost > 0 && ' El costo se descuenta cuando terminas la partida.'}
        </p>
        {missing > 0 && (
          <Alert>
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Te faltan {formatTokens(missing)} para jugar</AlertTitle>
            <AlertDescription>Ganas fichas cumpliendo tus metas de ahorro o con los juegos gratis.</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={onStart} disabled={missing > 0 || wallet.isLoading}>
          <Play aria-hidden="true" />
          Empezar partida
        </Button>
      </CardFooter>
    </Card>
  )
}
