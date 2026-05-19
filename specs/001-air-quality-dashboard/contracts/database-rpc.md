# Database / RPC Contracts

**Feature**: 001-air-quality-dashboard
**Transport**: Supabase JS client → PostgREST / RPC

El frontend habla con la BD vía PostgREST (auto-generado por Supabase).
La mayoría de operaciones son CRUD sobre tablas; no se exponen RPC
funciones custom en MVP.

---

## Queries de lectura

### `useStations` — listado para el mapa

```ts
const { data, error } = await supabase.from('latest_station_readings').select(`
    station_id,
    measured_at,
    pm25,
    pm10,
    o3,
    stations!inner ( id, name, latitude, longitude, country_code, city )
  `)
```

Resultado tipado: `Array<StationWithLatest>` donde
`StationWithLatest = Station & { latest: Reading | null }`.

**Empty state**: si `data.length === 0` → mostrar banner "Aún no se han
recibido mediciones" (edge case del spec).

### `useStationReadings` — gráficos del panel

```ts
const since = new Date(Date.now() - rangeMs).toISOString()
const { data, error } = await supabase
  .from('readings')
  .select('measured_at, pm25, pm10, o3')
  .eq('station_id', stationId)
  .gte('measured_at', since)
  .order('measured_at', { ascending: true })
```

`rangeMs ∈ { 6h, 24h, 7d }` mapeado en `src/utils/date.ts`.

---

## Mutaciones autenticadas

### `useFavorites` — agregar / quitar

```ts
// add
await supabase.from('user_favorites').insert({
  user_id: userId,
  station_id: stationId,
})
// remove
await supabase.from('user_favorites').delete().match({
  user_id: userId,
  station_id: stationId,
})
```

Errores esperados:

- `23505` (unique violation): el favorito ya existía → ignorar.
- Trigger `enforce_favorites_limit` → mensaje "Máximo 10 estaciones favoritas por usuario" → el hook mapea a un toast amistoso.

### `useAlerts` — crear / eliminar

```ts
// create
await supabase.from('alerts').insert({
  user_id: userId,
  station_id: stationId,
  pollutant, // 'pm25' | 'pm10' | 'o3'
  threshold, // number
  direction, // 'greater_than' | 'less_than'
})
// delete
await supabase.from('alerts').delete().eq('id', alertId)
```

Errores esperados:

- Trigger `enforce_alerts_limit` → mensaje "Máximo 5 alertas por usuario".

### `useAlertHistory` — marcar como vistas

```ts
await supabase.from('alert_history').update({ seen: true }).eq('user_id', userId).eq('seen', false)
```

Idempotente.

---

## Tipos TypeScript

Generados automáticamente con:

```bash
supabase gen types typescript --local > src/types/database.ts
```

El resultado tipea `supabase.from(...)` y `payload.new` de los canales
Realtime. La constitución prohíbe `any`; este archivo es la fuente de
verdad de los tipos de la BD.

---

## Auth

Manejado íntegramente por `@supabase/supabase-js`:

```ts
// signup
await supabase.auth.signUp({ email, password })
// signin
await supabase.auth.signInWithPassword({ email, password })
// signout
await supabase.auth.signOut()
// session observer
supabase.auth.onAuthStateChange((event, session) => { ... })
```

Sin endpoints custom. El hook `useAuth` envuelve estos métodos y
sincroniza el `authStore`.
