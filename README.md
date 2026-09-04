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
│       │   │                              # config, exception, y system/ (alerts = notificaciones de stock/faltantes
│       │   │                              # por reconciliación + chequeo programado; audit = interceptor genérico
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
| Compras | ✅ Completo | Proveedores; órdenes de compra con unidad de compra por línea (caja, etc.), precio por esa unidad, descuento por ítem en porcentaje y plazo de pago; al recibir, la cantidad y el costo se convierten a unidad base con el factor; ciclo de vida de la orden (borrador → enviada al proveedor → recibida / cancelada), edición mientras está en borrador; el listado agrupa las órdenes por estado (recibidas, pendientes por recibir, pendientes por enviar, canceladas); recepción total/parcial que actualiza inventario y recalcula el costo promedio ponderado; histórico de compras filtrable por proveedor, producto y rango de fechas |
| Ventas | ✅ Completo | Clientes, listas de precios (con vigencia por fecha), registro de venta con unidad de venta por línea (el precio de la lista es por unidad base y se multiplica por el factor), descuento por línea en porcentaje y validación de stock en unidad base (el formulario bloquea la confirmación si una línea supera el stock; el backend igual la rechaza), histórico filtrable con el responsable de cada venta, y comprobante por venta (encabezado + ítems + totales) para consulta posterior |
| Transferencias entre sucursales | ✅ Completo | Solicitud (bloqueada, con alerta, si la sucursal de origen no tiene existencias suficientes del producto), preparación, despacho, recepción completa/parcial con línea de tiempo visual; ante un faltante en la recepción parcial se define el tratamiento (reenvío / ajuste / reclamación), y el reenvío genera automáticamente una transferencia de seguimiento por lo que faltó. El operador de inventario solo consulta y solicita transferencias; preparar, despachar, recibir, tratar el faltante y clasificar la ruta son del gerente de la sucursal o el administrador general. Las fechas del envío se validan en cadena: la de despacho no puede ser anterior a la de la solicitud, y la de llegada no puede ser anterior a la de despacho. Cada sucursal solo ve las transferencias en las que participa como origen o destino (el administrador general ve todas). Logística (sección 3.5): la sucursal origen clasifica la ruta por prioridad (alta/media/baja) desde el detalle, el listado se filtra por esa prioridad, cada transferencia muestra sus tiempos estimados vs. reales de despacho y llegada con la desviación en días, y hay un reporte de cumplimiento logístico (% a tiempo por sucursal y prioridad de ruta) |
| Dashboard gerencial | ✅ Completo | Visible para el administrador general y el gerente de sucursal — **no para el operador de inventario** (su pantalla de inicio es Inventario). 5 KPIs con gráficas (Recharts): ventas del mes vs. anteriores; rotación de inventario con conmutador alta/baja demanda y rango de fechas (la vista de baja demanda incluye los productos activos sin ventas); transferencias activas con su desglose por estado (solicitada / en preparación / en tránsito / recibida parcial) y su impacto por producto; productos por reabastecer; comparativa entre sucursales (solo administrador general) |
| Alertas y auditoría | ✅ Completo | Notificaciones (`sy_notifications`) con **modelo de reconciliación**: la tabla refleja el estado pendiente actual (stock bajo / alto / en cero y faltantes de transferencia). Un criterio único (`NotificationService.reconcileStockNotification`) crea, reemplaza o **borra al instante** cada alerta según el nivel real, y lo dispara tanto cada movimiento / cambio de umbral / alta de producto como un chequeo programado (`@Scheduled`, por defecto cada 2 h entre las 7:00 y las 19:00) que además resurge las alertas leídas que siguen sin resolverse. El faltante de transferencia se borra al tratarlo. Campana en el frontend (polling, filtro por tipo; al pulsar navega a la vista donde se atiende — Inventario de la sucursal con el producto filtrado, o el detalle de la transferencia). Auditoría (`sy_audit_log`): interceptor genérico sobre eventos de Hibernate que registra cada alta/edición/baja del **catálogo de productos** (quién, cuándo y qué cambió — sección 3.1 del enunciado), con vista de consulta filtrable y diff antes/después para el administrador general; la vista resuelve el nombre y SKU del producto de cada evento (no solo su id), traduce a texto las asociaciones guardadas como id (categoría, unidad base) y muestra los nombres de campo en español. No audita inicios de sesión, ventas ni transferencias (esas tienen su propia trazabilidad: `tr_inventory_movements`, `tr_transfer_events`) |

Todos los módulos "Completo" tienen backend y frontend funcionales, verificados contra Docker/MySQL real y en navegador (no solo compilación). Único punto pendiente de diseño: la lista de precios es independiente de la sucursal (cualquier sucursal puede usar cualquier lista vigente) — ver la discusión en [`requirements/IA_EVIDENCIA.md`](requirements/IA_EVIDENCIA.md).

**Interfaz:** tema claro/oscuro alternable (botón sol/luna, persistido por navegador) y diseño responsive — el riel de navegación se colapsa a solo íconos en pantallas angostas y las tablas anchas hacen scroll dentro de su propio contenedor en vez de romper la página. Las altas y ediciones (proveedor, cliente, producto, orden de compra, venta, transferencia…) abren en ventana modal. El frontend está organizado por capas (ver el árbol de `src/` más arriba): cada módulo tiene un *controller* de clase con el estado en signals (`@preact/signals-react`), una capa de *services* con las llamadas al backend y una *page* que solo pinta el DOM.

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
