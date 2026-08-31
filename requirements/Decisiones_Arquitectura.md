# Registro de Decisiones de Arquitectura (ADR)

> Responde al requisito de la sección 8.2 de `Prueba Tecnica Inventario.pdf`: *"Cada decisión de arquitectura significativa debe quedar documentada con su justificación."* Lista, como mínimo, lenguaje de backend, motor de BD, estrategia de autenticación, mecanismo de sincronización entre sucursales y patrones de diseño.
> Cada entrada sigue el formato ADR (Architecture Decision Record): contexto → decisión → alternativas descartadas → consecuencias. Complementa, sin repetir en extenso, lo ya desarrollado en [`Analisis_Requerimientos.md`](Analisis_Requerimientos.md) (sección 1, tabla de decisiones, y sección 9, revisión del DER) y en [`Justificacion_Stack_Tecnologico.md`](Justificacion_Stack_Tecnologico.md) (justificación completa del stack).

---

## ADR-001 — Lenguaje y framework de backend: Java 21 + Spring Boot

**Contexto:** El núcleo del sistema es lógica transaccional (inventario, compras, ventas, transferencias) sobre un modelo de datos altamente relacional, no un CRUD simple. Se necesita manejo robusto de transacciones multi-tabla, autorización por rol y bajo riesgo de errores de tipo en cálculos financieros (costo promedio ponderado, totales, descuentos).

**Decisión:** Backend en **Java 21 sobre Spring Boot 4**, usando Spring Data JPA, Spring Security y Bean Validation.

**Alternativas descartadas:**
- **Node.js (Express/NestJS):** tipado opcional y borrado en runtime (incluso con TypeScript); manejo transaccional menos idiomático que Spring para operaciones multi-tabla.
- **Python (Django/FastAPI):** buen prototipado, pero ORM y transacciones menos maduros para este nivel de integridad relacional.
- **.NET/C#:** técnicamente comparable en robustez, descartado solo por curva de adopción y por no ser el ecosistema en el que ya arrancó el proyecto (`OPC-back` ya scaffoldeado en Spring Boot).

**Consecuencias:** `@Transactional` da atomicidad declarativa para operaciones como "registrar venta → descontar stock → registrar movimiento" sin orquestación manual. Spring Data JPA reduce el código repetitivo de los CRUDs de los 6 módulos. Costo: mayor verbosidad que Node/Python para endpoints triviales.

