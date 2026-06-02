# Feature Specification: Búsqueda y filtrado de estaciones en el mapa

**Feature Branch**: `004-station-search-filters`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Búsqueda y filtrado de estaciones en el mapa de calidad del aire — buscador con autocompletado, toggle para estaciones sin datos recientes con contador, filtro por nivel de calidad, clustering de marcadores y 'estaciones cerca de mí' por geolocalización. 100% front-end, sin cambios de base de datos."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Encontrar una estación por nombre o comuna (Priority: P1)

Un visitante (sin necesidad de iniciar sesión) quiere ubicar rápidamente una estación concreta entre las ~169 del mapa sin tener que arrastrar y hacer zoom a mano. Escribe parte del nombre de la estación o de su comuna en un buscador y obtiene sugerencias al instante; al elegir una, el mapa se desplaza hasta ella y abre su detalle.

**Why this priority**: Es el dolor más directo del usuario ("encontrar mi ciudad rápido") y el de mayor valor. Por sí solo ya transforma la usabilidad del mapa y es plenamente demostrable.

**Independent Test**: Cargar el mapa, escribir "Tocopilla" (o una comuna conocida) en el buscador, ver la lista de coincidencias, seleccionar una y comprobar que el mapa se centra en esa estación y abre su popup. No depende de ningún otro filtro.

**Acceptance Scenarios**:

1. **Given** el mapa cargado con todas las estaciones, **When** el usuario escribe al menos 2 caracteres que coinciden con el nombre de una estación o su comuna, **Then** aparece una lista de sugerencias con las estaciones coincidentes (nombre + comuna).
2. **Given** una lista de sugerencias visible, **When** el usuario selecciona una (con clic o con teclado: flechas + Enter), **Then** el mapa se desplaza/centra sobre esa estación y abre su detalle.
3. **Given** un término de búsqueda sin coincidencias, **When** el usuario termina de escribir, **Then** se muestra un mensaje claro en español de "sin resultados" en lugar de una lista vacía silenciosa.
4. **Given** texto escrito en el buscador, **When** el usuario lo borra o limpia la búsqueda, **Then** el mapa vuelve a mostrar el conjunto de estaciones según los demás filtros activos.

---

### User Story 2 - Ocultar estaciones sin datos recientes (Priority: P1)

Un visitante ve que muchas estaciones aparecen "sin datos recientes" y ensucian el mapa. Quiere poder ver de un vistazo solo las estaciones que sí están reportando, y aun así tener la opción de revelar las inactivas cuando le interese. Un indicador le dice cuántas estaciones está viendo del total.

**Why this priority**: Resuelve directamente el desorden visual que el usuario reportó y aporta transparencia sobre la cobertura real de datos. Es independiente de la búsqueda y entrega valor por sí solo.

**Independent Test**: Cargar el mapa, comprobar que por defecto solo se ven estaciones con datos recientes y que el contador refleja "X de Y"; activar el control para mostrar también las inactivas y verificar que aparecen los marcadores adicionales y el contador se actualiza.

**Acceptance Scenarios**:

1. **Given** el mapa recién cargado, **When** no se ha tocado ningún control, **Then** solo se muestran las estaciones con datos recientes y un contador indica cuántas estaciones con datos se ven sobre el total (p. ej. "Mostrando 87 de 169 estaciones con datos").
2. **Given** las estaciones sin datos ocultas, **When** el usuario activa el control "mostrar estaciones sin datos recientes", **Then** los marcadores de las estaciones inactivas aparecen, visualmente distinguibles de las activas, y el contador se actualiza al total mostrado.
3. **Given** las estaciones sin datos visibles, **When** el usuario desactiva el control, **Then** vuelven a ocultarse y el contador se actualiza.

---

### User Story 3 - Filtrar por nivel de calidad del aire (Priority: P2)

Un visitante preocupado por la contaminación quiere ver únicamente las estaciones que están en un nivel determinado (p. ej. solo las "Insalubre" o peores) para localizar las zonas con mal aire sin leer estación por estación.

