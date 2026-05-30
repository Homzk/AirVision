import { Loader2, WifiOff } from 'lucide-react'

import { useRealtimeStore } from '@/stores/realtimeStore'

/**
 * Indicador sutil del estado del canal Realtime de `readings`. Solo aparece
 * mientras la conexión en vivo está `CONNECTING` o `DISCONNECTED`; cuando está
 * `CONNECTED` (o no hay mapa montado) no renderiza nada. El texto se oculta en
 * móviles para no apretar el header.
 */
export function ReconnectingIndicator() {
  const status = useRealtimeStore((s) => s.status)

  if (status === 'CONNECTED') return null

  const connecting = status === 'CONNECTING'

  return (
    <span
      role="status"
      aria-live="polite"
      title={connecting ? 'Conectando con datos en vivo…' : 'Sin conexión con datos en vivo'}
      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-medium text-muted-foreground"
    >
      {connecting ? (
        <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <WifiOff aria-hidden className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{connecting ? 'Conectando…' : 'Sin conexión'}</span>
    </span>
  )
}
