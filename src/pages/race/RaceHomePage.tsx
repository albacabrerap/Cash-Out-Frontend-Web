import { Presentation, Smartphone } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { CreateRaceForm, JoinRaceForm } from '@/components/race/RaceForms'
import { RACE_RULES } from '@/components/race/raceRules'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function RaceHomePage() {
  return (
    <>
      <PageHeader
        title="Carrera de trading"
        description="Compite en vivo con tu clase: misma moneda, mismo minuto, y gana quien mejor lea el mercado."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Presentation className="size-5 text-muted-foreground" aria-hidden="true" />
              <h2>Crear una sala</h2>
            </CardTitle>
            <CardDescription>
              Proyecta la pantalla de la sala: muestra el QR para entrar y, durante la carrera, el gráfico y el ranking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateRaceForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="size-5 text-muted-foreground" aria-hidden="true" />
              <h2>Unirme a una sala</h2>
            </CardTitle>
            <CardDescription>Escanea el QR de la pantalla o escribe el código de la sala.</CardDescription>
          </CardHeader>
          <CardContent>
            <JoinRaceForm />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Cómo se juega</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {RACE_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  )
}
