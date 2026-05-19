import { MapView } from '@/components/map/MapView'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { useStations } from '@/hooks/useStations'

export default function HomePage() {
  const { stations, isLoading, error, refresh } = useStations()

  if (isLoading) return <LoadingState message="Cargando estaciones…" />

  if (error) {
    return (
      <ErrorState
        message={`No se pudieron cargar las estaciones: ${error.message}`}
        onRetry={() => void refresh()}
      />
    )
  }

  if (stations.length === 0) {
    return (
      <EmptyState
        title="Aún no se han recibido mediciones"
        description="Cuando lleguen datos del sistema de monitoreo, las estaciones aparecerán en el mapa."
      />
    )
  }

  return <MapView stations={stations} />
}
