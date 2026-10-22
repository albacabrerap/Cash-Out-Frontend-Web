import { isRouteErrorResponse, useRouteError } from 'react-router'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** El caso tipico es un despliegue nuevo: el chunk de la pagina ya no existe y recargar lo arregla. */
export default function RouteErrorPage() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <Shell title="No encontramos esta página" text="Puede que el enlace esté mal escrito o que la página ya no exista." />
    )
  }

  console.error('Error en la ruta', error)
  return (
    <Shell
      title="Algo salió mal"
      text="No pudimos mostrar esta pantalla. Recarga la página; si el problema sigue, vuelve en unos minutos."
    />
  )
}

function Shell({ title, text }: { title: string; text: string }) {
  return (
    <div role="alert" className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <TriangleAlert className="size-10 text-destructive" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{text}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => window.location.reload()}>
          <RotateCcw aria-hidden="true" />
          Recargar
        </Button>
        <Button variant="outline" onClick={() => window.location.assign('/')}>
          Ir al inicio
        </Button>
      </div>
    </div>
  )
}