**Referencias:** justificación completa y comparativa detallada en [`Justificacion_Stack_Tecnologico.md`](Justificacion_Stack_Tecnologico.md#1-backend-java--spring-boot).

---

## ADR-002 — Motor de base de datos y modelo de datos: MySQL relacional

**Contexto:** El modelo de datos (`Prototipo_DB.pdf`) ya está diseñado como 20+ entidades relacionadas por FKs explícitas (venta → ítems → producto; transferencia → ítems → eventos; orden de compra → recepciones parciales). Se necesitan transacciones ACID multi-tabla y consultas de dashboard con joins y agregaciones.

**Decisión:** **MySQL** (relacional), con el modelo de datos revisado y ampliado en `Analisis_Requerimientos.md` sección 9 (tablas nuevas: `sy_notifications`, `sy_audit_log`, `ma_user_branch`, `ma_customers`, `sy_refresh_tokens`).

**Alternativas descartadas:**
- **MongoDB / NoSQL documental:** el modelo ya es intrínsecamente relacional; forzarlo a documentos obligaría a denormalizar datos de producto/precio en cada venta histórica o a mantener referencias manuales sin integridad garantizada por el motor. Las transacciones multi-documento en NoSQL son más costosas y menos idiomáticas que las transacciones relacionales nativas que necesita este dominio.
- **PostgreSQL:** alternativa relacional igualmente válida (el PDF permite ambas); se prefirió MySQL por familiaridad operativa previa del equipo, sin que exista una necesidad técnica del proyecto que incline la balanza hacia PostgreSQL (sin uso previsto de tipos avanzados, `CHECK constraints` complejos o extensiones tipo `pg_vector`).

**Consecuencias:** Integridad referencial (FKs) garantizada por el motor, no por disciplina de aplicación — excepto en el patrón polimórfico de `tr_inventory_movements.reference_type/reference_id` (ver ADR-005), donde esa validación sí recae en el service layer, como trade-off consciente. Riesgo aceptado: una sola base de datos compartida es también el único punto de fallo de disponibilidad del sistema (ver ADR-004).

**Referencias:** `Analisis_Requerimientos.md` sección 9 (revisión completa del DER: qué se mantiene, qué se agrega, qué se descarta) y `Justificacion_Stack_Tecnologico.md` sección 3 (por qué relacional y no NoSQL, y por qué MySQL sobre PostgreSQL).

---

## ADR-003 — Estrategia de autenticación y autorización: JWT de acceso + refresh token persistido

**Contexto:** Tres roles con visibilidad distinta (`GENERAL_ADMIN`, `BRANCH_MANAGER`, `INVENTORY_OPERATOR`), autorización condicionada a la(s) sucursal(es) del usuario, y un requisito no funcional de seguridad explícito en la prueba técnica.

**Decisión:** **Access token JWT de corta duración + refresh token persistido en BD** (tabla `sy_refresh_tokens`, guardando el *hash* del token, nunca el valor en claro — mismo criterio que `ma_users.password_hash`). Autorización vía Spring Security con reglas por endpoint y por rol.

**Alternativas descartadas:**
- **JWT stateless sin refresh** (decisión original de este proyecto, revertida): más simple de implementar, pero sin forma de revocar una sesión comprometida antes de que expire el token, y obligando a elegir entre expiraciones largas (más riesgo) o cortas (usuario deslogueado constantemente, sin forma de renovar en silencio).
- **Sesiones de servidor (cookies + estado en memoria/Redis):** funcional, pero menos natural para un backend pensado como API REST consumida por una SPA, y añade un componente de infraestructura adicional (almacén de sesiones) que el refresh token en la misma BD relacional ya resuelve sin costo extra.

**Consecuencias:** Ya implementado de punta a punta. El backend expone `/api/auth/login`, `/api/auth/refresh` (público, la seguridad la da el propio refresh token de un solo uso) y `/api/auth/logout` (revoca el refresh token). El cliente HTTP del frontend (`src/services/http/HttpClient.js`) inyecta el access token en cada request y, ante un 401, renueva automáticamente contra `/api/auth/refresh` y reintenta la petición una sola vez; varias peticiones que fallan a la vez comparten una misma promesa de renovación para no gastar el refresh token rotado más de una vez.

**Historial de cambio:** decisión inicial "JWT stateless" tomada al inicio del proyecto; revisada y cambiada a "JWT + refresh token" durante la implementación del cliente HTTP del frontend, al cuestionar si stateless-sin-refresh no dejaba una superficie de riesgo innecesaria — la prueba técnica no exige ninguna de las dos variantes específicamente (solo pide justificar la que se use), así que se optó por la más defendible en seguridad.

**Referencias:** tabla de decisiones en `Analisis_Requerimientos.md` sección 1, y tabla `sy_refresh_tokens` en sección 9.2.

---

## ADR-004 — Mecanismo de sincronización de inventario entre sucursales

**Contexto:** El PDF exige que cada sucursal opere con autonomía local pero comparta visibilidad de inventario "en tiempo real o near-real-time" con el resto de la red, y pueda consultar el stock de cualquier otra sucursal.

**Decisión:** **Una única base de datos MySQL compartida por todas las sucursales**, consultada vía REST desde el frontend. No hay sincronización real que orquestar: todos los nodos leen y escriben sobre el mismo dato. La "autonomía por sucursal" se modela como aislamiento **lógico** (todo movimiento/venta/compra lleva `branch_id`, y los permisos de rol limitan qué puede modificar cada usuario), no como aislamiento físico de datos.

**Alternativas descartadas:**
- **Una base de datos (o esquema) por sucursal + replicación/eventos:** cumpliría el mismo requisito funcional pero añade complejidad de infraestructura (mensajería, resolución de conflictos, consistencia eventual) que no está justificada por el alcance de esta prueba técnica — el propio principio rector del PDF ("¿por qué se hizo así?") penalizaría una complejidad no justificada por el problema real.
- **WebSockets/push en tiempo real sobre la misma BD compartida:** válido como mejora incremental futura para refrescar la UI sin polling, pero no es necesario para *cumplir* el requisito (que pide visibilidad compartida, no necesariamente push instantáneo) — se deja fuera del alcance actual.

**Consecuencias:** Máxima simplicidad y consistencia fuerte inmediata (no hay ventana de inconsistencia entre sucursales). Trade-off aceptado: la disponibilidad de toda la red depende de un único motor de base de datos — limitación conocida y documentada, no un descuido.

**Referencias:** `Analisis_Requerimientos.md` sección 1 (tabla de decisiones y párrafo final) y sección 6 (supuestos y dependencias).

---

## ADR-005 — Patrones de diseño adoptados

**Estado:** Algunos ya implementados, otros planeados para las próximas épicas del backlog

**Contexto:** El PDF pide documentar explícitamente cualquier patrón de diseño utilizado (Repository, Factory, CQRS, etc.).

**Decisión:** se adoptan los siguientes patrones, cada uno resolviendo un problema puntual del dominio:

| Patrón | Dónde se usa | Por qué |
|---|---|---|
| **Snapshot + Event Log** | `tr_inventory` (saldo actual) + `tr_inventory_movements` (historial append-only); `tr_transfers` (snapshot de fechas/estado) + `tr_transfer_events` (historial de cambios de estado) | Evita recalcular el stock sumando todo el historial en cada consulta, sin perder la trazabilidad completa que exige la sección 3.1 del PDF |
| **Identificador polimórfico** (`reference_type` + `reference_id`) | `tr_inventory_movements`, apuntando a una venta, compra, transferencia o ajuste | Una sola tabla de movimientos sirve para cuatro orígenes distintos, sin 4 columnas FK nullable. Trade-off: la integridad referencial de `reference_id` se valida en el service layer, no la garantiza el motor de BD |
| **Repository** | Spring Data JPA, un `Repository` por entidad (`ProductRepository`, `SaleRepository`, etc. — a implementarse en las épicas de cada módulo) | Separa el acceso a datos de la lógica de negocio; es el patrón estándar e idiomático de Spring Data, no uno agregado manualmente |
| **DTO (Data Transfer Object)** | Capa API del backend (planeado) | Evita exponer las entidades JPA directamente en las respuestas HTTP, desacoplando el modelo de persistencia del contrato público de la API |
| **Customizer / configuración aditiva** | `OPC-back/src/main/java/opcback/config/SecurityConfig.java` | Patrón específico de Spring Boot 4: un bean `Customizer<HttpSecurity>` agrega una regla puntual (`/actuator/health` público) sin reconstruir toda la configuración de seguridad por defecto de Spring Boot |
| **Interceptor** | `OPC-front/src/services/http/HttpClient.js` (clase estática sobre una instancia de axios, con interceptores de request/response) | Inyecta el JWT en cada petición y centraliza el manejo de 401 (renovación + reintento) en un solo lugar, en vez de repetirlo en cada llamada a la API |
| **Store global (signals)** | `OPC-front/src/stores/` — `AuthStore`, `ThemeStore`, `UiStore`, `BranchDirectoryStore` | Comparte estado de sesión, tema, mensajería de UI y el directorio de sucursales entre componentes no relacionados, sin prop drilling ni React Context — con `@preact/signals-react` cualquier componente que lea un signal se re-renderiza solo (ver ADR-008) |
| **Controller / Presentation** | `OPC-front/src/pages/<Modulo>/<Modulo>Controller.js` (+ `src/lib/Controller` y sus bases: `FormController`, `PollingController`, `CrudListController`) | Separa la lógica de cada pantalla (carga de datos, acciones, estado) de su render — el componente `<Modulo>Page.jsx` solo pinta el DOM leyendo los signals del controller (ver ADR-008) |
| **Route Guard** | `OPC-front/src/routes/ProtectedRoute.jsx` (lee `AuthStore`) | Centraliza la regla "sin sesión no se accede a rutas privadas" (y, opcional, por rol) en un solo componente reutilizable, en vez de repetir la verificación en cada página |

**Alternativas descartadas:**
- **CQRS (separar modelos de lectura y escritura):** válido para sistemas con cargas de lectura muy distintas a las de escritura, pero es una complejidad no justificada por el volumen y alcance de esta prueba técnica.
- **Factory** para creación de entidades: no se identificó ningún punto del dominio con suficiente variabilidad de construcción de objetos como para justificarlo; los constructores/builders de Lombok son suficientes.

**Referencias:** patrones de base de datos ya documentados como parte de la revisión del DER en `Analisis_Requerimientos.md` sección 9.1.

---

## ADR-006 — Roles como tabla maestra (`ma_roles`), no como `ENUM`

**Estado:** Aceptada (revierte el diseño original del prototipo)

**Contexto:** El prototipo original modelaba `USUARIOS.rol` como `ENUM`. Un `ENUM` de MySQL es una lista cerrada de valores definida en el propio esquema — agregar o renombrar un rol implica una migración de esquema (`ALTER TABLE ... MODIFY COLUMN`), no una simple inserción de dato.

**Decisión:** los roles se modelan como tabla maestra `ma_roles` (`id, code, name, description, created_at`), con `ma_users.role_id` como FK. Se sembra con tres filas: `GENERAL_ADMIN`, `BRANCH_MANAGER`, `INVENTORY_OPERATOR`.

**Alternativas descartadas:**
- **`ENUM` en la columna** (diseño original): más simple y con validación gratuita a nivel de motor, pero acopla la lista de roles al esquema de la base de datos — cualquier cambio de roles requiere una migración, no una operación de datos.
- **Bitmask / permisos granulares en vez de roles fijos:** resolvería casos de autorización más finos que "3 roles fijos", pero es una complejidad no pedida por la prueba técnica (que define explícitamente 3 actores con responsabilidades fijas, sección 6.2 del PDF) — se descarta por sobre-diseño.

**Consecuencias:** un `JOIN` adicional (o `EAGER`/caché de roles, dado que son pocos y cambian poco) para resolver el nombre del rol; a cambio, agregar un cuarto rol en el futuro (por ejemplo, si se integra el actor opcional "Sistema externo" de la sección 6.2 del PDF como un rol real) es una inserción de dato, no una migración de esquema. Es también coherente con la categorización de tablas por prefijo (`ma_`/`tr_`/`sy_`, ver nota de convención de nombres más abajo): un rol es dato maestro, no un valor de código.

**Referencias:** `Analisis_Requerimientos.md` sección 9.2 (tabla `ma_roles`) y 9.4 (resumen de cambios).

---

## Nota sobre convención de nombres de tablas y columnas

A partir de esta revisión, todas las tablas y columnas del esquema usan **identificadores en inglés** con prefijo de una categoría de 2 letras:

| Prefijo | Categoría | Criterio |
|---|---|---|
| `ma_` | Master (maestro) | Catálogo/configuración/referencia — el "quién/qué" del negocio, incluye el detalle de un maestro (ej. `ma_price_list_items`) |
| `tr_` | Transactional (transaccional) | Algo que "pasó": cabecera + ítems de un evento de negocio, y el saldo que resulta de esos eventos |
| `sy_` | System (sistema) | Infraestructura cross-cutting (auditoría, notificaciones, tokens) — no es dominio de inventario en sí |

Se evaluó separar por **esquemas de MySQL** en vez de por prefijo, y se descartó: casi todas las FKs cruzan entre categorías (`tr_sales → ma_customers`, `tr_inventory_movements → ma_branches`), así que separar en esquemas físicos habría añadido complejidad (FKs cross-schema, mapeo `@Table(schema=...)` en cada entidad JPA, un script de inicialización adicional en Docker) sin aislamiento real, dado que las tablas siguen tan acopladas como antes. El prefijo logra el mismo agrupamiento visual sin ese costo. El texto descriptivo de la documentación de ingeniería se mantiene en español; solo los identificadores técnicos (nombres de tabla y columna) están en inglés.

---

## ADR-007 — Gestión del esquema: Flyway, no Hibernate `ddl-auto`

**Estado:** Aceptada

**Contexto:** La sección 5 del PDF exige que todo el proyecto arranque con un solo comando, "sin dependencias de configuración manual en el entorno local". El esquema ya estaba diseñado y verificado a mano contra MySQL 8 real (`database/queries/01-03`) antes de que existiera ningún código de backend — hacía falta un mecanismo para que ese mismo esquema, exacto, se aplicara solo al levantar la aplicación.

**Decisión:** Flyway, integrado en `OPC-back` (`spring-boot-starter-flyway` + `flyway-mysql`), con las migraciones versionadas en `OPC-back/src/main/resources/db/migration/` (`V1` a `V4` hoy: esquema, foreign keys, índices, datos de demo). Se ejecutan automáticamente en orden al arrancar la aplicación, antes de que Hibernate se inicialice, y quedan registradas en `flyway_schema_history` para no repetirse. Como consecuencia directa, `spring.jpa.hibernate.ddl-auto` pasó de `update` a **`validate`**: Hibernate deja de tener permiso para crear o modificar el esquema — solo verifica que las entidades `@Entity` coincidan con lo que Flyway ya dejó, y falla rápido si no coinciden.

**Alternativas descartadas:**
- **Dejar solo `spring.jpa.hibernate.ddl-auto=update`** (lo que había antes de esta decisión): generaría el esquema a partir de las clases Java, no del DDL ya diseñado y verificado — con riesgo real de divergencia (los `ENUM` nativos de MySQL no se recrean solos desde `@Enumerated(EnumType.STRING)`, las reglas de `ON DELETE RESTRICT`/`CASCADE` que se decidieron con criterio por relación no se generan sin anotaciones específicas de Hibernate, y nunca borra ni renombra columnas). Cumple "un solo comando" pero rompe el requisito real de que el esquema en producción sea el que efectivamente se diseñó.
- **Liquibase**: alternativa igualmente válida y madura para el mismo problema; se prefirió Flyway por sintaxis SQL plana (los archivos de migración son el mismo SQL que ya se había escrito y probado a mano, sin traducir a XML/YAML/JSON) y por ser la opción más directa dado que el DDL ya existía como `.sql`.
- **Ejecutar los scripts a mano** (lo que se hizo mientras no existía Flyway): funciona para desarrollo individual, pero viola explícitamente "sin configuración manual" del PDF, y no escala a un evaluador que solo corre `docker compose up`.

**Consecuencias:**
- El esquema real de la base de datos ahora vive en `OPC-back/src/main/resources/db/migration/`, no en `database/queries/` — esa carpeta queda como copia de referencia para consulta manual (DBeaver), marcada explícitamente como tal en cada archivo. Cualquier cambio de esquema futuro se hace primero como una migración Flyway nueva (`V5__...`); nunca editando `V1`-`V4` ya aplicadas, porque Flyway calcula un checksum de cada migración aplicada y se niega a arrancar si detecta que una ya aplicada cambió.
- Flyway corre solo una vez por arranque y solo gestiona *estructura* (DDL) — no interviene en absoluto en las operaciones normales de los CRUD de la aplicación (`INSERT`/`UPDATE`/`DELETE` vía Spring Data JPA), que no tienen relación con Flyway en absoluto.
- Verificado end-to-end dos veces: desde volumen vacío (Flyway crea las 4 migraciones) y en un reinicio sin borrar datos (Flyway detecta "esquema al día" y no reintenta nada).

**Referencias:** `database/docs/DER.md` sección 4 (estado de implementación) y `database/queries/*.sql` (nota de "copia de referencia" en cada archivo).

---

## ADR-008 — Arquitectura del frontend por capas: Controller/Service/Store + signals

**Estado:** Aceptada — reemplaza el enfoque inicial (una página React por módulo con toda la lógica adentro)

**Contexto:** Al crecer a ~15 módulos, cada `pages/<X>Page.jsx` mezclaba en un solo archivo la inserción en el DOM (JSX), las llamadas al backend (`httpClient.get('/api/…')` sueltos), el estado local (`useState`/`useEffect`) y la comunicación entre componentes por *callbacks* pasados como props (`onChanged`, `onClose`, `setError`). Archivos de 300–600 líneas, cada página reimplementando su propia tabla, formulario CRUD, buscador y estados de carga/error.

**Decisión:** Separar el frontend en capas explícitas:

- **`pages/<Modulo>/`** — una carpeta por módulo. `<Modulo>Controller.js` es una **clase** que concentra la lógica (carga de datos, acciones, validación) con el estado en *signals* (`@preact/signals-react`); no contiene JSX. `<Modulo>Page.jsx` es un componente función delgado que solo lee los signals del controller y pinta. Formularios y sub-paneles tienen su propio sub-controller (`FormController` como base).
- **`services/`** — llamadas al backend. Clases con métodos estáticos, una por entidad, dentro de la carpeta del módulo (`pages/Catalog/services/CategoryService.js`); en `src/services/` solo lo transversal (`http/HttpClient`, `AuthService`).
- **`stores/`** — estado global en signals: `AuthStore` (sesión, reemplaza a `AuthProvider`/`AuthContext`), `ThemeStore`, `UiStore` (mensajería de error/éxito, reemplaza el prop-drilling de `setError`), `BranchDirectoryStore`.
- **`lib/`** — bases de clase reutilizables (`Controller`, `FormController`, `PollingController`, `CrudListController`) y el hook `useController` que instancia un controller estable por componente.
- **`components/`** — presentacionales compartidos (`DataTable`, `Tabs`, `Modal`, `FilterBar`, `Field*`, `EntityForm`, …).

**Alternativas descartadas:**
- **Seguir con páginas monolíticas:** el patrón ya no escalaba — el prop-drilling de callbacks y la duplicación de tabla/formulario/buscador crecían con cada módulo nuevo.
- **Redux / Zustand para el estado:** resuelven el estado global, pero *signals* da re-render automático fino (cualquier componente que lee `signal.value` se suscribe solo) sin *boilerplate* de acciones/reducers ni selectores, y encaja mejor con la idea de tener la lógica en clases fuera de React.
- **Componentes de clase de React:** se descartó — React 19 desaconseja las clases de componente y perderían el acceso directo a los hooks; en cambio la *lógica* va en clases normales y el render queda en una función mínima.

**Consecuencias:**
- `@vitejs/plugin-react` v6 usa oxc y ya no expone la opción `babel`, así que el *transform* de `@preact/signals-react` se corre con `@rolldown/plugin-babel` en `vite.config.js`. Sin ese transform, leer `signal.value` en un componente no dispara re-render.
- La navegación desde un controller (que no debe conocer el router) se hace con un signal `redirect` + el hook `useRedirect`.
- Cada módulo lleva sus estilos co-locados (`pages/<Modulo>/<Modulo>.css`); `src/index.css` queda solo con tokens de diseño, estilos base de elementos y primitivas compartidas.

**Referencias:** árbol de `src/` en `README.md`; entrada 2.20 de `IA_EVIDENCIA.md`.
