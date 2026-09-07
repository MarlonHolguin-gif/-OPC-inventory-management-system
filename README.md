# Sistema de Inventario Multi-Sucursal — OptiPlant Consultores

Prueba técnica: sistema de gestión de inventario para una organización con múltiples sucursales, con visibilidad compartida de stock, compras, ventas y transferencias entre sucursales.

**Stack:** Java 21 + Spring Boot (backend) · React + Vite, Recharts para el dashboard (frontend) · MySQL (base de datos) · Docker Compose (orquestación).
Justificación completa de estas decisiones: [`requirements/Justificacion_Stack_Tecnologico.md`](requirements/Justificacion_Stack_Tecnologico.md).

## Estructura del repositorio

```
-OPC-inventory-management-system/
├── docker-compose.yml            # Orquesta los servicios: mysql, backend, frontend
├── Dockerfile                    # Placeholder en la raíz, sin uso — cada subproyecto tiene su propio Dockerfile
├── .env.example                  # Plantilla de variables de entorno (copiar a .env, nunca versionar .env)
├── .gitignore
├── README.md                     # Este archivo
│
├── database/                     # Modelado y artefactos de base de datos
│   ├── docs/                     # DER, diccionario de datos, decisiones de esquema
│   └── queries/                  # Scripts SQL: DDL, seeds, consultas de referencia
│
├── requirements/                 # Documentación de ingeniería exigida por la prueba técnica
│   ├── Prueba Tecnica Inventario.pdf      # Enunciado original de OptiPlant Consultores
│   ├── Prototipo_DB.pdf                   # DER inicial propuesto (prototipo de base de datos)
│   ├── Analisis_Requerimientos.md         # Desglose punto por punto del enunciado + revisión del DER
│   ├── Justificacion_Stack_Tecnologico.md # Por qué Spring Boot + React + MySQL para este problema
│   └── Decisiones_Arquitectura.md         # Registro de decisiones de arquitectura (ADR)
│
├── screenshots/                  # Capturas de pantalla para documentación (UI, diagramas renderizados)
│
├── OPC-back/                     # ───── BACKEND — Java 21 + Spring Boot ─────
│   ├── Dockerfile                # Build multi-stage (Maven → JRE)
│   ├── pom.xml                   # Dependencias: Web, Data JPA, Security, Actuator, Validation, MySQL driver, Lombok
│   ├── mvnw / mvnw.cmd           # Maven Wrapper (no requiere Maven instalado localmente)
│   ├── .mvn/wrapper/              # Configuración del wrapper
│   └── src/
│       ├── main/
│       │   ├── java/opcback/              # Código fuente, un paquete por dominio: auth, branches, products,
│       │   │                              # inventory, purchases, sales, transfers, dashboard, security,
│       │   │                              # config, exception, y system/ (alerts = notificaciones de stock, faltantes
│       │   │                              # y flujo de transferencias/compras por reconciliación + chequeo programado; audit = interceptor genérico
│       │   │                              # de auditoría sobre Hibernate)
│       │   └── resources/
│       │       └── application.properties # Config de la app (BD, JWT, puerto — vía variables de entorno)
│       └── test/
│           └── java/opcback/              # Pruebas unitarias (inventory, purchases, sales, transfers, products, system)
│
└── OPC-front/                    # ───── FRONTEND — React + Vite ─────
    ├── Dockerfile                # Build multi-stage (Node → nginx), recibe VITE_API_BASE_URL como build arg
    ├── nginx.conf                # Config de nginx con fallback SPA (rutas de React Router)
    ├── .env.example              # Plantilla: URL base de la API (VITE_API_BASE_URL)
    ├── index.html
    ├── package.json
    ├── vite.config.js            # Vite + alias @/ → src/ + transform de @preact/signals-react
    ├── jsconfig.json             # Resolución del alias @/ para el editor
    ├── eslint.config.js
    ├── public/                   # Assets estáticos (favicon, icons)
    └── src/                       # Arquitectura por capas: DOM en pages/, backend en services/, estado en stores/
        ├── main.jsx                # Punto de entrada de la SPA
        ├── App.jsx                 # <BrowserRouter> + <AppRouter/>
        ├── app/                    # routes.js (paths + nav por rol) + AppRouter.jsx
        ├── services/               # Solo transversal: http/HttpClient (axios + JWT + refresh), AuthService
        ├── stores/                 # Estado global en signals: AuthStore, ThemeStore, UiStore, BranchDirectoryStore
        ├── lib/                    # Bases de clase: Controller, FormController, PollingController, CrudListController; useController, format
        ├── routes/ProtectedRoute.jsx # Guarda de rutas privadas (autenticación y, opcional, rol) — lee AuthStore
        ├── layout/AppLayout.jsx    # Riel de navegación por rol + barra superior (saludo, notificaciones, tema, logout)
        ├── components/             # Compartidos: DataTable, Tabs, Modal, FilterBar, Field*, EntityForm, Alert, NotificationBell/…
        └── pages/<Modulo>/         # Una carpeta por módulo: <Modulo>Controller.js (clase, estado en signals) +
                                    # <Modulo>Page.jsx (función delgada) + services/ (endpoints del módulo) +
                                    # components/ + constants.js + <Modulo>.css
```

