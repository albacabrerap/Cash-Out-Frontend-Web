import { useNavigation } from 'react-router'

export function NavigationProgress() {
  const navigation = useNavigation()
  if (navigation.state === 'idle') return null

  return (
    <div
      role="progressbar"
      aria-label="Cargando la página"
      className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/20"
    >
      <div className="h-full w-1/3 animate-[nav-progress_1s_ease-in-out_infinite] bg-primary" />
    </div>
  )
}
