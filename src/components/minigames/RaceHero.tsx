import { CreateRaceForm, JoinRaceForm } from '@/components/race/RaceForms'
import { RACE_RULES } from '@/components/race/raceRules'

const PODIUM = [
  { place: '2.º', share: 30, height: 'h-16' },
  { place: '1.º', share: 50, height: 'h-24' },
  { place: '3.º', share: 20, height: 'h-11' },
]

/** La carrera en vivo: crear o entrar a una sala, con las reglas y como se reparte el pozo al lado. */
export function RaceHero() {
  return (
    <section aria-labelledby="minijuegos-carrera" className="relative isolate overflow-hidden rounded-2xl border bg-card">
      <span
        aria-hidden="true"
        className="absolute -top-24 -left-16 -z-10 h-60 w-80 animate-[aurora-drift_14s_ease-in-out_infinite] rounded-full bg-accent-ink/45 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-32 left-1/3 -z-10 h-56 w-72 animate-[aurora-drift_14s_ease-in-out_infinite] rounded-full bg-income/35 blur-3xl [animation-delay:-5s]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 [mask-image:linear-gradient(90deg,black,transparent_65%)] bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:18px_18px]"
      />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="p-6 lg:p-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-gain/50 bg-background/60 px-2.5 py-0.5 text-xs text-gain backdrop-blur">
            <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-gain" />
            En vivo con tu clase
          </p>
          <h2 id="minijuegos-carrera" className="mt-3.5 font-display text-4xl leading-none sm:text-5xl">
            Carrera de <em className="text-accent-ink">trading</em>
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Todos operan la misma moneda en un día real del mercado cripto. Se entra con un QR y el podio se lleva el pozo de
            fichas.
          </p>
          <CreateRaceForm className="mt-6" />
          <div className="mt-5">
            <p className="text-sm font-medium">¿Ya tienes un código?</p>
            <JoinRaceForm className="mt-2 max-w-sm" />
          </div>
        </div>
        <div className="border-t bg-card/80 p-6 backdrop-blur lg:border-t-0 lg:border-l lg:p-7">
          <h3 className="text-sm font-semibold">Cómo se juega</h3>
          <ol className="mt-3 space-y-2.5 text-[13px] leading-relaxed">
            {RACE_RULES.map((rule, i) => (
              <li key={rule} className="flex gap-2.5">
                <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{rule}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5" role="img" aria-label="El pozo se reparte 50 % al primero, 30 % al segundo y 20 % al tercero">
            <div className="grid grid-cols-3 items-end gap-2" aria-hidden="true">
              {PODIUM.map((step) => (
                <div key={step.place} className="flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground tabular-nums">{step.share} %</span>
                  <span
                    className={`grid w-full place-items-center rounded-t-lg text-sm font-semibold ${step.height} ${
                      step.share === 50 ? 'bg-accent-ink text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    {step.place}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
