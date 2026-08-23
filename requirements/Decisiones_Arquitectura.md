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

**Decisión:** **MySQL** (relacional), con el modelo de datos revisado y ampliado en `Analisis_Requerimientos.md` sección 9 (tablas nuevas: `NOTIFICACIONES`, `AUDITORIA`, `USUARIO_SUCURSAL`, `CLIENTES`, `REFRESH_TOKENS`).

**Alternativas descartadas:**
- **MongoDB / NoSQL documental:** el modelo ya es intrínsecamente relacional; forzarlo a documentos obligaría a denormalizar datos de producto/precio en cada venta histórica o a mantener referencias manuales sin integridad garantizada por el motor. Las transacciones multi-documento en NoSQL son más costosas y menos idiomáticas que las transacciones relacionales nativas que necesita este dominio.
- **PostgreSQL:** alternativa relacional igualmente válida (el PDF permite ambas); se prefirió MySQL por familiaridad operativa previa del equipo, sin que exista una necesidad técnica del proyecto que incline la balanza hacia PostgreSQL (sin uso previsto de tipos avanzados, `CHECK constraints` complejos o extensiones tipo `pg_vector`).

**Consecuencias:** Integridad referencial (FKs) garantizada por el motor, no por disciplina de aplicación — excepto en el patrón polimórfico de `INVENTARIO_MOVIMIENTOS.reference_type/reference_id` (ver ADR-005), donde esa validación sí recae en el service layer, como trade-off consciente. Riesgo aceptado: una sola base de datos compartida es también el único punto de fallo de disponibilidad del sistema (ver ADR-004).

**Referencias:** `Analisis_Requerimientos.md` sección 9 (revisión completa del DER: qué se mantiene, qué se agrega, qué se descarta) y `Justificacion_Stack_Tecnologico.md` sección 3 (por qué relacional y no NoSQL, y por qué MySQL sobre PostgreSQL).

---

## ADR-003 — Estrategia de autenticación y autorización: JWT de acceso + refresh token persistido

**Contexto:** Tres roles con visibilidad distinta (`ADMIN_GENERAL`, `GERENTE_SUCURSAL`, `OPERADOR_INVENTARIO`), autorización condicionada a la(s) sucursal(es) del usuario, y un requisito no funcional de seguridad explícito en la prueba técnica.

**Decisión:** **Access token JWT de corta duración + refresh token persistido en BD** (tabla `REFRESH_TOKENS`, guardando el *hash* del token, nunca el valor en claro — mismo criterio que `USUARIOS.password_hash`). Autorización vía Spring Security con reglas por endpoint y por rol.

**Alternativas descartadas:**
- **JWT stateless sin refresh** (decisión original de este proyecto, revertida): más simple de implementar, pero sin forma de revocar una sesión comprometida antes de que expire el token, y obligando a elegir entre expiraciones largas (más riesgo) o cortas (usuario deslogueado constantemente, sin forma de renovar en silencio).
- **Sesiones de servidor (cookies + estado en memoria/Redis):** funcional, pero menos natural para un backend pensado como API REST consumida por una SPA, y añade un componente de infraestructura adicional (almacén de sesiones) que el refresh token en la misma BD relacional ya resuelve sin costo extra.

**Consecuencias:** Requiere un endpoint `/auth/refresh` y rotación/invalidación del refresh token al hacer logout (pendiente — ver Épica de Autenticación en el backlog). El frontend (`OPC-front`) ya quedó preparado para este cambio: el cliente HTTP centralizado (`src/api/httpClient.js`) tiene el punto exacto documentado en código donde engancha la lógica de refresh automático en un 401, aunque hoy solo adjunta el access token porque el endpoint de refresh todavía no existe en el backend.

**Historial de cambio:** decisión inicial "JWT stateless" tomada al inicio del proyecto; revisada y cambiada a "JWT + refresh token" durante la implementación del cliente HTTP del frontend, al cuestionar si stateless-sin-refresh no dejaba una superficie de riesgo innecesaria — la prueba técnica no exige ninguna de las dos variantes específicamente (solo pide justificar la que se use), así que se optó por la más defendible en seguridad.

