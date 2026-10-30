import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { toApiError, userMessage } from '@/api/errors'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { JoinRaceForm } from '@/components/race/RaceForms'
import { Button } from '@/components/ui/button'

interface LiveGameHeroProps {
  id: string
  eyebrow: ReactNode
  title: ReactNode
  description: string
  rules: string[]
  /** Abre la sala; quien la crea va a la pantalla que se proyecta. */
  create: () => Promise<{ code: string }>
  /** La ruta del juego, como "/minijuegos/sube-o-baja". */
  basePath: string
}

/** Un juego en vivo con la clase: crear o entrar a una sala, con las reglas al lado. */
export function LiveGameHero({ id, eyebrow, title, description, rules, create, basePath }: LiveGameHeroProps) {
  const navigate = useNavigate()
  const open = useAsyncAction(async () => {
    try {
      const room = await create()
      navigate(`${basePath}/${room.code}/pantalla`)
    } catch (error) {
      toast.error(userMessage(toApiError(error)))
    }
  })

  return (
    <section aria-labelledby={id} className="overflow-hidden rounded-2xl border bg-card">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="p-6 lg:p-8">
          <p className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-2.5 py-0.5 text-xs text-muted-foreground">
            {eyebrow}
          </p>
          <h2 id={id} className="mt-3.5 font-display text-4xl leading-none sm:text-5xl">
            {title}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">{description}</p>
          <Button className="mt-6" onClick={() => open.run()} disabled={open.isPending}>
            {open.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Crear sala
          </Button>
          <div className="mt-5">
            <p className="text-sm font-medium">¿Ya tienes un código?</p>
            <JoinRaceForm basePath={basePath} className="mt-2 max-w-sm" />
          </div>
        </div>
        <div className="border-t p-6 lg:border-t-0 lg:border-l lg:p-7">
          <h3 className="text-sm font-semibold">Cómo se juega</h3>
          <ol className="mt-3 space-y-2.5 text-[13px] leading-relaxed">
            {rules.map((rule, i) => (
              <li key={rule} className="flex gap-2.5">
                <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{rule}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
