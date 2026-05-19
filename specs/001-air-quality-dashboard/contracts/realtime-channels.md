# Realtime Channel Contracts

**Feature**: 001-air-quality-dashboard
**Transport**: Supabase Realtime (Postgres → WebSocket)

Dos canales activos por sesión. Suscripción y desuscripción
encapsuladas en hooks (`useReadingsRealtime`, `useAlertHistory`).

---

## Channel 1: `readings:inserts`

**Postgres source**: `INSERT` events on `public.readings`.

**Subscription** (frontend):

```ts
supabase
  .channel('readings:inserts')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'readings' }, (payload) =>
    store.applyNewReading(payload.new as Reading),
  )
  .subscribe()
```

**Payload shape** (`payload.new`):

```ts
type Reading = {
  id: number
  station_id: number
  measured_at: string // ISO 8601
  pm25: number | null
  pm10: number | null
  o3: number | null
  inserted_at: string
}
```

**Consumers**:

- `dashboardStore`: si `station_id === selectedStationId`, anexa el punto a
  cada serie correspondiente del gráfico (rango actual).
- Mapa: recalcula el color del marcador `station_id` con `computeLevel()`.

**Volumen estimado**: ~50 stations × 1 reading/15 min = 200 events/h.

**RLS**: `readings` permite SELECT a todos, por lo tanto los visitantes
no autenticados también reciben este canal. No expone datos privados.

---

## Channel 2: `alert_history:mine`

**Postgres source**: `INSERT` events on `public.alert_history` filtrados
por `user_id = auth.uid()`.

**Subscription** (frontend, sólo si autenticado):

```ts
supabase
  .channel(`alert_history:user:${userId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'alert_history',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => alertStore.handleNewTrigger(payload.new as AlertHistoryRow),
  )
  .subscribe()
```

**Payload shape** (`payload.new`):

```ts
type AlertHistoryRow = {
  id: string // uuid
  alert_id: string // uuid
  user_id: string // uuid
  reading_id: number
  triggered_value: number
  triggered_at: string // ISO 8601
  seen: boolean // siempre false al recibir
}
```

**Consumers**:

- `alertStore`: incrementa `unseenCount`; agrega entrada al cache local
  `history[]`; muestra `toast.info(...)` con la descripción legible
  (estación + contaminante + valor + umbral).

**Volumen estimado**: ≤ 5 triggers/h por usuario en condiciones típicas.

**RLS**: doble defensa — RLS sobre `alert_history` + filtro del canal.
Aún si el filtro fallara, RLS bloquea ver filas ajenas.

---

## Reconexión

El cliente Supabase Realtime maneja reconexión automática con
backoff. Los hooks `useReadingsRealtime` y `useAlertHistory` exponen
`status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'` para que la UI
pueda mostrar un indicador discreto (edge case "Reconectando…" del spec).
