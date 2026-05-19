# Feature Specification: Dashboard de Calidad del Aire en Tiempo Real

**Feature Branch**: `001-air-quality-dashboard`

**Created**: 2026-05-18

**Status**: Draft

**Input**: User description: "Dashboard de monitoreo de calidad del aire en tiempo real basado en datos públicos de OpenAQ, con mapa interactivo de estaciones, gráficos de tendencias, autenticación, favoritos y alertas configurables."

## Clarifications

### Session 2026-05-18

- Q: Semántica de disparo de alertas (edge-triggered vs level-triggered) → A: Edge-triggered — la alerta se dispara una única vez al cruzar el umbral; se vuelve a armar sólo después de que una medición posterior NO cumpla la condición.
- Q: Disparos de alertas mientras el usuario no tiene la app abierta → A: Badge + resumen — cada disparo se registra con marca "no visto"; al abrir la app un badge muestra el conteo de no vistos y un toast resumen ("Tienes N alertas nuevas"); abrir el historial marca todas como vistas.
- Q: ¿Cuándo se considera una estación "inactiva"? → A: No modelar "inactiva" en el MVP. Todas las estaciones se tratan como activas; el estado visual "sin datos recientes" (marcador gris cuando la última lectura tiene >24 h) es la única señal de falta de datos. Favoritos y alertas asociadas se conservan intactos aunque la estación no esté reportando.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Explorar el mapa de calidad del aire (Priority: P1)

Un visitante (sin cuenta) abre la aplicación y ve un mapa centrado en Chile
con todas las estaciones de monitoreo representadas como marcadores. El
color de cada marcador indica el nivel de calidad del aire de la lectura
más reciente: verde (bueno), amarillo (moderado), naranja (malo) o rojo
(peligroso). Al hacer click sobre un marcador aparece un popup con el
nombre de la estación, las mediciones actuales de PM2.5, PM10 y O3, y la
hora de la última lectura.

**Why this priority**: Es la propuesta de valor principal y el primer
"wow" del portafolio. Funciona sin autenticación, valida la cadena de
ingesta de datos completa (OpenAQ → backend → frontend), y por sí sola
demuestra un dashboard ambiental utilizable. Sin esta historia, ninguna
otra es interesante.

**Independent Test**: Un visitante sin cuenta abre la URL pública, ve el
mapa con al menos una estación coloreada según su nivel de calidad, y
puede abrir el popup haciendo click en un marcador para leer los valores
actuales de los tres contaminantes.

**Acceptance Scenarios**:

1. **Given** la aplicación está cargada y existen lecturas recientes de
   al menos una estación, **When** el visitante carga la página principal,
   **Then** el mapa se centra en Chile y muestra los marcadores de todas
   las estaciones con color asignado según el peor contaminante de su
   lectura más reciente.
2. **Given** el mapa muestra una estación con un marcador rojo, **When**
   el visitante hace click sobre ese marcador, **Then** se abre un popup
   con el nombre de la estación, los valores actuales de PM2.5, PM10 y O3
   (con sus unidades µg/m³), la categoría textual (peligroso) y la marca
   de tiempo de la última medición.
3. **Given** una estación no tiene mediciones en las últimas 24 horas,
   **When** el visitante carga el mapa, **Then** el marcador se muestra
   en gris (sin datos) y el popup indica "Sin datos recientes" junto a la
   fecha de la última medición conocida.

---

### User Story 2 - Ver tendencias temporales de una estación (Priority: P2)

Tras seleccionar una estación, el usuario accede a un panel con tres
gráficos de línea temporal — uno por cada contaminante (PM2.5, PM10, O3)
— y puede cambiar el rango mostrado entre 6 horas, 24 horas y 7 días.
Mientras el panel está abierto, los gráficos se actualizan
automáticamente al llegar nuevas mediciones de esa estación, sin recargar
la página.

**Why this priority**: Convierte el dashboard de "vista instantánea" en
"vista analítica". Es la prueba visible más fuerte de capacidades
realtime, una de las habilidades más valiosas de un fullstack junior.

**Independent Test**: Selecciono una estación con histórico, abro el
panel, alterno entre los tres rangos y veo que cada gráfico responde al
selector; sin recargar la página, después de que llegue una nueva lectura
ingestada, el gráfico añade el punto nuevo y desplaza el rango.