**Why this priority**: Aporta un valor analítico claro y reutiliza la clasificación de niveles que el mapa ya muestra, pero es secundario frente a encontrar una estación o limpiar el mapa.

**Independent Test**: Cargar el mapa, seleccionar uno o más niveles de calidad en los controles de filtro y comprobar que solo permanecen visibles las estaciones cuyo nivel (worst-of) coincide, con el contador actualizado.

**Acceptance Scenarios**:

1. **Given** el mapa con estaciones de varios niveles, **When** el usuario selecciona un nivel de calidad, **Then** solo permanecen visibles las estaciones cuyo nivel worst-of coincide y el contador se actualiza.
2. **Given** varios niveles seleccionables, **When** el usuario activa más de un nivel, **Then** se muestran las estaciones que coinciden con cualquiera de los niveles seleccionados.
3. **Given** un filtro de nivel activo, **When** el usuario lo desactiva o limpia, **Then** se restablecen las estaciones según los demás filtros activos.
4. **Given** un filtro de nivel cuyo resultado, combinado con los demás filtros, no deja ninguna estación, **Then** se muestra un mensaje claro en español de "ninguna estación coincide".

---

### User Story 4 - Mapa legible con muchas estaciones (clustering) (Priority: P3)

Un visitante que mira Chile completo (zoom alejado) ve los marcadores amontonados y superpuestos, sobre todo en zonas densas. Quiere que las estaciones cercanas se agrupen en un único indicador con su conteo, que se desagrupa al acercar el zoom.

**Why this priority**: Mejora notable de legibilidad y rendimiento percibido, pero el mapa sigue siendo usable sin ella; es un refinamiento.

**Independent Test**: Cargar el mapa a nivel país y comprobar que las estaciones cercanas aparecen agrupadas en burbujas con un número; hacer zoom y comprobar que los grupos se dividen hasta mostrar marcadores individuales.

**Acceptance Scenarios**:

1. **Given** el mapa a nivel país, **When** hay estaciones geográficamente cercanas, **Then** se muestran agrupadas en un único indicador que refleja cuántas estaciones contiene.
2. **Given** un grupo de estaciones, **When** el usuario acerca el zoom o selecciona el grupo, **Then** el grupo se divide en sub-grupos o marcadores individuales.
3. **Given** filtros activos (sin-datos, nivel, búsqueda), **When** se recalcula la agrupación, **Then** los conteos de los grupos reflejan solo las estaciones actualmente visibles.

---

### User Story 5 - Ver las estaciones cercanas a mí (Priority: P3)

Un visitante quiere centrar el mapa en su ubicación actual y priorizar las estaciones más cercanas, para ver el aire de su entorno sin buscar su comuna manualmente.

**Why this priority**: Toque de comodidad valioso, pero depende de un permiso del navegador y no es esencial para el flujo principal.

**Independent Test**: Activar "estaciones cerca de mí", conceder el permiso de ubicación simulado y comprobar que el mapa se centra en la posición y las estaciones más cercanas quedan priorizadas/destacadas; repetir denegando el permiso y comprobar el mensaje de fallback.

**Acceptance Scenarios**:

1. **Given** el mapa cargado, **When** el usuario activa "estaciones cerca de mí" y concede el permiso de ubicación, **Then** el mapa se centra en su posición y las estaciones cercanas quedan priorizadas (ordenadas/destacadas por cercanía).
2. **Given** la solicitud de ubicación, **When** el usuario deniega el permiso o el navegador no lo soporta, **Then** se muestra un mensaje claro en español explicando que no se pudo obtener la ubicación, sin romper el resto de la página.

---

### Edge Cases

