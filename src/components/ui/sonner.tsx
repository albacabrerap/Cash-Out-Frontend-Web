import { useTheme } from "@/hooks/useTheme"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--success-bg": "color-mix(in oklab, var(--success) 12%, var(--popover))",
          "--success-border": "color-mix(in oklab, var(--success) 35%, var(--popover))",
          "--success-text": "var(--success)",
          "--error-bg": "color-mix(in oklab, var(--destructive) 10%, var(--popover))",
          "--error-border": "color-mix(in oklab, var(--destructive) 35%, var(--popover))",
          "--error-text": "var(--destructive)",
          "--warning-bg": "color-mix(in oklab, var(--warning) 12%, var(--popover))",
          "--warning-border": "color-mix(in oklab, var(--warning) 35%, var(--popover))",
          "--warning-text": "var(--warning)",
          "--info-bg": "var(--accent)",
          "--info-border": "color-mix(in oklab, var(--mauve) 50%, var(--popover))",
          "--info-text": "var(--accent-foreground)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
