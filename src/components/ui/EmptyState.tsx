import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground',
        className,
      )}
    >
      {icon}
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description && <p className="max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
