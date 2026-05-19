import { Star } from 'lucide-react'

import { EmptyState } from '@/components/ui/EmptyState'
import type { StationWithLatest } from '@/types/domain'

import { FavoriteCard } from './FavoriteCard'

interface FavoritesListProps {
  stations: StationWithLatest[]
}

export function FavoritesList({ stations }: FavoritesListProps) {
  if (stations.length === 0) {
    return (
      <EmptyState
        icon={<Star aria-hidden className="h-8 w-8 text-muted-foreground" />}
        title="Aún no tienes favoritos"
        description="Abre el popup de una estación en el mapa y toca la estrella para agregarla."
      />
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {stations.map((station) => (
        <FavoriteCard key={station.id} station={station} />
      ))}
    </div>
  )
}
