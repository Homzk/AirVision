import { useCallback, useState } from 'react'

import type { Coords } from '@/lib/stationFilters'

export type GeoStatus = 'idle' | 'prompting' | 'granted' | 'denied' | 'unsupported' | 'error'

/**
 * Wraps the browser Geolocation API with explicit, testable states. The
 * resolved coordinates live only in memory — they are never stored or sent
 * anywhere. Distance/sorting against stations is done by pure helpers in
 * `stationFilters.ts`.
 */
export function useGeolocation(): {
  status: GeoStatus
  coords: Coords | null
  request: () => void
} {
  const [status, setStatus] = useState<GeoStatus>('idle')
  const [coords, setCoords] = useState<Coords | null>(null)

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported')
      return
    }
    setStatus('prompting')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
        setStatus('granted')
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'error')
      },
    )
  }, [])

  return { status, coords, request }
}
