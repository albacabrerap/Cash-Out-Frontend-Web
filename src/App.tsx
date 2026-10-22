import { RouterProvider } from 'react-router/dom'
import { AuthProvider } from '@/contexts/AuthProvider'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { router } from '@/routes/router'

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider delayDuration={300}>
            <RouterProvider router={router} />
            <Toaster richColors closeButton position="top-right" />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