- **Búsqueda y filtros combinados**: los filtros (sin-datos, nivel, búsqueda y cercanía) se aplican de forma acumulativa (AND); el conjunto visible y el contador siempre reflejan la combinación activa.
- **Cero resultados**: cualquier combinación de filtros que no deje estaciones visibles muestra un mensaje de vacío en español, tanto en el contador como (si aplica) en la lista de sugerencias.
- **Búsqueda sin acentos / mayúsculas**: escribir "tocopilla" debe encontrar "Tocopilla"; la búsqueda no distingue mayúsculas ni acentos.
- **Estación encontrada pero filtrada**: si el usuario busca y selecciona una estación que un filtro activo (p. ej. sin-datos oculto) dejaría invisible, el sistema la muestra/centra igualmente (la acción explícita del usuario prevalece) o le indica por qué no es visible. (Ver Assumptions.)
- **Realtime durante el filtrado**: si llega una lectura nueva que cambia el nivel o el estado (con/sin datos) de una estación mientras hay filtros activos, su visibilidad y el contador se actualizan en consecuencia.
- **Geolocalización fuera de Chile**: si la ubicación del usuario está lejos de toda estación, el mapa se centra igual y la priorización por cercanía simplemente lista las menos lejanas.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema MUST ofrecer un buscador de estaciones, visible sobre el mapa, que filtre por nombre de estación y por comuna a medida que el usuario escribe.
- **FR-002**: La búsqueda MUST ser insensible a mayúsculas/minúsculas y a acentos, y comenzar a sugerir a partir de un umbral corto de caracteres.
- **FR-003**: Al seleccionar una sugerencia, el sistema MUST desplazar/centrar el mapa sobre la estación elegida y abrir su detalle.
- **FR-004**: El buscador MUST ser operable por teclado (navegar sugerencias y seleccionar) y exponer la semántica de un combobox accesible.
- **FR-005**: El sistema MUST permitir ocultar y mostrar las estaciones sin datos recientes mediante un control explícito.
- **FR-006**: Por defecto, el mapa MUST mostrar solo las estaciones con datos recientes (las sin datos ocultas).
- **FR-007**: El sistema MUST mostrar un contador visible del número de estaciones actualmente mostradas respecto del total de estaciones.
- **FR-008**: Las estaciones sin datos recientes, cuando se muestran, MUST ser visualmente distinguibles de las que tienen datos.
- **FR-009**: El sistema MUST permitir filtrar las estaciones por nivel de calidad del aire (worst-of), permitiendo seleccionar uno o más niveles, reutilizando la clasificación y los colores existentes del mapa.
- **FR-010**: El sistema MUST aplicar los filtros (sin-datos, nivel, búsqueda, cercanía) de forma combinada (AND) y reflejar el resultado simultáneamente en los marcadores visibles y en el contador.
- **FR-011**: El sistema MUST mostrar un mensaje claro en español cuando una combinación de filtros o búsqueda no devuelva ninguna estación.
- **FR-012**: El sistema MUST agrupar (clustering) los marcadores cercanos cuando el zoom está alejado y desagruparlos al acercar; los conteos de grupo reflejan solo estaciones visibles según los filtros.
- **FR-013**: El sistema MUST ofrecer una acción "estaciones cerca de mí" que, con permiso de ubicación, centre el mapa en el usuario y priorice las estaciones por cercanía.
- **FR-014**: El sistema MUST manejar explícitamente el caso en que el usuario deniegue el permiso de ubicación o el navegador no lo soporte, mostrando un mensaje de fallback sin afectar al resto de la página.
- **FR-015**: Todos los controles, etiquetas y mensajes de esta feature MUST estar en español.
- **FR-016**: La feature MUST operar exclusivamente sobre los datos de estaciones ya disponibles en el cliente, sin requerir nuevas peticiones por cada tecla, cambio de base de datos ni cambios en las políticas de acceso a datos.
- **FR-017**: Los cambios de estado de una estación recibidos en vivo (nueva lectura que altera su nivel o su condición con/sin datos) MUST reflejarse en su visibilidad y en el contador mientras los filtros estén activos.

### Key Entities _(include if feature involves data)_

