# Feature Specification: Suite de Tests End-to-End (Playwright)

**Feature Branch**: `003-e2e-playwright-tests` (trabajo en `main` por convención del proyecto)

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "Tests E2E con Playwright cubriendo los flujos reales: registro/login, navegación del mapa y popups, favoritos, alertas."

> **Nota de gobernanza**: esta feature está prevista por la Constitución (Principio VI.3): los tests E2E con Playwright quedaron _fuera del alcance del MVP_ con la indicación expresa de introducirse en una "feature post-MVP" con flujos de "register/login, map navigation, adding a favorite, and creating an alert". El MVP (001) y la ingesta (002) ya están desplegados, de modo que este es el momento sancionado para construirla.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - El mapa y los datos públicos no se rompen sin avisar (Priority: P1) 🎯 MVP

Como mantenedor del proyecto, quiero una prueba automatizada que abra la app en un navegador real, como lo haría un visitante anónimo, y confirme que el mapa carga con estaciones y que el detalle de una estación muestra sus contaminantes, para enterarme de inmediato si un cambio rompe la vista principal antes de desplegarlo.

**Why this priority**: Es el flujo de mayor valor público (cualquier visitante lo ve sin login) y el más simple de validar: no requiere usuario de prueba ni estado autenticado. Es el primer corte demostrable de la suite y arrastra el andamiaje base (arranque del navegador contra la app levantada).

**Independent Test**: Levantar la app, correr solo esta prueba y verificar que carga `/`, aparecen marcadores de estaciones, y al abrir el detalle de una estación se ven los tres contaminantes (PM2.5/PM10/O₃), su nivel y la marca de tiempo. Entrega valor por sí sola: protege el flujo público completo.

**Acceptance Scenarios**:

1. **Given** la app desplegada con estaciones reales, **When** un visitante anónimo abre la página principal, **Then** el mapa se renderiza y muestra marcadores de estaciones de monitoreo.
2. **Given** el mapa cargado, **When** el visitante abre el detalle/popup de una estación, **Then** ve los contaminantes disponibles con su unidad, el badge de nivel y un timestamp.
3. **Given** una estación sin lecturas recientes, **When** el visitante la abre, **Then** ve el estado "sin datos recientes" en español (no una pantalla en blanco ni un error crudo).

---

### User Story 2 - El flujo de cuenta no se rompe sin avisar (Priority: P1)

Como mantenedor, quiero una prueba que ejercite registro, inicio de sesión, persistencia de sesión y cierre de sesión en un navegador real, para detectar cualquier regresión que impida a los usuarios entrar a la aplicación.

**Why this priority**: La autenticación es la puerta de entrada a las funciones personalizadas (favoritos, alertas); si se rompe, esas dos historias caen con ella. Es prerequisito funcional de US3 y US4.

**Independent Test**: Correr solo esta prueba: registrar una cuenta efímera nueva, cerrar y reabrir/recargar para confirmar que la sesión persiste, y cerrar sesión. Pasa o falla sin depender de las otras historias.

**Acceptance Scenarios**:

1. **Given** un visitante sin cuenta, **When** se registra con un email y contraseña válidos, **Then** queda autenticado y con acceso a las rutas protegidas.
2. **Given** una cuenta existente, **When** inicia sesión, **Then** entra correctamente; **And When** recarga la página, **Then** la sesión persiste sin volver a pedir credenciales.
3. **Given** una sesión activa, **When** el usuario cierra sesión, **Then** pierde acceso a las rutas protegidas y vuelve al estado anónimo.
4. **Given** credenciales inválidas, **When** intenta iniciar sesión, **Then** ve un mensaje de error en español (no un fallo crudo).

---

### User Story 3 - Los favoritos no se rompen sin avisar (Priority: P2)

Como mantenedor, quiero una prueba que, con un usuario autenticado, marque una estación como favorita, la vea en la página de favoritos y la pueda desmarcar, y que confirme que el tope de favoritos se respeta, para proteger esa función personalizada.

**Why this priority**: Función de valor para usuarios registrados, pero secundaria al acceso público (US1) y al login (US2), de los que depende.

**Independent Test**: Con una cuenta de prueba ya autenticada, marcar una estación como favorita, verificar que aparece en `/favoritos`, desmarcarla; y verificar que al alcanzar el tope no se permite agregar más.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado en el detalle de una estación, **When** la marca como favorita, **Then** aparece en la página de favoritos.
2. **Given** una estación marcada como favorita, **When** el usuario la desmarca, **Then** desaparece de la página de favoritos.
3. **Given** un usuario que ya alcanzó el tope de favoritos permitidos, **When** intenta agregar uno más, **Then** la app se lo impide con un mensaje claro en español.

---

### User Story 4 - Las alertas no se rompen sin avisar (Priority: P3)

Como mantenedor, quiero una prueba que cree una alerta para una estación y contaminante, simule la llegada de una medición que cruza el umbral, y confirme que la alerta dispara (notificación/badge/historial) y puede marcarse como leída, para proteger el flujo de alertas de extremo a extremo.