**Acceptance Scenarios**:

1. **Given** una estación con al menos 7 días de mediciones, **When** el
   usuario selecciona la estación y elige el rango "7 días", **Then** los
   tres gráficos muestran las lecturas correspondientes con el eje
   horizontal cubriendo los últimos 7 días.
2. **Given** el panel de la estación está abierto con rango "6 horas",
   **When** llega una nueva medición para esa estación, **Then** los
   gráficos se actualizan visualmente para incluir el nuevo punto sin
   intervención del usuario.
3. **Given** una estación sólo mide PM2.5 (no tiene PM10 ni O3), **When**
   el usuario abre el panel de esa estación, **Then** el gráfico de PM2.5
   se renderiza con datos y los otros dos muestran el mensaje "Este
   contaminante no es medido por esta estación".

---

### User Story 3 - Crear cuenta e iniciar sesión (Priority: P3)

Un visitante puede crear una cuenta con email y contraseña, confirmar el
acceso e iniciar sesión. Una vez autenticado, su sesión persiste entre
recargas. Puede cerrar sesión en cualquier momento. Las funciones de
favoritos y alertas se desbloquean al iniciar sesión.

**Why this priority**: Es la puerta de entrada a las funciones
personalizadas. Sin autenticación las historias 4 y 5 no existen, pero
las historias 1 y 2 sí, así que viene después.

**Independent Test**: Creo una cuenta desde la UI con un email nuevo y
una contraseña, recibo confirmación, cierro sesión, inicio sesión con
las mismas credenciales y vuelvo a estar autenticado.

**Acceptance Scenarios**:

1. **Given** el formulario de registro está abierto, **When** el usuario
   ingresa un email válido y una contraseña de al menos 8 caracteres y
   envía el formulario, **Then** la cuenta queda creada y el usuario es
   redirigido al estado autenticado (las secciones Favoritos y Alertas
   aparecen disponibles).
2. **Given** un usuario tiene una cuenta válida, **When** ingresa email y
   contraseña correctos en el formulario de login, **Then** queda
   autenticado y la sesión persiste tras recargar la página.
3. **Given** el usuario ingresa credenciales inválidas, **When** envía el
   formulario de login, **Then** se muestra un mensaje de error claro en
   español ("Email o contraseña incorrectos") sin revelar cuál de los dos
   campos falló.
4. **Given** el usuario está autenticado, **When** hace click en "Cerrar
   sesión", **Then** la sesión termina, las secciones Favoritos y Alertas
   dejan de ser accesibles, y el mapa público sigue disponible.

---

### User Story 4 - Gestionar estaciones favoritas (Priority: P4)

Un usuario autenticado puede marcar estaciones como favoritas (hasta 10)
y desmarcarlas. Existe una sección "Favoritos" que lista sus estaciones
favoritas con la lectura más reciente de cada una, permitiendo abrir
rápidamente el panel de tendencias sin tener que buscarlas en el mapa.

**Why this priority**: Funcionalidad de comodidad. Aporta valor pero no
es indispensable para que el portafolio se vea completo en una demo.

**Independent Test**: Estando autenticado, marco una estación como
favorita desde el popup del mapa, navego a la sección Favoritos, veo la
estación con su lectura actual, la desmarco y desaparece de la lista.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con menos de 10 favoritos, **When**
   abre el popup de una estación y pulsa "Agregar a favoritos", **Then**
   la estación queda guardada como favorita y el botón cambia su estado
   visualmente.
2. **Given** un usuario autenticado con 10 favoritos ya guardados,
   **When** intenta marcar una estación adicional, **Then** la app
   bloquea la acción y muestra el mensaje "Has alcanzado el máximo de 10
   estaciones favoritas. Elimina alguna para añadir esta."
