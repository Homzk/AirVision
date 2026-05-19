import { Star } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useFavorites } from '@/hooks/useFavorites'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

interface FavoriteButtonProps {
  stationId: number
  className?: string
}

export function FavoriteButton({ stationId, className }: FavoriteButtonProps) {
  const status = useAuthStore((s) => s.status)
  const { isFavorite, canAddMore, add, remove } = useFavorites()
  const [isToggling, setToggling] = useState(false)

  if (status !== 'authenticated') return null

  const isFav = isFavorite(stationId)
  const limitReached = !isFav && !canAddMore
  const isDisabled = isToggling || limitReached

  async function handleClick() {
    setToggling(true)
    const result = isFav ? await remove(stationId) : await add(stationId)
    setToggling(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(isFav ? 'Eliminada de favoritos.' : 'Agregada a favoritos.')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      aria-pressed={isFav}
      title={limitReached ? 'Máximo 10 favoritos. Quita alguno antes de agregar otro.' : undefined}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground',
        isFav && 'text-orange-600 hover:text-orange-700',
        className,
      )}
    >
      <Star aria-hidden className={cn('h-4 w-4', isFav && 'fill-orange-600')} />
    </button>
  )
}
