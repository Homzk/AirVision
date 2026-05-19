import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = 'Cargando…', className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-2 p-6 text-muted-foreground',
        className,
      )}
    >
      <Loader2 aria-hidden className="h-6 w-6 animate-spin" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