**Why this priority**: Es el flujo más complejo (requiere provocar una medición que cruce el umbral, lo cual no se puede hacer desde el navegador del usuario) y el de menor frecuencia de uso; se aborda al final.

**Independent Test**: Con una cuenta autenticada, crear una alerta; provocar (por una vía privilegiada fuera del navegador) una lectura que cruce el umbral; confirmar que aparece la notificación en vivo y/o la entrada en el historial, y que "marcar como leída" funciona.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** crea una alerta (estación + contaminante + umbral + dirección), **Then** la alerta queda registrada y visible.
2. **Given** una alerta activa, **When** llega una medición que cruza el umbral, **Then** el usuario ve la activación (toast en vivo y/o badge de no leídas y entrada en el historial).
3. **Given** activaciones no leídas, **When** el usuario las marca como leídas, **Then** el badge de no leídas se actualiza.

---

### User Story 5 - La suite corre sola como guardián de cada cambio (Priority: P2)

Como mantenedor, quiero que la suite E2E se ejecute automáticamente en integración continua en cada push y pull request, y que un fallo bloquee la fusión a `main`, para que las regresiones se detecten sin depender de que alguien recuerde correr las pruebas a mano.

**Why this priority**: El valor de regresión de los E2E se materializa sobre todo cuando corren automáticamente; sin CI, las pruebas existen pero no protegen. Es transversal a US1–US4, por eso va en paralelo a las historias de flujos pero no las bloquea.

**Independent Test**: Abrir un PR (o push) con la suite ya integrada y confirmar que el pipeline ejecuta los E2E y reporta su estado como check requerido; introducir un fallo deliberado y confirmar que el pipeline se pone en rojo.

**Acceptance Scenarios**:

1. **Given** la suite integrada en CI, **When** se hace push o se abre un PR, **Then** el pipeline ejecuta la suite E2E automáticamente.
2. **Given** un flujo cubierto que se rompe, **When** corre la suite en CI, **Then** el check falla y la fusión a `main` queda bloqueada.
3. **Given** un fallo en CI, **When** el mantenedor lo investiga, **Then** dispone de diagnósticos accionables (capturas y/o traza de la ejecución).

---

### Edge Cases

- **Datos vacíos o rancios**: si la app no tiene lecturas frescas, US1 debe validar el estado "sin datos recientes" en vez de fallar esperando valores.
- **Email de registro duplicado**: US2 debe manejar el caso de reintentar registro con un email ya usado (mensaje en español), y la estrategia de datos debe evitar colisiones entre corridas.
- **Tope de favoritos alcanzado**: US3 valida explícitamente el rechazo al superar el límite.
- **Alerta que no dispara dentro de la ventana de la prueba**: US4 debe tener un límite de espera y fallar con un mensaje claro si la activación no llega, sin colgarse indefinidamente.
- **Inestabilidad de tiempo real**: una reconexión de Realtime a mitad de prueba no debe producir un falso negativo; las pruebas esperan por condiciones, no por tiempos fijos.
- **Ejecución concurrente o repetida**: dos corridas seguidas (o en paralelo) no deben pisarse los datos entre sí.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: La suite MUST ejercitar la aplicación a través de un navegador real contra una instancia en ejecución de la app (extremo a extremo, sin mocks de la capa de datos).
- **FR-002**: MUST cubrir el flujo público del mapa: cargar la página principal, ver marcadores de estaciones, abrir el detalle de una estación y validar contaminantes, nivel y timestamp (US1).
- **FR-003**: MUST cubrir el flujo de cuenta: registro, login, persistencia de sesión tras recarga y logout, incluyendo el mensaje de error en español ante credenciales inválidas (US2).
- **FR-004**: MUST cubrir el flujo de favoritos: marcar, ver en la página de favoritos, desmarcar, y verificar el tope máximo (US3).
- **FR-005**: MUST cubrir el flujo de alertas: crear una alerta, provocar su activación al cruzar el umbral, ver la activación (toast/badge/historial) y marcarla como leída (US4).
- **FR-006**: Cada prueba MUST ser independiente y repetible: sin dependencia de orden entre pruebas y partiendo de un estado conocido en cada corrida.
- **FR-007**: Las cuentas y datos creados durante una corrida MUST quedar aislados por corrida y limpiarse después, de modo que ejecuciones repetidas no acumulen ni ensucien el entorno objetivo.
- **FR-008**: La suite MUST poder ejecutarse con un único comando documentado en local, y MUST ejecutarse automáticamente en CI en cada push y pull request, bloqueando la fusión a `main` ante un fallo (US5).
- **FR-009**: Ante un fallo, la suite MUST producir diagnósticos accionables (al menos capturas de pantalla y/o traza de la ejecución) para depurar.
- **FR-010**: La capa E2E MUST NOT debilitar la seguridad: la `service_role` key nunca se expone al navegador; cualquier preparación o inyección de datos privilegiada ocurre fuera del contexto del navegador (Constitución, Principio III).
- **FR-011**: Las pruebas que dependen de datos (mapa con estaciones, alerta que dispara) MUST partir de un conjunto de datos conocido y controlado, no de la disponibilidad fortuita de datos reales en ese instante.
- **FR-012**: La suite MUST ejecutarse contra la **app levantada en local** (build de preview) apuntando al **Supabase Cloud existente**, usando **cuentas efímeras con email único por corrida**. Como ese Supabase es el de producción, la suite MUST minimizar y limpiar su huella: los usuarios efímeros y cualquier dato inyectado se eliminan al terminar (ver FR-007), y los flujos de prueba no deben alterar de forma persistente los datos visibles para usuarios reales.
- **FR-013**: La activación de la alerta en US4 MUST provocarse mediante un **paso de preparación fuera del navegador** (global-setup/helper de la suite) que inserta la lectura que cruza el umbral usando la `service_role` key (server-side, nunca en el cliente — Constitución, Principio III). Esa lectura inyectada MUST eliminarse al terminar la prueba para no dejar un dato espurio en producción.
- **FR-014**: Las aserciones sobre textos visibles MUST contemplar que la UI del producto está en español (Constitución, Principio IV).

