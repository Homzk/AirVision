# Feature Specification: Ingesta real de calidad del aire (OpenAQ)

**Feature Branch**: `002-openaq-ingestion` (desarrollado en `main` por el modelo de branch del proyecto)

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "Ingesta real de calidad del aire desde OpenAQ v3: reemplazar el seed sintético por datos reales de estaciones chilenas, actualizados automáticamente cada 15 minutos del lado del servidor, sin tocar el frontend."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ver estaciones reales en el mapa (Priority: P1)

Un visitante abre el dashboard y ve el mapa de Chile poblado con las **estaciones de monitoreo reales** de la red oficial (no datos inventados), cada una en sus coordenadas correctas y con su comuna. Donde antes había ~13 estaciones sintéticas, ahora hay la red real (más de 100 estaciones a lo largo del país).

**Why this priority**: Es la base de credibilidad del producto. Un portafolio que muestra datos reales de una red oficial vale mucho más que uno con datos inventados. Sin el catálogo real de estaciones, nada de lo demás tiene sentido.

**Independent Test**: Tras correr la carga inicial de estaciones, abrir `/` y confirmar que el mapa muestra >100 estaciones chilenas con nombres y ubicaciones reales (ej. "Parque O'Higgins" en Santiago), y que no quedan estaciones sintéticas.

**Acceptance Scenarios**:

1. **Given** una base sin estaciones reales, **When** se ejecuta la carga inicial del catálogo, **Then** la tabla de estaciones queda poblada con la red chilena real (cada una con nombre, comuna y coordenadas válidas).
2. **Given** estaciones sintéticas previas (ids 1–13), **When** se completa la migración, **Then** ninguna estación sintética sigue visible en el mapa.

---

### User Story 2 - Datos que se actualizan solos (Priority: P1)

Un visitante que vuelve al dashboard horas o días después ve **mediciones recientes** sin que nadie haya hecho nada manualmente: el sistema ingiere datos nuevos cada 15 minutos de forma automática. Las tendencias temporales nunca aparecen vacías por datos viejos.

**Why this priority**: Resuelve la deuda técnica #6 (hoy los datos envejecen y hay que re-sembrar a mano). Un dashboard "en tiempo real" que muestra datos rancios es peor que no tenerlo. Es el corazón del valor "tiempo real".

**Independent Test**: Observar la base durante >15 min y confirmar que entran lecturas nuevas automáticamente; abrir una estación activa y ver que las tendencias 6h/24h tienen puntos recientes sin recargar ni re-sembrar.

**Acceptance Scenarios**:

1. **Given** el sistema en operación, **When** transcurren 15 minutos, **Then** han entrado mediciones nuevas para las estaciones activas sin intervención manual.
2. **Given** una nueva medición ingestada, **When** el visitante tiene el mapa abierto, **Then** el marcador correspondiente se actualiza en vivo (la actualización en tiempo real existente sigue funcionando, sin cambios en el frontend).

---

### User Story 3 - Datos confiables, nunca rancios ni absurdos (Priority: P2)

El visitante puede confiar en que un valor mostrado es **actual y plausible**. Si un sensor de un contaminante dejó de reportar (aunque la estación siga activa para otros), el dashboard muestra "sin datos" para ese contaminante en vez de un valor de hace años. Valores imposibles (negativos o disparatados) nunca se muestran.

**Why this priority**: La fuente real tiene sensores muertos que siguen devolviendo su último valor histórico (ej. una estación activa con O₃ cuya última lectura es de 2021). Mostrar eso como "actual" rompería la confianza. Es calidad de datos, encima de tener datos.

**Independent Test**: Tomar una estación cuyo sensor de O₃ esté inactivo y confirmar que el dashboard muestra PM2.5/PM10 actuales pero O₃ como "sin datos" (no un valor antiguo). Confirmar que ningún valor negativo o fuera de rango llega a mostrarse.

**Acceptance Scenarios**:

1. **Given** una estación con un sensor de un contaminante inactivo (última lectura más vieja que el umbral de frescura), **When** corre la ingesta, **Then** ese contaminante NO se actualiza con el valor viejo y el dashboard lo muestra como sin datos recientes.
2. **Given** una medición negativa o desproporcionada entregada por la fuente, **When** corre la ingesta, **Then** esa medición se descarta y no se almacena.
3. **Given** una estación que reporta solo algunos contaminantes en un ciclo, **When** se ingieren, **Then** los contaminantes ausentes conservan su valor previo (no se sobrescriben con vacío).

---

### Edge Cases

