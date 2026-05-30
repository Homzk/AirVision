import { create } from 'zustand'

import type { ChannelStatus } from '@/hooks/useReadingsRealtime'

interface RealtimeState {
  /**
   * Estado del canal Realtime de `readings`. Default `'CONNECTED'` para que el
   * indicador del header quede oculto en pantallas sin mapa (login, favoritos,
   * alertas): solo `MapView` reporta estados reales mientras está montado, y
   * restaura `'CONNECTED'` al desmontarse.
   */
  status: ChannelStatus
  setStatus: (status: ChannelStatus) => void
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  status: 'CONNECTED',
  setStatus: (status) => set({ status }),
}))
