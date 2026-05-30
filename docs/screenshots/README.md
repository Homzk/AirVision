# Screenshots del README (T114)

Capturas que alimentan la sección **Demo** del [`README`](../../README.md). Reemplaza
este texto por las imágenes; los nombres de archivo son fijos porque el README
los referencia directamente.

| Archivo         | Pantalla                  | Qué debe mostrar                                                                                          |
| --------------- | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `map.png`       | `/` (mapa)                | Mapa de Chile con varios marcadores coloreados y **un popup abierto** (3 contaminantes + badge de nivel). |
| `dashboard.png` | `/` + panel de tendencias | Panel de una estación abierto con los **3 gráficos** (PM2.5/PM10/O₃) y el selector 6h/24h/7d visible.     |
| `alerts.png`    | `/alertas` (autenticado)  | Pestaña con al menos una alerta creada y **el historial con un disparo** (requiere sesión iniciada).      |

## Recomendaciones de captura

- **Viewport desktop** ~1280×800 (no la ventana completa con barras del navegador; recorta al contenido).
- Formato **PNG**, ancho ideal **1200–1600 px**. Mantén las tres con proporción similar.
- Antes de `dashboard.png`: confirma que hay lecturas dentro del rango (re-corre `supabase/seed.sql`
  si los gráficos salen vacíos — ver escenario de datos rancios en `quickstart.md`).
- Antes de `alerts.png`: inicia sesión, crea una alerta e inserta una lectura que la dispare
  (ver `quickstart.md` §8) para que el historial no esté vacío.
- Modo claro u oscuro, pero **consistente** entre las tres.