- **Fuente caída o con límite de tasa**: si el proveedor externo falla o limita las peticiones, el ciclo registra el problema y termina sin error visible; el siguiente ciclo recupera. El dashboard sigue mostrando los últimos datos buenos.
- **Estación con todos los sensores inactivos**: queda en el catálogo pero el mapa la muestra "sin datos recientes" (comportamiento ya existente).
- **Cobertura parcial de contaminantes**: muchas estaciones no reportan los tres; se almacena lo disponible y el resto queda nulo.
- **Medición duplicada** (misma estación + mismo instante): no genera filas repetidas (la ingesta es idempotente).
- **Colisión de identificadores** entre estaciones reales y las sintéticas previas: se resuelve eliminando las sintéticas durante la migración.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema MUST poblar el catálogo de estaciones a partir de la red de monitoreo real que cubre Chile, reemplazando el conjunto sintético.
- **FR-002**: El sistema MUST refrescar las mediciones de calidad del aire de forma automática y recurrente (cada 15 minutos) sin intervención manual.
- **FR-003**: El sistema MUST ingerir mediciones de los tres contaminantes seguidos por el producto: PM2.5, PM10 y O₃.
- **FR-004**: El sistema MUST descartar mediciones rancias, evaluando la frescura **por contaminante** (no por estación), de modo que un sensor inactivo no aporte valores antiguos.
- **FR-005**: El sistema MUST descartar mediciones inválidas (valores negativos o implausiblemente grandes).
- **FR-006**: El sistema MUST fusionar reportes parciales de una misma estación e instante sin perder valores previamente almacenados (actualización idempotente).
- **FR-007**: El sistema MUST eliminar los datos sintéticos previos para que no convivan con las estaciones reales.
- **FR-008**: El frontend MUST seguir leyendo datos solo del almacén interno, sin llamar nunca al proveedor externo directamente (Constitución, Principio II).
- **FR-009**: El sistema MUST tolerar fallos del proveedor externo (límites de tasa, caídas) sin interrumpirse; el ciclo siguiente recupera la ventana perdida.
- **FR-010**: El sistema MUST registrar un resumen de cada ciclo de ingesta (cantidades ingestadas, descartadas por rancias, descartadas por inválidas, errores) para observabilidad.
- **FR-011**: Las credenciales del proveedor externo MUST permanecer exclusivamente del lado del servidor, nunca en el cliente.
- **FR-012**: La incorporación de datos reales MUST funcionar sin cambios en el código del frontend ni en el esquema de datos existente (mismas tablas `stations`/`readings` y misma vía de tiempo real).

### Key Entities _(include if feature involves data)_

- **Estación** (`stations`, existente): punto de monitoreo real; su identificador es el de la red de origen. Atributos: nombre, comuna, coordenadas, país.
- **Lectura** (`readings`, existente): medición horaria por estación e instante, en formato ancho (PM2.5/PM10/O₃ nullable). Clave única por (estación, instante).
- **Sensor** (concepto de la fuente, no persistido): unidad que mide UN contaminante en una estación; puede estar activo o inactivo independientemente de los demás sensores de la misma estación. Es el origen de la regla de frescura por contaminante.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Tras la carga inicial, el mapa muestra **al menos 100 estaciones chilenas reales** con coordenadas válidas.
- **SC-002**: Las mediciones se refrescan **automáticamente al menos cada 15 minutos**; un visitante que vuelve después de la ventana de frescura ve tendencias no vacías **sin ningún paso manual**.
- **SC-003**: **Ningún** valor mostrado en el dashboard es más antiguo que el umbral de frescura ni está fuera de rango plausible.
- **SC-004**: **Cero** estaciones sintéticas/placeholder permanecen visibles tras la migración.
- **SC-005**: Una caída o límite de tasa del proveedor durante un ciclo **no produce errores visibles** para el visitante; los datos simplemente no se actualizan hasta el siguiente ciclo exitoso.
- **SC-006**: La incorporación de datos reales se logra con **cero cambios** en el código del frontend.

## Assumptions

- **Esquema y frontend reutilizados sin cambios**: la arquitectura del feature 001 se diseñó para este "swap"; se reutilizan las tablas `stations`/`readings`, la vista de última lectura y la publicación de tiempo real existentes.
- **Proveedor de datos**: OpenAQ v3 (free tier). Se dispone de una API key configurada del lado del servidor. El alcance geográfico se define por un bounding box de Chile.
- **Umbral de frescura por defecto: 3 horas** (la red reporta a cadencia horaria); se confirmará en planificación. Mediciones más viejas que el umbral se tratan como "sin datos recientes".
- **Estrategia de coste/tasa**: la cantidad de peticiones por ciclo (~una por estación fresca) debe mantenerse dentro de los límites del free tier; la táctica concreta (bulk vs. throttling) se decide en `/speckit-plan`.
- **Contrato de la API ya validado**: los endpoints, IDs de parámetro (pm10=1, pm25=2, o3=3) y shapes reales están documentados en `specs/001-air-quality-dashboard/contracts/edge-functions.md` (actualizado contra la API real el 2026-05-30).
- **Tests**: la lógica pura (normalización largo→ancho, validación, regla de frescura) se prueba de forma aislada con la fuente externa mockeada; no se golpea la API real en tests (consistente con la Constitución, Principio VI).
- **E2E (Playwright)** permanece fuera de alcance (diferido a un feature posterior).
