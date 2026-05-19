import { AuthGate } from '@/components/auth/AuthGate'
import { FavoritesList } from '@/components/favorites/FavoritesList'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useFavorites } from '@/hooks/useFavorites'
import { useStations } from '@/hooks/useStations'

export default function FavoritesPage() {
  return (
    <AuthGate>
      <FavoritesContent />
    </AuthGate>
  )
}

function FavoritesContent() {
  const { stations, isLoading: stationsLoading, error: stationsError, refresh } = useStations()
  const { favorites, isLoading: favoritesLoading, error: favoritesError } = useFavorites()

  if (stationsLoading || favoritesLoading) {
    return <LoadingState message="Cargando favoritos…" />
  }

  if (stationsError) {
    return (
      <ErrorState
        message={`No se pudieron cargar las estaciones: ${stationsError.message}`}
        onRetry={() => void refresh()}
      />
    )
  }

  if (favoritesError) {
    return <ErrorState message={favoritesError.message} />
  }

  const stationById = new Map(stations.map((s) => [s.id, s]))
  const favoriteStations = favorites
    .map((id) => stationById.get(id))
    .filter((s): s is (typeof stations)[number] => s !== undefined)

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Favoritos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {favoriteStations.length === 0
          ? 'Marca estaciones desde el mapa para verlas aquí.'
          : `${favoriteStations.length} de 10 estaciones marcadas como favoritas.`}
      </p>
      <div className="mt-6">
        <FavoritesList stations={favoriteStations} />
      </div>
    </section>
  )
}
