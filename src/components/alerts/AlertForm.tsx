import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { useAlerts } from '@/hooks/useAlerts'
import { useFavorites } from '@/hooks/useFavorites'
import { useStations } from '@/hooks/useStations'
import { POLLUTANTS, type Pollutant } from '@/lib/airQuality'
import type { Direction } from '@/stores/alertStore'
import { POLLUTANT_LABELS, POLLUTANT_UNITS } from '@/utils/constants'

interface AlertFormProps {
  onClose: () => void
}

const DIRECTION_LABEL: Record<Direction, string> = {
  greater_than: 'mayor que (>)',
  less_than: 'menor que (<)',
}

export function AlertForm({ onClose }: AlertFormProps) {
  const { stations } = useStations()
  const { favorites } = useFavorites()
  const { createAlert } = useAlerts()

  const [stationId, setStationId] = useState<string>('')
  const [pollutant, setPollutant] = useState<Pollutant>('pm25')
  const [threshold, setThreshold] = useState<string>('35')
  const [direction, setDirection] = useState<Direction>('greater_than')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)

  const favSet = new Set(favorites)
  const favoriteStations = stations
    .filter((s) => favSet.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name))
  const otherStations = stations
    .filter((s) => !favSet.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!stationId) {
      setError('Selecciona una estación.')
      return
    }
    const thresholdNum = Number.parseFloat(threshold)
    if (!Number.isFinite(thresholdNum) || thresholdNum < 0) {
      setError('El umbral debe ser un número ≥ 0.')
      return
    }
    setSubmitting(true)
    const result = await createAlert({
      station_id: Number.parseInt(stationId, 10),
      pollutant,
      threshold: thresholdNum,
      direction,
    })
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    toast.success('Alerta creada.')
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="alert-station" className="text-sm font-medium">
          Estación
        </label>
        <select
          id="alert-station"
          required
          value={stationId}
          onChange={(e) => setStationId(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="" disabled>
            Selecciona una estación…
          </option>
          {favoriteStations.length > 0 && (
            <optgroup label="Favoritas">
              {favoriteStations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.city ? ` (${s.city})` : ''}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label={favoriteStations.length > 0 ? 'Todas las estaciones' : 'Estaciones'}>
            {otherStations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.city ? ` (${s.city})` : ''}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="alert-pollutant" className="text-sm font-medium">
          Contaminante
        </label>
        <select
          id="alert-pollutant"
          value={pollutant}
          onChange={(e) => setPollutant(e.target.value as Pollutant)}
          disabled={isSubmitting}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {POLLUTANTS.map((p) => (
            <option key={p} value={p}>
              {POLLUTANT_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="alert-direction" className="text-sm font-medium">
          Condición
        </label>
        <select
          id="alert-direction"
          value={direction}
          onChange={(e) => setDirection(e.target.value as Direction)}
          disabled={isSubmitting}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="greater_than">{DIRECTION_LABEL.greater_than}</option>
          <option value="less_than">{DIRECTION_LABEL.less_than}</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="alert-threshold" className="text-sm font-medium">
          Umbral ({POLLUTANT_UNITS[pollutant]})
        </label>
        <input
          id="alert-threshold"
          type="number"
          min="0"
          step="any"
          required
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1 rounded-md border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creando…' : 'Crear alerta'}
        </button>
      </div>
    </form>
  )
}