- **Estación**: punto de monitoreo con nombre, comuna, ubicación geográfica (lat/lon) y su última lectura conocida (o ausencia de ella). Es la unidad que se busca, filtra, agrupa y prioriza.
- **Última lectura de la estación**: medición más reciente considerada vigente (PM2.5/PM10/O₃ y su momento); su presencia o ausencia determina la condición "con datos" / "sin datos recientes", y sus valores determinan el nivel worst-of.
- **Nivel de calidad (worst-of)**: clasificación cualitativa derivada de la peor lectura de los contaminantes de la estación; categoría usada por el filtro de nivel y por el color del marcador.
- **Estado de filtrado/búsqueda**: conjunto efímero (no persistido) de criterios activos —término de búsqueda, visibilidad de sin-datos, niveles seleccionados, modo cercanía— que determina qué estaciones son visibles y el valor del contador.
- **Ubicación del usuario**: coordenada puntual obtenida del navegador, usada solo para centrar el mapa y ordenar por cercanía; no se almacena.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un usuario puede localizar y abrir una estación concreta por su nombre o comuna en menos de 10 segundos y con un máximo de 3 interacciones (escribir, elegir, ver), sin recurrir al arrastre/zoom manual.
- **SC-002**: Con la vista por defecto, el mapa muestra únicamente estaciones con datos recientes y el contador indica correctamente la proporción mostrada respecto del total en el 100% de las cargas.
- **SC-003**: Al aplicar cualquier combinación de filtros, los marcadores visibles y el contador coinciden exactamente con el criterio (sin estaciones de más ni de menos) en el 100% de los casos verificados.
- **SC-004**: A nivel país, ningún conjunto de marcadores queda ilegible por superposición: las estaciones cercanas se presentan agrupadas y el usuario puede llegar a cualquier estación individual acercando el zoom.
- **SC-005**: Toda combinación de filtros/búsqueda sin resultados produce un mensaje de vacío en español (nunca una pantalla en blanco o una lista vacía sin explicación).
- **SC-006**: La función "cerca de mí" centra el mapa y prioriza por cercanía cuando se concede el permiso, y muestra un mensaje de fallback comprensible cuando se deniega, sin dejar la interfaz en un estado roto.
- **SC-007**: Búsqueda y filtrado responden de forma percibida como instantánea (sin esperas perceptibles) al interactuar con ~169 estaciones.
- **SC-008**: El buscador y los controles de filtro son completamente operables solo con teclado.

## Assumptions

- **Datos en memoria**: la feature opera sobre las estaciones y su última lectura que la aplicación ya carga en el cliente; no introduce nuevas fuentes de datos, migraciones ni cambios en las reglas de acceso a datos.
- **Definición de "sin datos recientes"**: se reutiliza el criterio ya existente en la aplicación (una estación sin lectura vigente según la regla de frescura de la ingesta). Esta feature no redefine ese umbral.
- **Default oculto**: por decisión de UX, las estaciones sin datos recientes arrancan ocultas para limpiar el mapa; el usuario las revela con un control. (Coincide con la petición original "un botón para mostrar las que no tienen datos".)
- **Filtro de nivel multi-selección**: el usuario puede activar varios niveles a la vez; con varios activos se aplica unión (OR) entre niveles, y el conjunto de tipos de filtro distintos se combina con AND.
- **Selección desde búsqueda prevalece**: si el usuario busca y elige explícitamente una estación que un filtro activo ocultaría, se prioriza mostrarla/centrarla (la intención explícita gana sobre el filtro); la forma exacta de comunicarlo se afinará en el plan.
- **Cercanía = centrar + priorizar, no filtrar**: "estaciones cerca de mí" reordena/centra pero no elimina del mapa las estaciones lejanas, salvo que otro filtro lo haga.
- **Sin persistencia**: el estado de búsqueda/filtros es efímero (no se guarda en la URL ni entre sesiones); persistir en la URL queda explícitamente fuera de alcance y diferido a una posible feature futura.
- **Alcance de plataforma**: la experiencia debe funcionar en escritorio y móvil (la app ya es responsive); el detalle de adaptación de los controles a móvil se resolverá en el plan.
- **Disciplina de tests**: la lógica de filtrado/búsqueda/cercanía será pura y cubierta con tests unitarios, y se añadirá una prueba de extremo a extremo para los flujos de búsqueda y filtrado, conforme a la constitución del proyecto.