### Notas sobre la estructura

- **`OPC-back/`** y **`OPC-front/`** son proyectos independientes, cada uno con su propio gestor de dependencias (Maven / npm) y su propio `Dockerfile` — se construyen y despliegan como contenedores separados, comunicándose únicamente por la API REST del backend.
- **`database/`** concentra el modelado de datos por fuera del código de aplicación, para que el DER y los scripts SQL puedan revisarse y versionarse independientemente de la implementación en Java.
- **`requirements/`** es la documentación de ingeniería (no código): ahí vive tanto el enunciado original como todo el análisis derivado de él. Es intencional que estos documentos estén versionados en el repositorio — la prueba técnica exige entregar la documentación de ingeniería junto con el código (ver sección 10 de `Prueba Tecnica Inventario.pdf`).
- El `Dockerfile` en la raíz del repositorio es un archivo vacío sin uso — cada subproyecto define el suyo propio (`OPC-back/Dockerfile`, `OPC-front/Dockerfile`).

## Documentación de ingeniería

| Documento | Contenido |
|---|---|
| [`requirements/Prueba Tecnica Inventario.pdf`](<requirements/Prueba Tecnica Inventario.pdf>) | Enunciado original de OptiPlant Consultores |
| [`requirements/Prototipo_DB.pdf`](requirements/Prototipo_DB.pdf) | DER inicial propuesto (prototipo de base de datos) |
| [`requirements/Analisis_Requerimientos.md`](requirements/Analisis_Requerimientos.md) | Requerimientos funcionales/no funcionales, actores, historias de usuario, y revisión completa del DER frente al prototipo |
| [`requirements/Justificacion_Stack_Tecnologico.md`](requirements/Justificacion_Stack_Tecnologico.md) | Por qué Java/Spring Boot, React y MySQL para este problema (incluye por qué relacional y no NoSQL) |
| [`requirements/Decisiones_Arquitectura.md`](requirements/Decisiones_Arquitectura.md) | Registro de decisiones de arquitectura (ADR): lenguaje de backend, motor de BD, autenticación, sincronización entre sucursales, patrones de diseño |
| [`requirements/IA_EVIDENCIA.md`](requirements/IA_EVIDENCIA.md) | Evidencia de uso de IA durante el desarrollo: herramientas, prompts reales, evaluación crítica y estimación de % de código asistido (documento vivo, se actualiza con el proyecto) |
| [`requirements/Diagramas_Ingenieria.md`](requirements/Diagramas_Ingenieria.md) | Diagramas de casos de uso, arquitectura y actividades (venta y transferencia) |
| [`database/docs/DER.md`](database/docs/DER.md) | Diagrama entidad-relación completo (26 tablas) |

Los 4 diagramas obligatorios de la sección 7.1 de la prueba técnica ya están completos entre estos dos documentos.

## Requerimientos