### Key Entities _(include if feature involves data)_

- **Cuenta de prueba efímera**: usuario creado al vuelo para los flujos autenticados (US2–US4), con identidad única por corrida y vida limitada al alcance de la prueba; debe poder limpiarse.
- **Datos sembrados de prueba**: estaciones y lecturas conocidas que dan a las pruebas un estado determinista (al menos una estación visible con lecturas, y la posibilidad de inyectar una lectura que cruce un umbral).
- **Artefactos de ejecución**: salidas de diagnóstico de una corrida fallida (capturas, traza, reporte) que permiten investigar sin reproducir manualmente.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Los cuatro flujos centrales (mapa público, cuenta, favoritos, alertas) quedan cubiertos por pruebas E2E que pasan en verde.
- **SC-002**: La suite E2E completa termina en CI en menos de 10 minutos.
- **SC-003**: Una regresión que rompe cualquiera de los flujos cubiertos es detectada por la suite (la pone en rojo) antes de fusionar — verificable rompiendo un flujo a propósito y viendo fallar la prueba correspondiente.
- **SC-004**: La suite es estable: 10 corridas consecutivas dan el mismo resultado en verde, sin fallos intermitentes (flakiness).
- **SC-005**: Un colaborador nuevo puede ejecutar la suite en local siguiendo un único comando documentado, sin pasos manuales adicionales no documentados.
- **SC-006**: Ninguna corrida deja cuentas o datos residuales en el entorno objetivo (verificable comparando el estado antes y después de una corrida).

## Assumptions

- **Playwright como framework E2E** queda fijado por la Constitución (Principio VI / Technology Stack: "Playwright deferred to a post-MVP feature"); no es una decisión abierta de esta spec.
- El **MVP (001)** y la **ingesta (002)** están desplegados y operativos; esta feature no modifica funcionalidad de producto, solo añade cobertura de pruebas y su tooling.
- La **UI del producto está en español**; las aserciones de texto se escriben contra los copys en español.
- **CI es GitHub Actions** (ya existe el workflow de lint/typecheck/tests unitarios); la suite E2E se integra en ese pipeline.
- **Cobertura de navegador**: Chromium como mínimo obligatorio (alcance de portafolio); cobertura cross-browser (Firefox/WebKit) es opcional y no bloquea.
- **Viewport**: escritorio como objetivo principal; validación E2E a 360px es opcional (la verificación responsive ya se cubrió en Phase 8 del 001).
- El proyecto usa **Supabase Cloud sin Docker local** (ver NOTES.md), lo que condiciona la decisión de entorno objetivo (FR-012).
- **Entorno objetivo (decidido)**: app en local apuntando al **Supabase Cloud existente** con **cuentas efímeras** de email único por corrida, limpiadas al final (FR-012). Se asume el riesgo de operar contra la base de producción y se mitiga con limpieza estricta de cuentas y de cualquier lectura inyectada; si en el futuro molesta esa huella, migrar a un proyecto Supabase de pruebas dedicado sería un cambio acotado.
- Esta feature **no toca el frontend de producción** ni el esquema de datos de producto; cualquier ayuda de prueba (seed/inyección) vive aislada del código de la app de usuario.

## Dependencies

- Depende de que el **dashboard (001)** y la **ingesta (002)** estén funcionando, ya que las pruebas validan sus flujos.
- Depende de un **entorno objetivo con datos** (a definir en FR-012) y de una **vía privilegiada para inyectar una lectura** que dispare una alerta (a definir en FR-013).
- Depende del **pipeline de GitHub Actions** existente para la integración en CI (US5).
