import { useEffect, useRef, useState } from 'react'

import { supabase } from '@/lib/supabase'
import type { Reading } from '@/types/domain'

export type ChannelStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'

interface UseReadingsRealtimeResult {
  status: ChannelStatus
}

/**
 * Suscribe a INSERTs en `public.readings` y dispara `onInsert` con cada nueva
 * lectura. El callback se mantiene actualizado vía ref para que cambiarlo no
 * fuerce re-suscripción al canal.
 */
export function useReadingsRealtime(
  onInsert: (reading: Reading) => void,
): UseReadingsRealtimeResult {
  const [status, setStatus] = useState<ChannelStatus>('CONNECTING')
  const callbackRef = useRef(onInsert)
  callbackRef.current = onInsert

  useEffect(() => {
    const channel = supabase
      .channel('readings:inserts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'readings' }, (payload) =>
        callbackRef.current(payload.new as Reading),
      )
      .subscribe((subStatus) => {
        if (subStatus === 'SUBSCRIBED') {
          setStatus('CONNECTED')
        } else if (
          subStatus === 'CHANNEL_ERROR' ||
          subStatus === 'TIMED_OUT' ||
          subStatus === 'CLOSED'
        ) {
          setStatus('DISCONNECTED')
        } else {
          setStatus('CONNECTING')
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  return { status }
}