**Referencias:** tabla de decisiones en `Analisis_Requerimientos.md` sección 1, y tabla `REFRESH_TOKENS` en sección 9.2.

---

## ADR-004 — Mecanismo de sincronización de inventario entre sucursales

**Contexto:** El PDF exige que cada sucursal opere con autonomía local pero comparta visibilidad de inventario "en tiempo real o near-real-time" con el resto de la red, y pueda consultar el stock de cualquier otra sucursal.

**Decisión:** **Una única base de datos MySQL compartida por todas las sucursales**, consultada vía REST desde el frontend. No hay sincronización real que orquestar: todos los nodos leen y escriben sobre el mismo dato. La "autonomía por sucursal" se modela como aislamiento **lógico** (todo movimiento/venta/compra lleva `sucursal_id`, y los permisos de rol limitan qué puede modificar cada usuario), no como aislamiento físico de datos.

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
| **Snapshot + Event Log** | `INVENTARIO` (saldo actual) + `INVENTARIO_MOVIMIENTOS` (historial append-only); `TRANSFERENCIAS` (snapshot de fechas/estado) + `TRANSFERENCIAS_EVENTOS` (historial de cambios de estado) | Evita recalcular el stock sumando todo el historial en cada consulta, sin perder la trazabilidad completa que exige la sección 3.1 del PDF |
| **Identificador polimórfico** (`reference_type` + `reference_id`) | `INVENTARIO_MOVIMIENTOS`, apuntando a una venta, compra, transferencia o ajuste | Una sola tabla de movimientos sirve para cuatro orígenes distintos, sin 4 columnas FK nullable. Trade-off: la integridad referencial de `reference_id` se valida en el service layer, no la garantiza el motor de BD |
| **Repository** | Spring Data JPA, un `Repository` por entidad (`ProductoRepository`, `VentaRepository`, etc. — a implementarse en las épicas de cada módulo) | Separa el acceso a datos de la lógica de negocio; es el patrón estándar e idiomático de Spring Data, no uno agregado manualmente |
| **DTO (Data Transfer Object)** | Capa API del backend (planeado) | Evita exponer las entidades JPA directamente en las respuestas HTTP, desacoplando el modelo de persistencia del contrato público de la API |
| **Customizer / configuración aditiva** | `OPC-back/src/main/java/mh/opc_back/config/SecurityConfig.java` | Patrón específico de Spring Boot 4: un bean `Customizer<HttpSecurity>` agrega una regla puntual (`/actuator/health` público) sin reconstruir toda la configuración de seguridad por defecto de Spring Boot |
| **Interceptor** | `OPC-front/src/api/httpClient.js` (interceptores de request/response de axios) | Inyecta el JWT en cada petición y centraliza el manejo de 401 en un solo lugar, en vez de repetirlo en cada llamada a la API |
| **Provider / Context** | `OPC-front/src/context/AuthProvider.jsx` + `src/hooks/useAuth.js` | Comparte el estado de sesión (token, login, logout) entre componentes no relacionados directamente, sin prop drilling |
| **Route Guard** | `OPC-front/src/routes/ProtectedRoute.jsx` | Centraliza la regla "sin sesión no se accede a rutas privadas" en un solo componente reutilizable, en vez de repetir la verificación en cada página |

**Alternativas descartadas:**
- **CQRS (separar modelos de lectura y escritura):** válido para sistemas con cargas de lectura muy distintas a las de escritura, pero es una complejidad no justificada por el volumen y alcance de esta prueba técnica.
- **Factory** para creación de entidades: no se identificó ningún punto del dominio con suficiente variabilidad de construcción de objetos como para justificarlo; los constructores/builders de Lombok son suficientes.

**Referencias:** patrones de base de datos ya documentados como parte de la revisión del DER en `Analisis_Requerimientos.md` sección 9.1.
