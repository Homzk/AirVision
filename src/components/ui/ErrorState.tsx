import { AlertTriangle } from 'lucide-react'

import { cn } from '@/lib/utils'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  message = 'Ocurrió un error al cargar los datos.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-6 text-center text-destructive',
        className,
      )}
    >
      <AlertTriangle aria-hidden className="h-6 w-6" />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded border border-destructive px-3 py-1 text-sm font-medium hover:bg-destructive/10"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