3. **Given** un usuario autenticado entra a la sección Favoritos sin
   haber marcado ninguna estación, **When** la sección se renderiza,
   **Then** se muestra un estado vacío informativo con instrucciones
   ("Aún no tienes estaciones favoritas. Haz click en cualquier estación
   del mapa para guardarla aquí.").
4. **Given** un usuario tiene una estación marcada como favorita,
   **When** la desmarca desde la sección Favoritos, **Then** la estación
   desaparece inmediatamente de la lista sin recargar la página.

---

### User Story 5 - Configurar y recibir alertas (Priority: P5)

Un usuario autenticado puede crear hasta 5 alertas. Cada alerta tiene:
una estación, un contaminante (PM2.5, PM10 o O3), un umbral numérico y
una dirección de comparación (mayor que / menor que). Cuando llega una
nueva medición que cruza la condición, la app muestra una notificación
in-app (toast) mientras el usuario está navegando. Existe un historial
visible de las últimas 20 alertas disparadas del usuario.

**Why this priority**: Es la funcionalidad más sofisticada y la última
en orden de dependencias (requiere autenticación, ingestion y catálogo
de estaciones funcionando). Aporta la narrativa más impresionante para
una entrevista ("además puedes configurar alertas que se disparan en
tiempo real"), pero su valor para un visitante casual del portafolio es
secundario respecto al mapa.

**Independent Test**: Estando autenticado, creo una alerta para "PM2.5 >
30 µg/m³ en Estación X", espero a que llegue una medición que cumpla la
condición, veo el toast, y la entrada aparece en el historial.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con menos de 5 alertas activas,
   **When** envía el formulario "Nueva alerta" con estación, contaminante,
   umbral numérico y dirección, **Then** la alerta queda guardada y
   visible en la lista de alertas del usuario.
2. **Given** un usuario tiene una alerta activa "PM2.5 > 30 en Estación
   X" en estado "armada", **When** llega una medición de PM2.5 = 42 µg/m³
   en Estación X, **Then** la app muestra un toast en la vista actual del
   usuario con el texto y el valor disparador, la alerta queda registrada
   en el historial con su marca de tiempo, y la alerta pasa a estado "ya
   disparada".
3. **Given** una alerta acaba de disparar (estado "ya disparada") y la
   condición se sigue cumpliendo, **When** llegan 3 mediciones más que
   también la cumplen, **Then** NO se muestran toasts adicionales y NO se
   añaden entradas al historial. Cuando llega una medición que NO cumple
   la condición, la alerta vuelve a "armada" sin notificar.
4. **Given** un usuario ya tiene 5 alertas activas, **When** intenta
   crear una sexta, **Then** la app bloquea la creación y muestra
   "Máximo 5 alertas. Elimina una existente para crear otra."
5. **Given** una alerta tiene en su historial más de 20 disparos,
   **When** el usuario abre el historial, **Then** se muestran solo los
   20 más recientes en orden descendente por fecha.
6. **Given** un usuario crea una alerta con umbral = 30 y dirección
   "menor que", **When** llega una medición = 12, **Then** la alerta se
   dispara igual que en el caso "mayor que".

---

### Edge Cases

- **Base de datos sin lecturas todavía** (primera carga del proyecto antes
  del primer ciclo de ingesta): el mapa muestra todas las estaciones en
  estado "sin datos" (marcador gris) y un banner informativo "Aún no se
  han recibido mediciones. Próxima actualización en N minutos".
- **OpenAQ no responde o devuelve error** durante un ciclo de ingesta: la
  app sigue mostrando las últimas mediciones disponibles; los marcadores
  cuya última medición tenga más de 24 horas pasan a estado gris "sin
  datos recientes". El sistema NO debe mostrar errores de OpenAQ al
  usuario final.
- **Una estación deja de reportar un contaminante específico** (sigue
  midiendo PM2.5 pero ya no PM10): el popup y los gráficos indican
  "Este contaminante no es medido por esta estación" para los faltantes,
  sin romper la vista.
- **Mediciones con valores extremos o negativos** (errores de sensor en
  los datos crudos de OpenAQ): valores negativos se descartan en la
  ingesta; valores que exceden 10× el umbral peligroso se marcan como
  sospechosos y se descartan también, registrando una entrada en logs
  del backend.
- **Una estación deja de reportar durante días** (la fuente OpenAQ no
  publica más mediciones para ese id): los favoritos y alertas
  asociados se conservan intactos. El marcador en el mapa permanece
  en estado "sin datos recientes" (gris) y el panel muestra los
  gráficos vacíos con el mensaje correspondiente. Las alertas siguen
  "armadas" y se dispararán naturalmente si la estación vuelve a
  reportar y cumple la condición.
- **Conflicto entre los 3 contaminantes para colorear el marcador**: el
  color del marcador refleja el PEOR nivel entre los tres contaminantes
  con lecturas recientes (regla "worst-of").
- **Cobertura geográfica fuera de Chile**: si OpenAQ devuelve también
  estaciones de países vecinos cuando el bounding box las incluye, se
  muestran todas; el mapa parte centrado en Chile pero el usuario puede
  navegar libremente.
- **Mobile con conexión lenta**: la vista inicial muestra el mapa
  esqueleto con un indicador de carga; los marcadores aparecen
  progresivamente conforme se cargan las lecturas.
- **El navegador del usuario pierde conexión** mientras tiene el panel
  abierto: las suscripciones realtime se reconectan automáticamente al
  recuperar la red; durante la desconexión se muestra un indicador
  discreto "Reconectando…".

## Requirements _(mandatory)_

### Functional Requirements

**Mapa y visualización pública**

- **FR-001**: El sistema MUST mostrar un mapa interactivo público
  (accesible sin autenticación) centrado en Chile al cargar.
- **FR-002**: El sistema MUST renderizar todas las estaciones
  disponibles como marcadores georreferenciados en el mapa, con color
  basado en el nivel de calidad de la lectura más reciente combinada.
- **FR-003**: El nivel de calidad MUST calcularse aplicando los umbrales
  OMS por contaminante y tomando el peor (regla "worst-of") entre PM2.5,
  PM10 y O3 con lecturas válidas en las últimas 24 horas:
  - PM2.5 (µg/m³): bueno <15, moderado <30, malo <55, peligroso ≥55.
  - PM10 (µg/m³): bueno <45, moderado <80, malo <150, peligroso ≥150.
  - O3 (µg/m³): bueno <60, moderado <120, malo <180, peligroso ≥180.
- **FR-004**: Si la última lectura combinada de una estación tiene más
  de 24 horas, el sistema MUST mostrar el marcador en estado "sin datos"
  (gris) y reflejar este estado en el popup.
- **FR-005**: Al hacer click sobre un marcador, el sistema MUST mostrar
  un popup con: nombre de la estación, valores actuales de PM2.5, PM10
  y O3 con sus unidades, categoría textual del nivel, y marca de tiempo
  de la última medición.

**Panel de estación con tendencias**

- **FR-006**: El sistema MUST permitir abrir un panel de estación con
  gráficos de línea temporal para PM2.5, PM10 y O3.
- **FR-007**: El panel MUST ofrecer un selector de rango con tres
  opciones: 6 horas, 24 horas y 7 días.
- **FR-008**: Los gráficos del panel MUST actualizarse en tiempo real
  cuando llegan nuevas mediciones para esa estación, sin requerir
  recargar la página.
- **FR-009**: El sistema MUST manejar el caso de contaminantes no
  reportados por la estación mostrando un mensaje explícito en lugar
  del gráfico vacío.

**Autenticación**

- **FR-010**: El sistema MUST permitir crear cuentas de usuario con
  email y contraseña.
- **FR-011**: La contraseña MUST tener al menos 8 caracteres.
- **FR-012**: El sistema MUST permitir iniciar y cerrar sesión.
- **FR-013**: La sesión del usuario MUST persistir entre recargas hasta
  que el usuario cierre sesión explícitamente o expire por inactividad
  prolongada.
- **FR-014**: Los mensajes de error de autenticación MUST estar en
  español y no revelar si el email existe en la base.
- **FR-015**: Las funciones de favoritos y alertas MUST estar
  disponibles únicamente para usuarios autenticados.

**Favoritos**

- **FR-016**: Un usuario autenticado MUST poder marcar y desmarcar
  estaciones como favoritas desde el popup del mapa y/o desde el panel
  de estación.
- **FR-017**: Cada usuario MUST poder tener un máximo de 10 estaciones
  favoritas; intentos de superar el límite MUST ser bloqueados con un
  mensaje explicativo en español.
- **FR-018**: El sistema MUST exponer una sección "Favoritos" que
  enumera las estaciones favoritas del usuario con su lectura más
  reciente y permite abrir su panel.
- **FR-019**: La sección "Favoritos" sin elementos MUST mostrar un
  empty state informativo con instrucciones de cómo agregar favoritos.

**Alertas**

- **FR-020**: Un usuario autenticado MUST poder crear alertas con los
  campos: estación, contaminante (PM2.5 / PM10 / O3), umbral numérico y
  dirección (mayor que / menor que).
- **FR-021**: Cada usuario MUST poder tener un máximo de 5 alertas
  activas; intentos adicionales MUST ser bloqueados con mensaje
  explicativo.
- **FR-022**: El disparo de una alerta es **edge-triggered**: cada
  alerta mantiene un estado interno "armada" / "ya disparada". Cuando
  llega una nueva medición que cumple la condición y la alerta está
  "armada", el sistema MUST registrar un disparo y, si el usuario tiene
  la app abierta, mostrar una notificación in-app (toast) con la
  información del disparo. La alerta pasa entonces a estado "ya
  disparada" y NO MUST volver a disparar mientras las mediciones
  sucesivas sigan cumpliendo la condición. La alerta vuelve a estado
  "armada" en cuanto llega una medición que NO cumple la condición.
- **FR-023**: Cada disparo registrado por FR-022 MUST persistir en un
  historial por usuario; el sistema MUST exponer las últimas 20
  entradas de ese historial en orden cronológico descendente. La
  rotación a 20 elementos se aplica por usuario. Cada entrada del
  historial MUST guardar un indicador `seen` (booleano) inicializado en
  `false`.
- **FR-024**: Cuando el usuario abre la sesión (o tiene la app abierta y
  llega un disparo), el sistema MUST mostrar un badge con el conteo de
  disparos con `seen = false`. Si al iniciar la sesión existen disparos
  no vistos, el sistema MUST mostrar UN toast resumen del estilo
  "Tienes N alertas nuevas" (no un toast por cada uno). Mientras la
  app está abierta, cada nuevo disparo MUST mostrar su propio toast
  individual conforme a FR-022.
- **FR-025**: Abrir la vista de historial MUST marcar todas las entradas
  visibles como `seen = true`, reseteando el badge a cero.
- **FR-026**: El usuario MUST poder eliminar alertas existentes.
- **FR-027**: El sistema NO debe enviar notificaciones por email ni
  push en esta versión.

**Ingesta de datos**

- **FR-028**: El sistema MUST consultar la fuente externa OpenAQ de
  forma periódica con frecuencia aproximada de 15 minutos y persistir
  las nuevas mediciones en la base.
- **FR-029**: La ingesta MUST ocurrir exclusivamente del lado del
  backend; ningún componente del frontend debe consultar OpenAQ
  directamente.
- **FR-030**: La ingesta MUST descartar lecturas con valores negativos
  o que excedan 10× el umbral peligroso del contaminante, registrando
  estos descartes en logs internos.
- **FR-031**: El sistema MUST retener mediciones por al menos 30 días
  para soportar el rango "7 días" y dejar margen; el almacenamiento de
  histórico mayor a 30 días queda fuera del MVP.
- **FR-032**: El sistema MUST sobrevivir a un fallo temporal del API
  externo: un fallo de ingesta NO debe romper la experiencia del
  visitante; sólo afecta la frescura de los datos hasta el siguiente
  intento exitoso.

**Calidad de UI**

- **FR-033**: Toda la UI del producto MUST estar en español.
- **FR-034**: Cada vista interactiva MUST manejar explícitamente sus
  estados de carga, error y vacío.
- **FR-035**: La UI MUST ser responsive y usable desde 360 px de ancho
  hacia arriba.

### Key Entities _(include if feature involves data)_

- **Estación**: Punto físico de medición de calidad del aire. Atributos
  clave: identificador externo (id en OpenAQ), nombre legible, ubicación
  geográfica (latitud, longitud), país y ciudad. No se modela un estado
  de ciclo de vida en el MVP; la frescura de los datos se deriva
  exclusivamente de la marca de tiempo de la última lectura.
- **Lectura**: Valor de un contaminante medido en una estación en un
  momento dado. Atributos clave: estación, contaminante (PM2.5 / PM10 /
  O3), valor numérico, unidad (µg/m³), marca de tiempo. Cada estación
  tiene muchas lecturas a lo largo del tiempo.
- **Usuario**: Persona registrada en la app. Atributos clave: email,
  identificador único interno. Tiene 0..N favoritos y 0..N alertas.
- **Favorito**: Relación de un usuario con una estación. Atributos:
  usuario, estación, fecha de creación. Un usuario tiene un máximo de
  10 favoritos.
- **Alerta**: Regla de notificación de un usuario sobre un contaminante
  en una estación. Atributos: usuario, estación, contaminante, umbral
  numérico, dirección de comparación (mayor que / menor que), estado de
  disparo (armada / ya disparada), fecha de creación. La transición
  armada → ya disparada ocurre al cumplirse la condición; la transición
  inversa ocurre al llegar una medición que no la cumple. Un usuario
  tiene un máximo de 5 alertas (todas se consideran activas mientras
  existan; el usuario las elimina manualmente para reducir el conteo).
- **Disparo de alerta**: Evento histórico que registra cuándo y con qué
  lectura se disparó una alerta. Atributos: alerta, lectura disparadora,
  valor disparador, marca de tiempo, indicador `seen` (booleano,
  inicialmente `false`, se vuelve `true` al abrir la vista de
  historial). El sistema retiene los últimos 20 disparos por usuario.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El 90% de los visitantes nuevos pueden identificar el
  nivel de calidad del aire (bueno / moderado / malo / peligroso) de al
  menos una estación dentro de los primeros 10 segundos de cargar la
  página, sin intervención adicional.
- **SC-002**: Cuando llega una nueva medición de una estación abierta en
  el panel de tendencias, el gráfico refleja el nuevo punto en menos de
  5 segundos sin recargar la página.
- **SC-003**: Un usuario nuevo completa el flujo de registro + login en
  menos de 90 segundos en su primer intento.
- **SC-004**: Un usuario autenticado puede agregar o quitar una estación
  de favoritos en menos de 3 segundos desde el popup del mapa.
- **SC-005**: La frescura de los datos mostrados al usuario es de
  ≤ 20 minutos en condiciones normales de operación (15 minutos del
  ciclo de ingesta + margen de propagación).
- **SC-006**: La interfaz es operable y legible en pantallas de 360 px
  de ancho: las pruebas manuales de los tres flujos principales (mapa,
  panel de estación, login) se completan sin scroll horizontal ni
  superposición de elementos en ese ancho.
- **SC-007**: Tras una caída de la fuente externa de hasta 1 hora, la
  app continúa mostrando las últimas mediciones disponibles y comunica
  al usuario que los datos podrían no estar al día (sin mostrar errores
  técnicos de la fuente externa).
- **SC-008**: El 100% de las vistas con datos manejan explícitamente sus
  tres estados (carga, error, vacío) — verificable mediante revisión
  manual de cada vista en condiciones provocadas.

## Assumptions

- **Cobertura geográfica**: Se asume que OpenAQ ofrece estaciones
  públicas suficientes en Chile para demostrar la funcionalidad. Si la
  cobertura resultara escasa, se ampliará el bounding box para incluir
  países vecinos (Argentina, Perú, Bolivia) manteniendo Chile como
  centro inicial del mapa.
- **Frecuencia de actualización de OpenAQ**: Se asume que OpenAQ
  publica nuevas mediciones con cadencia variable pero al menos cada
  hora para la mayoría de estaciones; el ciclo de ingesta de 15 minutos
  está dimensionado para no perder mediciones nuevas.
- **Idioma de la UI**: Toda la UI del MVP es en español; soporte
  multi-idioma queda fuera de alcance.
- **Notificaciones**: Sólo notificaciones in-app (toasts) en esta
  versión; push y email quedan fuera de alcance.
- **Cuentas**: Autenticación por email + contraseña; OAuth y SSO quedan
  fuera de alcance.
- **Audiencia**: Demostración pública de portafolio; no hay roles
  diferenciados ni panel de administración en esta versión.
- **Plataforma**: Web responsive; app móvil nativa fuera de alcance.
- **Retención de datos**: 30 días de mediciones; histórico más largo
  fuera de alcance.
- **Disciplina de pruebas**: La estrategia de pruebas automatizadas
  (Vitest + React Testing Library, cobertura mínima, tests
  co-localizados) está definida en la constitución del proyecto y
  aplica a todo el código de esta feature; no es scope de producto
  enumerable como historia de usuario. Los tests end-to-end con
  Playwright quedan diferidos a una feature post-MVP.
- **Sondeo realtime**: Se asume que el backend ofrece un mecanismo de
  suscripción en tiempo real al que el frontend puede conectarse para
  recibir nuevas mediciones; la suscripción se considera best-effort y
  el frontend se reconecta automáticamente ante caídas momentáneas.