Formalización pedida por la sección 6.1 de la prueba técnica. El análisis completo (interpretación punto por punto del enunciado, decisiones y revisión del DER) está en [`requirements/Analisis_Requerimientos.md`](requirements/Analisis_Requerimientos.md); esta sección traslada al README sus **secciones 3 a 6**.

### Requerimientos funcionales

<sub>Detalle e interpretación técnica de cada uno: [`Analisis_Requerimientos.md` §3](requirements/Analisis_Requerimientos.md#3-requerimientos-funcionales-consolidados).</sub>

| Área | RF |
|---|---|
| **Inventario** | RF-01 listar stock de la sucursal propia · RF-02 consultar inventario de otra sucursal (solo lectura) · RF-03 registrar ingresos con trazabilidad · RF-04 registrar retiros con trazabilidad · RF-05 configurar `min_stock`/`max_stock` por producto y sucursal y calcular su estado de alerta · RF-06 múltiples unidades de medida por producto con factor de conversión y distinción compra/venta |
| **Compras** | RF-07 crear y gestionar órdenes de compra con ítems, precios y descuentos · RF-08 registrar recepción de una orden actualizando inventario · RF-09 calcular costo promedio ponderado al recibir · RF-10 histórico de compras por proveedor y producto |
| **Ventas** | RF-11 registrar ventas con validación de stock antes de confirmar · RF-12 aplicar listas de precios y descuentos por ítem · RF-13 registrar cliente o venta de mostrador sin cliente · RF-14 histórico de ventas por sucursal, producto y responsable |
| **Transferencias** | RF-15 solicitar transferencia entre sucursales con cantidad y urgencia · RF-16 preparar/ajustar el envío en origen · RF-17 registrar despacho con transportista y fecha estimada · RF-18 confirmar recepción completa o parcial, con alerta ante faltantes · RF-19 consultar el historial de estados de cada transferencia |
| **Logística** | RF-20 clasificar rutas de transferencia por prioridad · RF-21 reportar cumplimiento logístico (estimado vs. real) por sucursal y ruta |
| **Dashboard** | RF-22 ventas del mes vs. meses anteriores · RF-23 rotación de inventario y productos de alta/baja demanda · RF-24 transferencias activas y su impacto · RF-25 productos próximos a agotarse · RF-26 comparativa entre sucursales (solo `GENERAL_ADMIN`) |
| **Alertas inteligentes** | RF-27 notificar cuando `current_quantity` cruza `min_stock`/`max_stock` · RF-28 listar y marcar como leídas las notificaciones del usuario/sucursal |
| **Auditoría** | RF-29 registrar automáticamente cada alta/edición/baja relevante (usuario, entidad, acción, valores antes/después, fecha) · RF-30 consultar el log filtrando por entidad, usuario o rango de fechas (solo `GENERAL_ADMIN`) |
| **Seguridad y accesos** | RF-31 autenticación JWT; cada endpoint valida rol y, cuando aplique, pertenencia a sucursal · RF-32 un usuario puede tener acceso a una o varias sucursales (`ma_user_branch`); `GENERAL_ADMIN` las ve todas sin asignación explícita |

### Requerimientos no funcionales

| Categoría | Requerimiento |
|---|---|
| Rendimiento | Consultas de inventario y dashboard en <500 ms con datasets de prueba (miles de movimientos); índices sobre columnas de fecha y FKs de filtro. |
| Seguridad | Contraseñas con hash BCrypt, JWT de acceso con expiración corta, autorización por rol **a nivel de endpoint** (no solo en el frontend), sin secretos en código (variables de entorno vía Docker Compose). |
| Escalabilidad | La BD única compartida basta para el número de sucursales del alcance; el crecimiento a decenas de nodos de alto volumen queda documentado como limitación conocida. |
| Usabilidad | Frontend responsivo (desktop + tablet), mensajes de error claros ante validaciones de negocio (ej. stock insuficiente), estados de carga visibles. |
| Disponibilidad | El sistema corre en un único `docker compose up`; no se exige alta disponibilidad. |
| Auditabilidad | Todo movimiento de inventario y toda acción relevante queda registrada con usuario, fecha y motivo (`tr_inventory_movements` + `sy_audit_log`). |
| Mantenibilidad | Backend en capas (Controller/Service/Repository), DTOs para no exponer entidades JPA; frontend por capas (Controller + signals / services / stores). |

### Restricciones

- Stack fijo por decisión del candidato (Java 21 + Spring Boot · React + Vite · MySQL); no se evalúan alternativas dentro del proyecto.
- Toda la solución levanta con un único `docker compose up`, sin configuración manual adicional.
- El frontend **no contiene lógica de negocio** (validación de stock, cálculo de totales, reglas de transferencia); esas reglas viven solo en el backend.
- No hay integración real con un ERP/POS externo: el PDF lo marca como actor **opcional** — la API REST es el punto de extensión, sin conector concreto.
- Repositorio público, sin archivos de entorno ni dependencias versionadas (`.env`, `node_modules/`, `target/`).

### Supuestos

- Una sola organización con N sucursales, misma moneda y país (sin multi-moneda ni multi-tenant real).
- "Tiempo real / near-real-time" se satisface con una BD compartida consultada por REST (sin WebSockets ni colas de eventos).
- El catálogo de productos es compartido por toda la red (un mismo `sku` en todas las sucursales); lo que varía por sucursal es solo el saldo de `tr_inventory`.
- `BRANCH_MANAGER` e `INVENTORY_OPERATOR` pueden tener acceso a una o varias sucursales (tabla N:M `ma_user_branch`); `GENERAL_ADMIN` no necesita filas ahí (acceso implícito por rol).
- Sin dependencias externas (pagos, correo real, mapas/logística de terceros).

## Historias de usuario

De [`Analisis_Requerimientos.md` §8](requirements/Analisis_Requerimientos.md#8-historias-de-usuario). Las tres primeras son las de la sección 6.3 del enunciado; las otras tres corresponden a las dos funcionalidades adicionales elegidas (Alertas inteligentes y Auditoría).

> **Como** operador de inventario, **quiero** registrar el ingreso de productos con su precio de compra, **para** mantener el costo promedio del inventario actualizado y generar órdenes de pago a proveedores.

> **Como** gerente de sucursal, **quiero** ver en un dashboard la comparativa de ventas entre el mes actual y los tres meses anteriores, **para** identificar tendencias y tomar decisiones de compra anticipadas.

> **Como** operador de inventario, **quiero** solicitar la transferencia de un producto desde otra sucursal con indicación de urgencia, **para** que la sucursal origen pueda priorizar el despacho según disponibilidad.

> **Como** operador de inventario, **quiero** recibir una notificación cuando un producto cae por debajo de su stock mínimo, **para** poder generar una orden de compra antes de quedarme sin inventario.

> **Como** administrador general, **quiero** recibir una alerta cuando un producto supera su stock máximo configurado, **para** identificar sobre-stock y evitar capital inmovilizado.

> **Como** administrador general, **quiero** consultar el registro de auditoría de una entidad específica (ej. un producto), **para** saber quién la modificó, cuándo y qué cambió exactamente.

## Cómo levantar el proyecto

**Prerrequisitos:** Docker Desktop en ejecución. No hace falta tener Java, Node ni MySQL instalados localmente — los tres servicios corren en contenedores.

1. Clona el repositorio y ubícate en la raíz.
2. Copia las variables de entorno y ajústalas si hace falta:
   ```bash
   cp .env.example .env
   ```
3. Levanta la base de datos, el backend y el frontend:
   ```bash
   docker compose up -d
   ```
   Esto construye las imágenes de backend y frontend, y arranca los servicios en orden: `mysql` → (saludable) → `backend` → (saludable) → `frontend`. Puede tardar uno o dos minutos la primera vez, mientras Docker descarga las imágenes base y compila ambos proyectos.
4. Verifica que el backend está arriba:
   ```bash
   curl http://localhost:8080/actuator/health
   # {"status":"UP"}
   ```
5. Abre el frontend en `http://localhost:3000`.

Para bajar todo: `docker compose down` (agrega `-v` si además quieres borrar los datos de MySQL).

## Módulos implementados

Estado funcional actual, backend y frontend. El detalle técnico por tabla/entidad está en [`database/docs/DER.md`](database/docs/DER.md#4-estado-de-implementación).

| Módulo | Estado | Notas |
|---|---|---|
| Autenticación y usuarios | ✅ Completo | Access token (15 min) + refresh token persistido y rotado (7 días, `/api/auth/refresh`), logout que revoca el refresh token, sesión por rol, CRUD de usuarios y sucursales (con desactivar/reactivar en ambos), asignación de sucursales por usuario |
| Catálogo (categorías, unidades, productos) | ✅ Completo | Múltiples unidades de medida por producto con factor de conversión y flags compra/venta (ej. se compra por caja de 12, se vende por unidad) — **la conversión se aplica en Compras y Ventas**. Al crear un producto se puede cargar un stock inicial (ajuste positivo en una sucursal o en todas las sucursales activas). Categorías, unidades de medida y productos se pueden desactivar/reactivar y eliminar (el borrado físico se bloquea si algo los usa); el nombre de categoría y el nombre/abreviatura de unidad son únicos; cuando una acción no se puede hacer la alerta explica el motivo concreto y se muestra dentro del propio formulario |
| Inventario | ✅ Completo | Consulta de stock por sucursal (con costo promedio ponderado, mínimo y máximo), configuración del stock mínimo/máximo por producto y sucursal ("Editar umbrales"), registro de ingresos/retiros con validación de stock y recálculo del costo promedio ponderado, alertas de stock bajo/alto |
| Movimientos | ✅ Completo | Registro de un movimiento manual en modal (devolución, ajuste positivo, ajuste negativo — compras, ventas y transferencias generan los suyos automáticamente) y, debajo, el historial de movimientos (fecha, sucursal, responsable, producto, tipo, cantidad, motivo) con filtros en fila (sucursal, producto, tipo de movimiento, rango de fechas). El administrador general ve los movimientos de todas las sucursales; el gerente y el operador solo los de su(s) sucursal(es) asignada(s) |
| Compras | ✅ Completo | Proveedores; órdenes de compra con unidad de compra por línea (caja, etc.), precio por esa unidad, descuento por ítem en porcentaje y plazo de pago; al recibir, la cantidad y el costo se convierten a unidad base con el factor; ciclo de vida de la orden (borrador → enviada al proveedor → recibida / cancelada), edición mientras está en borrador; el listado se filtra por estado con un segmentado (por enviar al proveedor / por hacer recepción de mercancía); la recepción es total (se recibe todo lo pendiente y la orden pasa a recibida completa; si no llegó completa, se cancela), actualiza inventario y recalcula el costo promedio ponderado; histórico de compras filtrable por proveedor, producto, estado y rango de fechas, con el responsable de cada orden |
| Ventas | ✅ Completo | Clientes, listas de precios (con vigencia por fecha), registro de venta con unidad de venta por línea (el precio de la lista es por unidad base y se multiplica por el factor), descuento por línea en porcentaje y validación de stock en unidad base (el formulario bloquea la confirmación si una línea supera el stock; el backend igual la rechaza), histórico filtrable con el responsable de cada venta, y comprobante por venta (encabezado + ítems + totales) para consulta posterior |
| Transferencias entre sucursales | ✅ Completo | Solicitud (bloqueada, con alerta, si la sucursal de origen no tiene existencias suficientes del producto), preparación, despacho, recepción completa/parcial con línea de tiempo visual; ante un faltante en la recepción parcial se define el tratamiento (reenvío / ajuste / reclamación), y el reenvío genera automáticamente una transferencia de seguimiento por lo que faltó. El operador de inventario solo consulta y solicita transferencias; preparar, despachar, recibir, tratar el faltante y clasificar la ruta son del gerente de la sucursal o el administrador general. Las fechas del envío se validan en cadena: la de despacho no puede ser anterior a la de la solicitud, y la de llegada no puede ser anterior a la de despacho. Cada sucursal solo ve las transferencias en las que participa como origen o destino (el administrador general ve todas). Logística (sección 3.5): la sucursal origen clasifica la ruta por prioridad (alta/media/baja) desde el detalle, el listado se filtra por esa prioridad, cada transferencia muestra sus tiempos estimados vs. reales de despacho y llegada con la desviación en días. El módulo tiene dos pestañas (Transferencias en curso / Histórico); en el histórico, un botón "% de cumplimiento" abre un modal con el reporte de cumplimiento logístico (% a tiempo por sucursal y prioridad de ruta, con gráfica y tabla) |
| Dashboard gerencial | ✅ Completo | Visible para el administrador general y el gerente de sucursal — **no para el operador de inventario** (su pantalla de inicio es Inventario). 5 KPIs con gráficas (Recharts): ventas del mes vs. anteriores; rotación de inventario con conmutador alta/baja demanda y rango de fechas (la vista de baja demanda incluye los productos activos sin ventas); transferencias activas con su desglose por estado (solicitada / en preparación / en tránsito / recibida parcial) y su impacto por producto; productos por reabastecer; comparativa entre sucursales (solo administrador general) |
| Alertas y auditoría | ✅ Completo | Notificaciones (`sy_notifications`) con **modelo de reconciliación**: la tabla refleja el estado pendiente actual (stock bajo / alto / en cero y faltantes de transferencia). Un criterio único (`NotificationService.reconcileStockNotification`) crea, reemplaza o **borra al instante** cada alerta según el nivel real, y lo dispara tanto cada movimiento / cambio de umbral / alta de producto como un chequeo programado (`@Scheduled`, por defecto cada 2 h entre las 7:00 y las 19:00) que además resurge las alertas leídas que siguen sin resolverse. El faltante de transferencia se borra al tratarlo. El mismo modelo genera **notificaciones de flujo de trabajo** (`V17`): una transferencia (`TRANSFER_PENDING`) o una orden de compra (`PURCHASE_ORDER_PENDING`) mientras esperan una acción, dirigidas a la sucursal que debe actuar y **solo visibles para el gerente de la sucursal y el administrador general** (el operador de inventario no las ve). Campana en el frontend (polling, filtro por tipo; al pulsar navega a la vista donde se atiende — Inventario de la sucursal con el producto filtrado, o el detalle de la transferencia u orden). Auditoría (`sy_audit_log`): interceptor genérico sobre eventos de Hibernate que registra cada alta/edición/baja del **catálogo de productos** (quién, cuándo y qué cambió — sección 3.1 del enunciado), con vista de consulta filtrable y diff antes/después para el administrador general; la vista resuelve el nombre y SKU del producto de cada evento (no solo su id), traduce a texto las asociaciones guardadas como id (categoría, unidad base) y muestra los nombres de campo en español. No audita inicios de sesión, ventas ni transferencias (esas tienen su propia trazabilidad: `tr_inventory_movements`, `tr_transfer_events`) |

Todos los módulos "Completo" tienen backend y frontend funcionales, verificados contra Docker/MySQL real y en navegador (no solo compilación). Único punto pendiente de diseño: la lista de precios es independiente de la sucursal (cualquier sucursal puede usar cualquier lista vigente) — ver la discusión en [`requirements/IA_EVIDENCIA.md`](requirements/IA_EVIDENCIA.md).

**Interfaz:** tema claro/oscuro alternable (botón sol/luna, persistido por navegador) y diseño responsive — el riel de navegación se colapsa a solo íconos en pantallas angostas y las tablas anchas hacen scroll dentro de su propio contenedor en vez de romper la página. Las altas y ediciones (proveedor, cliente, producto, orden de compra, venta, transferencia…) abren en ventana modal. El frontend está organizado por capas (ver el árbol de `src/` más arriba): cada módulo tiene un *controller* de clase con el estado en signals (`@preact/signals-react`), una capa de *services* con las llamadas al backend y una *page* que solo pinta el DOM.

## Seguridad

Checklist de la revisión básica de seguridad (sección 6.2 / reglas técnicas del enunciado).

| Punto | Estado | Cómo se cumple |
|---|---|---|
| Contraseñas nunca en respuestas de la API | ✅ | `password_hash` solo vive en la entidad `User`; el único DTO de salida (`UserResponse`) lo excluye explícitamente y ningún controller devuelve la entidad JPA directamente. Los refresh tokens se guardan hasheados (`token_hash`), nunca el valor en claro. |
| Contraseñas con hash | ✅ | BCrypt (`BCryptPasswordEncoder`). La contraseña de los usuarios de demo solo existe como hash BCrypt dentro de la migración `V4`, no en texto plano en el código. |
| Autorización por rol en el backend | ✅ | `@EnableMethodSecurity` + `SecurityFilterChain` con `anyRequest().authenticated()`; solo `/actuator/health`, `/api/auth/{login,refresh,logout}` y `/error` son públicos. Las restricciones por rol y por pertenencia a sucursal se validan en el service (`BranchAccessService`), no solo en el frontend. |
| JWT de acceso con expiración corta | ✅ | Access token de 15 min (`jwt.expiration=900000`) + refresh token persistido y rotado de 7 días, revocable en `logout` (`sy_refresh_tokens`). |
| CORS restringido al dominio del frontend | ✅ | `CorsConfigurationSource` con `setAllowedOrigins(<lista>)` desde `${cors.allowed-origins}` — **orígenes explícitos, nunca `*`**; por defecto `http://localhost:3000,http://localhost:5173`. Sin `allowCredentials` (innecesario con auth por header `Authorization: Bearer`). En un despliegue real se pasa el dominio público por variable de entorno. |
| Sin secretos hardcodeados | ⚠️ Consciente | En Docker (la ruta de evaluación) **todos** los secretos vienen del `.env` (`JWT_SECRET`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `CORS_ALLOWED_ORIGINS`). `application.properties` conserva *fallbacks* (`jwt.secret`, `spring.datasource.password`) **solo** para poder arrancar el backend desde el IDE sin `.env`; no se usan cuando el contenedor recibe las variables. Es una decisión deliberada documentada — para endurecerlo se puede quitar el default de `jwt.secret` y dejar que la app falle al arrancar sin él. |
| `.env` real fuera del repo | ✅ | `.env` está en `.gitignore` (raíz); solo se versiona `.env.example` con valores de plantilla. |

Sin pendientes críticos. El único punto abierto (fallbacks de `application.properties`) es intencional y no aplica en el despliegue por Docker.

## Datos de demostración

Al levantar el proyecto (`docker compose up`), Flyway crea el esquema **y** siembra datos mínimos automáticamente (`OPC-back/src/main/resources/db/migration/V4__seed_demo_data.sql`) — 3 sucursales, 6 usuarios (uno por rol y sucursal), 4 categorías, 4 unidades de medida, 10 productos y su inventario inicial en las 3 sucursales. No hace falta cargar nada a mano para probar los módulos.

**Todos los usuarios de demo comparten la misma contraseña** (ninguna credencial vive en código fuente — solo el hash BCrypt está en la migración):

| Rol | Email | Sucursal |
|---|---|---|
| Administrador general | `admin@opc.com` | Todas |
| Gerente de sucursal | `gerente.bogota@opc.com` | Bogotá |
| Gerente de sucursal | `gerente.medellin@opc.com` | Medellín |
| Operador de inventario | `operador.bogota@opc.com` | Bogotá |
| Operador de inventario | `operador.medellin@opc.com` | Medellín |
| Operador de inventario | `operador.cali@opc.com` | Cali |

**Password para todos:** `OpcDemo#2026`

El inventario sembrado incluye a propósito productos por debajo de `min_stock` y por encima de `max_stock` en varias sucursales, para poder probar las Alertas Inteligentes sin tener que forzar esos casos manualmente.

También viene sembrada una lista de precios ("Lista General", vigente y sin fecha de vencimiento) con precio asignado a la mayoría de los productos — se puede registrar una venta de prueba sin tener que crear una lista de precios primero.
