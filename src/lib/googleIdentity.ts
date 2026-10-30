/** Lo minimo de Google Identity Services que usa la web. */
export interface GoogleButtonOptions {
  type: 'standard'
  theme: 'outline' | 'filled_black'
  size: 'large'
  text: 'continue_with'
  shape: 'pill'
  logo_alignment: 'center'
  width: number
  locale: string
}

export interface GoogleIdentityApi {
  initialize(config: {
    client_id: string
    callback: (response: { credential: string }) => void
    ux_mode: 'popup'
    auto_select: boolean
    itp_support: boolean
  }): void
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityApi } }
  }
}

const SCRIPT = 'https://accounts.google.com/gsi/client'
let loading: Promise<GoogleIdentityApi> | null = null

/** Carga el script de Google una sola vez; si falla, el siguiente intento lo reintenta. */
export function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id)
  loading ??= new Promise<GoogleIdentityApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT
    script.async = true
    script.onload = () => (window.google ? resolve(window.google.accounts.id) : reject(new Error('Google no respondió')))
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('No se pudo cargar Google'))
    }
    document.head.append(script)
  })
  return loading
}

export function googleClientId(): string | undefined {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || undefined
}
