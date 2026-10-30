import { QRCodeSVG } from 'qrcode.react'

/** El bloque grande del proyector para entrar a una sala: QR, link y codigo. */
export function RoomQr({ code, url }: { code: string; url: string }) {
  return (
    <section
      aria-labelledby="unirse-titulo"
      className="flex flex-col items-center justify-center gap-5 rounded-3xl border bg-card p-8 text-center"
    >
      <h1 id="unirse-titulo" className="font-display text-5xl">
        Escanea para <em className="text-accent-ink">unirte</em>
      </h1>
      <div className="rounded-2xl bg-white p-4">
        <QRCodeSVG value={url} size={240} marginSize={0} title={`QR para entrar a la sala ${code}`} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">
          o entra a <span className="font-mono text-foreground">{url.replace(/^https?:\/\//, '')}</span>
        </p>
        <p className="mt-2 font-mono text-5xl font-medium tracking-[0.2em]">{code}</p>
      </div>
    </section>
  )
}
