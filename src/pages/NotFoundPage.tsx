import { Link } from 'react-router'
import { Compass } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { homePathFor } from '@/routes/navigation'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const { status, user } = useAuth()
  const signedIn = status === 'authenticated'

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <Compass className="size-10 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">Error 404</p>
        <h1 className="text-2xl font-semibold">No encontramos esta página</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Puede que el enlace esté mal escrito o que la página ya no exista.
        </p>
      </div>
      <Button asChild>
        <Link to={signedIn ? homePathFor(user) : '/'}>{signedIn ? 'Volver a mi resumen' : 'Ir al inicio'}</Link>
      </Button>
    </div>
  )
}
