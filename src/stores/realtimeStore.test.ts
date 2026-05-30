import { beforeEach, describe, expect, it } from 'vitest'

import { useRealtimeStore } from '@/stores/realtimeStore'

beforeEach(() => {
  useRealtimeStore.setState({ status: 'CONNECTED' })
})

describe('realtimeStore', () => {
  it('starts CONNECTED so the header indicator is hidden by default', () => {
    expect(useRealtimeStore.getState().status).toBe('CONNECTED')
  })

  it('setStatus replaces the channel status', () => {
    useRealtimeStore.getState().setStatus('CONNECTING')
    expect(useRealtimeStore.getState().status).toBe('CONNECTING')

    useRealtimeStore.getState().setStatus('DISCONNECTED')
    expect(useRealtimeStore.getState().status).toBe('DISCONNECTED')
  })
})
