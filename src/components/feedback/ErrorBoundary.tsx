import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/** Para errores de render fuera del router; los de las rutas los atrapa RouteErrorPage. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error de renderizado no controlado', error, info.componentStack)
  }

  private handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div role="alert" className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <TriangleAlert className="size-10 text-destructive" aria-hidden="true" />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Algo salió mal</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Ocurrió un error inesperado al mostrar esta pantalla. Tus datos están a salvo: este error no
            cambió nada en tu cuenta.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={this.handleReset}>
            <RotateCcw aria-hidden="true" />
            Intentar de nuevo
          </Button>
          <Button onClick={() => window.location.assign('/')}>Volver al inicio</Button>
        </div>
      </div>
    )
  }
}
