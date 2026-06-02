import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useGeolocation } from '@/hooks/useGeolocation'

const originalGeolocation = navigator.geolocation

function setGeolocation(value: unknown) {
  Object.defineProperty(navigator, 'geolocation', {
    value,
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  setGeolocation(originalGeolocation)
})

describe('useGeolocation', () => {
  it('reports unsupported when the API is missing', () => {
    setGeolocation(undefined)
    const { result } = renderHook(() => useGeolocation())
    act(() => result.current.request())
    expect(result.current.status).toBe('unsupported')
  })

  it('reports granted with coordinates on success', () => {
    setGeolocation({
      getCurrentPosition: (success: PositionCallback) =>
        success({ coords: { latitude: -33.45, longitude: -70.66 } } as GeolocationPosition),
    })
    const { result } = renderHook(() => useGeolocation())
    act(() => result.current.request())
    expect(result.current.status).toBe('granted')
    expect(result.current.coords).toEqual({ lat: -33.45, lng: -70.66 })
  })

  it('reports denied when the user blocks the permission', () => {
    setGeolocation({
      getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) =>
        error({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError),
    })
    const { result } = renderHook(() => useGeolocation())
    act(() => result.current.request())
    expect(result.current.status).toBe('denied')
    expect(result.current.coords).toBeNull()
  })
})
