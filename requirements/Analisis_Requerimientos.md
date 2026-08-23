# Análisis de Requerimientos — Sistema de Inventario Multi-Sucursal (OptiPlant Consultores)

> Documento de análisis interno del equipo de desarrollo. Interpreta y desglosa `Prueba Tecnica Inventario.pdf` sección por sección, y revisa el prototipo de base de datos (`Prototipo_DB.pdf`) frente a esos requerimientos.
> Stack decidido: **Backend Java 17 + Spring Boot 3 · Frontend React (Vite) · Base de datos MySQL · Orquestación Docker Compose.**

---

## 1. Resumen ejecutivo

La prueba pide un sistema de inventario **multi-sucursal**: cada sucursal opera de forma autónoma en sus transacciones locales, pero toda la red comparte visibilidad de inventario en tiempo real o near-real-time, puede consultar el stock de cualquier otra sucursal y puede solicitar/recibir transferencias entre nodos.

El principio rector del PDF es explícito: **"cada decisión de diseño debe poder responder claramente a la pregunta '¿por qué se hizo así?'"**. Esto significa que el entregable no es solo código funcional — es código funcional **con justificación documentada** de cada decisión técnica. Este documento existe precisamente para dejar esas justificaciones por escrito antes de escribir la primera línea de código.

Decisiones de arquitectura ya tomadas (detalladas y justificadas en la sección 9 de este documento):

| Decisión | Elegido | Alternativas descartadas |
|---|---|---|
| Sincronización de inventario entre sucursales | **Base de datos MySQL única y compartida**, consultada vía REST | Una BD por sucursal + réplica/eventos (mucho mayor complejidad, innecesaria para el alcance) |
| Autenticación/autorización | **JWT de acceso (corta duración) + refresh token persistido en BD** con Spring Security | JWT stateless sin refresh (más simple, pero sin forma de revocar una sesión comprometida antes de que expire); sesiones de servidor |
| Acceso del Administrador general a todas las sucursales | Tabla intermedia **`MA_USER_BRANCH` (N:M)** | `branch_id` nullable en `MA_USERS` |
| Registro de clientes en Ventas | Tabla **`MA_CUSTOMERS`** formal | Texto libre (`customer_name`) |
| Funcionalidad(es) adicional(es) a implementar (sección 4 del PDF) | **Alertas inteligentes** + **Auditoría y trazabilidad** | Predicción de demanda, control de caducidad, gestión de proveedores extendida, reportes exportables |

Con una sola base de datos compartida por todas las sucursales, el requisito de "tiempo real o near-real-time" se cumple de forma natural: no hay que sincronizar nada entre sistemas distintos, porque todos los nodos leen y escriben sobre el mismo dato. La "autonomía operativa por sucursal" no es aislamiento de datos, sino aislamiento **lógico** (cada operación queda asociada a `branch_id`, y los permisos de rol limitan qué puede modificar cada usuario).

---

## 2. Análisis punto por punto de la prueba técnica

### 2.1 Descripción del problema y alcance (sección 2 del PDF)

- **Cada sucursal opera de forma independiente en sus transacciones locales** → cada movimiento, venta, compra y transferencia lleva `branch_id`. Las reglas de negocio (ej. validar stock antes de vender) se evalúan siempre contra el inventario de la sucursal del usuario autenticado, no contra el total de la red.
- **Comparte información en tiempo real / near-real-time** → cubierto por la BD compartida (ver decisión arriba). No se requiere mensajería ni colas para cumplir este punto en el alcance de la prueba.
- **Puede consultar el inventario de cualquier otra sucursal** → implica un endpoint de solo lectura tipo `GET /inventario?sucursalId={id}` accesible entre sucursales, distinto del endpoint de edición (que sí debe estar restringido a la sucursal propia salvo rol admin).
- **Puede solicitar y recibir transferencias** → cubierto por el módulo 3.4 (ver abajo).

### 2.2 Módulo de Gestión de Inventario — CRUD completo (sección 3.1)

Requisitos explícitos del PDF y su interpretación técnica:

| Requisito del PDF | Interpretación / diseño |
|---|---|
| Visualizar catálogo de la sucursal propia | `GET /api/inventario` filtrado por `branch_id` del usuario autenticado |
| Consultar inventario de otra sucursal | `GET /api/inventario/sucursal/{id}` — mismo dato, filtro explícito por parámetro |
| Registrar ingreso (compras, devoluciones, ajustes) | Inserta fila en `TR_INVENTORY_MOVEMENTS` con `movement_type` correspondiente y actualiza `current_quantity` en `TR_INVENTORY` dentro de la misma transacción |
| Registrar retiro (ventas, mermas, ajustes) | Igual al anterior con `movement_type` de salida |
| Controlar stock mínimo y alertar reabastecimiento | Comparación `current_quantity < min_stock` — alimenta el módulo de Alertas Inteligentes (funcionalidad adicional elegida) |
| Múltiples unidades de medida por producto | Ya resuelto en el DER vía `MA_UNITS` + `MA_PRODUCT_UNITS` (factor de conversión, unidad de compra vs. unidad de venta) |
| **Trazabilidad completa** ("Importante" del PDF): fecha, responsable, motivo y cantidad en cada movimiento | Ya resuelto en `TR_INVENTORY_MOVEMENTS` (`movement_date`, `responsible_user_id`, `reason`, `quantity`) |

**Regla de negocio clave a implementar en el backend:** ningún endpoint debe permitir modificar `TR_INVENTORY.current_quantity` directamente. Todo cambio de stock debe pasar por la creación de un `TR_INVENTORY_MOVEMENTS` (patrón *event-sourcing parcial*: la tabla de movimientos es la fuente de verdad, `TR_INVENTORY` es una vista materializada/caché del saldo actual). Esto es lo que hace posible la trazabilidad exigida sin lógica adicional.

### 2.3 Módulo de Compras (sección 3.2)

| Requisito del PDF | Interpretación / diseño |
|---|---|
| Crear y gestionar órdenes de compra a proveedores | `TR_PURCHASE_ORDERS` + `TR_PURCHASE_ORDER_ITEMS` (ya en el DER) |
| Condiciones de compra: precio unitario, descuentos, plazo de pago | Ya en el DER (`unit_price`, `discount`, `payment_terms`) |
| Actualizar inventario automáticamente al confirmar recepción | `TR_PURCHASE_RECEIPTS` + `TR_PURCHASE_RECEIPT_ITEMS` generan movimientos de tipo `PURCHASE` en `TR_INVENTORY_MOVEMENTS`; soporta **recepción parcial** (una orden puede tener varias recepciones) |
| Histórico de compras por proveedor y por producto | Consulta agregada sobre `TR_PURCHASE_ORDERS` ⋈ `TR_PURCHASE_ORDER_ITEMS`, sin tablas nuevas |
| Costo promedio ponderado | Ya en el DER (`TR_INVENTORY.weighted_avg_cost`); se recalcula en cada recepción: `nuevo_costo = (current_stock*current_cost + received_quantity*unit_cost) / (current_stock + received_quantity)` |

### 2.4 Módulo de Ventas (sección 3.3)

| Requisito del PDF | Interpretación / diseño |
|---|---|
| Registrar venta por producto, cantidad, precio | `TR_SALES` + `TR_SALE_ITEMS` |
| Asociar venta a sucursal, fecha, responsable | Ya en el DER (`branch_id`, `sale_date`, `seller_id`) |
| Validar stock antes de confirmar | Validación de negocio en el service de Ventas: rechazar si `requested_quantity > TR_INVENTORY.current_quantity` |
| Descuentos y listas de precios | Ya en el DER (`MA_PRICE_LISTS`, `MA_PRICE_LIST_ITEMS`, `discount_pct`) |
| Comprobantes / registro para consulta posterior | La fila de `TR_SALES` + `TR_SALE_ITEMS` ya es el comprobante consultable; el "módulo de reportes exportables" (funcionalidad adicional no elegida) sería lo que lo convierte a PDF/Excel — **no está en el alcance actual**, se deja como extensión futura |

### 2.5 Módulo de Transferencia de Productos entre Sucursales (sección 3.4)

El PDF describe un flujo de **5 pasos** explícito. Se mapea 1:1 contra el DER:

1. **Solicitud** (producto, cantidad, origen) → crea `TR_TRANSFERS` (`status = REQUESTED`) + `TR_TRANSFER_ITEMS` (`requested_quantity`)
2. **Preparación del envío** (origen revisa/ajusta cantidad) → actualiza `TR_TRANSFER_ITEMS.shipped_quantity`, `TR_TRANSFERS.status = IN_PREPARATION`
3. **Registro de envío** (fecha estimada, transportista) → `TR_TRANSFERS.status = IN_TRANSIT`, `actual_dispatch_date`, `carrier`, `estimated_arrival_date`
4. **Confirmación de recepción completa** → `TR_TRANSFERS.status = FULLY_RECEIVED`, genera movimiento `TRANSFER_OUT` en origen y `TRANSFER_IN` en destino
5. **Confirmación de recepción parcial** (faltantes, alerta, tratamiento) → `TR_TRANSFER_ITEMS.received_quantity` + `difference`, `TR_TRANSFERS.status = PARTIALLY_RECEIVED`, dispara una notificación (módulo de Alertas)

Cada cambio de paso queda además registrado en `TR_TRANSFER_EVENTS` (historial de estados con notas), lo cual es justamente lo que pide 3.5 para "visualizar el estado de cada transferencia en curso".

**Definición pendiente:** los valores del ENUM `TR_TRANSFERS.status` deben ser exactamente: `REQUESTED, IN_PREPARATION, IN_TRANSIT, FULLY_RECEIVED, PARTIALLY_RECEIVED, CANCELLED`.

### 2.6 Módulo de Tiempos de Envío y Logística (sección 3.5)

| Requisito del PDF | Interpretación / diseño |
|---|---|
| Tiempos estimados vs. reales | Ya en el DER: `estimated_dispatch_date` vs `actual_dispatch_date`, `estimated_arrival_date` vs `actual_arrival_date` |
| Clasificar rutas por prioridad, costo o tiempo | `route_priority` existe pero como `VARCHAR(30)` libre → **se recomienda convertir a ENUM** (`HIGH, MEDIUM, LOW`) para que el dashboard pueda agrupar de forma confiable (ver sección 9 de este documento) |
| Estado de cada transferencia en curso | `TR_TRANSFERS.status` + historial en `TR_TRANSFER_EVENTS` |
| Reportes de cumplimiento logístico por sucursal/ruta | Consulta agregada: `% transferencias con actual_arrival_date <= estimated_arrival_date`, agrupado por `origin_branch_id` — no requiere tablas nuevas |

### 2.7 Dashboard / Análisis y Visualización (sección 3.6)

Los 5 indicadores mínimos que pide el PDF, y de dónde sale cada uno sin tablas nuevas (todo es agregación sobre datos ya modelados):

1. Ventas del mes vs. meses anteriores → `SUM(TR_SALES.total)` agrupado por mes, filtrado por `branch_id`
2. Rotación de inventario, alta/baja demanda → `SUM(quantity)` de `TR_INVENTORY_MOVEMENTS` (tipo `SALE`) por producto en un rango de fechas
3. Transferencias activas y su impacto en inventario → `COUNT(*)` de `TR_TRANSFERS` con `status NOT IN (FULLY_RECEIVED, CANCELLED)`
4. Productos próximos a agotarse → `TR_INVENTORY` donde `current_quantity <= min_stock` (mismo criterio que las Alertas Inteligentes)
5. Comparativa entre sucursales (solo perfiles administrativos) → mismas consultas 1–4 pero sin filtrar por `branch_id`, restringido por rol `GENERAL_ADMIN` a nivel de autorización en el backend

**Nota de rendimiento:** estas consultas se benefician de índices sobre `sale_date`, `movement_date` y `order_date` (ver sección 9.5).

### 2.8 Funcionalidad adicional (sección 4)

El PDF pide implementar **al menos una**. Se eligieron **dos**: Alertas inteligentes y Auditoría y trazabilidad. Justificación de la elección (para el README):

- **Alertas inteligentes**: reutiliza directamente el dato de `min_stock` que ya existe en el DER, tiene alto valor operativo declarado por el propio PDF, y es una extensión natural del módulo de inventario que de todos modos hay que construir.
- **Auditoría y trazabilidad**: el PDF ya exige trazabilidad de movimientos de inventario como requisito obligatorio (sección 3.1); extenderla a un log genérico sobre todo el sistema (usuarios, precios, órdenes) es un incremento de esfuerzo bajo con un impacto alto en la evaluación ("esencial para cumplimiento", según la propia tabla del PDF).

Diseño de ambas: ver sección 9.3 y 9.4 de este documento (revisión del DER).

### 2.9 Reglas técnicas obligatorias (sección 5)

| Regla | Cómo se cumple |
|---|---|
| Separación de capas (frontend / backend / BD) | React (SPA) ↔ API REST Spring Boot ↔ MySQL — tres procesos independientes en Docker |
| Comunicación exclusivamente por API, sin lógica de negocio en el cliente | React solo llama a la API y renderiza; toda validación de reglas (stock, permisos, cálculo de costos) vive en el backend |
| Contenedorización — un solo comando | `docker compose up` debe levantar `mysql`, `backend` y `frontend`; sin pasos manuales de configuración |
| Stack libre pero justificado | Ver sección 9.1 |

### 2.10 Ingeniería de software requerida (sección 6)

Este documento cubre 6.1 (requerimientos funcionales/no funcionales — secciones 3 y 4 más abajo), 6.2 (actores — sección 5) y 6.3 (historias de usuario — sección 6). El backlog de tareas (`Tareas_Trello.md`) convierte esto en tarjetas ejecutables.

### 2.11 Modelado del sistema (sección 7)

Los 4 diagramas obligatorios (casos de uso, actividad, arquitectura, E-R) **no se generan en este documento** — quedan como tarea explícita en el backlog (épica "Documentación de Ingeniería"), a producir con Mermaid o PlantUML una vez el diseño esté validado.

### 2.12 Arquitectura y diseño técnico (sección 8)

Cubierto en la sección 9 de este documento (decisiones técnicas a documentar, tal como las pide el punto 8.2 del PDF: lenguaje de backend, motor de BD, autenticación, sincronización, patrones de diseño).

### 2.13 Uso de Inteligencia Artificial (sección 9)

El PDF exige evidencia explícita: herramientas usadas, prompts concretos, evaluación crítica y % de código asistido. **Esto debe documentarse de forma continua durante el desarrollo**, no reconstruirse al final — se recomienda llevar un archivo `IA_EVIDENCIA.md` desde el primer commit, con una entrada por sesión de trabajo relevante.

### 2.14 Entregables esperados (sección 10)

Checklist de lo que el repositorio final debe contener: repo público con historial de commits representativo, código fuente limpio (sin `.env`/`node_modules`), `docker-compose.yml` funcional con instrucciones, README completo, los 4 diagramas, y la sección de evidencia de IA. Ver checklist final en el backlog (épica "Entregables Finales, QA y Cierre").

### 2.15 Orden de trabajo sugerido (sección 12)

El PDF sugiere: arquitectura → modelado BD/diagramas → Docker → backend → frontend → funcionalidad adicional → documentación. El backlog de Trello sigue este mismo orden como guía de prioridad entre épicas, aunque las tarjetas dentro de cada módulo (backend+frontend) se agrupan juntas para facilitar el trabajo por feature completa.

---

## 3. Requerimientos funcionales consolidados

**Inventario**
- RF-01: Listar productos/stock de la sucursal del usuario autenticado.
- RF-02: Consultar el inventario de cualquier otra sucursal (solo lectura).
- RF-03: Registrar ingresos de stock (compra, devolución, ajuste positivo) con trazabilidad completa.
- RF-04: Registrar retiros de stock (venta, merma, ajuste negativo) con trazabilidad completa.
- RF-05: Configurar `min_stock` y `max_stock` por producto y sucursal, y calcular su estado de alerta.
- RF-06: Gestionar múltiples unidades de medida por producto con factor de conversión y distinción compra/venta.

**Compras**
- RF-07: Crear y gestionar órdenes de compra a proveedores con ítems, precios y descuentos.
- RF-08: Registrar recepción total o parcial de una orden de compra, actualizando inventario automáticamente.
- RF-09: Calcular costo promedio ponderado al recibir mercancía.
- RF-10: Consultar histórico de compras por proveedor y por producto.

**Ventas**
- RF-11: Registrar ventas con validación de stock disponible antes de confirmar.
- RF-12: Aplicar listas de precios y descuentos por ítem.
- RF-13: Registrar cliente de la venta (tabla `MA_CUSTOMERS`) o venta de mostrador sin cliente registrado.
- RF-14: Consultar histórico de ventas por sucursal, producto y responsable.

**Transferencias**
- RF-15: Solicitar transferencia de producto entre sucursales indicando cantidad y urgencia.
- RF-16: Preparar/ajustar el envío desde la sucursal origen.
- RF-17: Registrar despacho con transportista y fecha estimada de llegada.
- RF-18: Confirmar recepción completa o parcial, generando alerta cuando hay faltantes.
- RF-19: Consultar historial de estados de cada transferencia.

**Logística**
- RF-20: Clasificar rutas de transferencia por prioridad.
- RF-21: Reportar cumplimiento logístico (tiempo estimado vs. real) por sucursal y ruta.

**Dashboard**
- RF-22: Mostrar ventas del mes en curso vs. meses anteriores.
- RF-23: Mostrar rotación de inventario y productos de alta/baja demanda.
- RF-24: Mostrar transferencias activas y su impacto en inventario.
- RF-25: Mostrar productos próximos a agotarse.
- RF-26: Mostrar comparativa entre sucursales (solo rol `GENERAL_ADMIN`).

**Alertas inteligentes**
- RF-27: Generar notificación cuando `current_quantity` cruza `min_stock` o `max_stock`.
- RF-28: Listar y marcar como leídas las notificaciones del usuario/sucursal.

**Auditoría y trazabilidad**
- RF-29: Registrar automáticamente cada creación/actualización/eliminación relevante (usuario, entidad, acción, valores antes/después, fecha).
- RF-30: Consultar el log de auditoría filtrando por entidad, usuario o rango de fechas (solo rol `GENERAL_ADMIN`).

**Seguridad y accesos**
- RF-31: Autenticación vía JWT; cada endpoint valida rol y, cuando aplique, pertenencia a sucursal.
- RF-32: Un usuario puede tener acceso a una o varias sucursales (`MA_USER_BRANCH`); el rol `GENERAL_ADMIN` ve todas sin necesidad de asignación explícita.

---

## 4. Requerimientos no funcionales

| Categoría | Requerimiento |
|---|---|
| Rendimiento | Los endpoints de consulta de inventario y dashboard deben responder en <500ms con datasets de prueba (miles de movimientos); requiere índices sobre columnas de fecha y FKs usadas en filtros. |
| Seguridad | Contraseñas con hash (BCrypt), tokens JWT con expiración corta, autorización por rol a nivel de endpoint (no solo en el frontend), sin secretos hardcodeados (variables de entorno vía Docker Compose). |
| Escalabilidad | El diseño de BD única compartida es suficiente para el número de sucursales del alcance de la prueba; si creciera a decenas de sucursales con alto volumen, se documentará como limitación conocida (ver sección 6, Supuestos). |
| Usabilidad | Frontend responsivo (al menos desktop + tablet), mensajes de error claros ante validaciones de negocio (ej. stock insuficiente), estados de carga visibles. |
| Disponibilidad | El sistema corre en un único `docker compose up`; no se exige alta disponibilidad (fuera del alcance de una prueba técnica). |
| Auditabilidad | Todo movimiento de inventario y toda acción relevante sobre el sistema debe quedar registrada con usuario, fecha y motivo (cubierto por `TR_INVENTORY_MOVEMENTS` + `SY_AUDIT_LOG`). |
| Mantenibilidad | Backend organizado en capas (Controller/Service/Repository), uso de DTOs para no exponer entidades JPA directamente en la API. |

---

## 5. Restricciones técnicas y de negocio

- Stack fijo por decisión del candidato: Java 17 + Spring Boot, React, MySQL — no se evalúan alternativas dentro de este proyecto.
- Toda la solución debe levantar con un único comando `docker compose up`, sin configuración manual adicional.
- El frontend no puede contener lógica de negocio (validaciones de stock, cálculo de totales, reglas de transferencia); esas reglas viven exclusivamente en el backend.
- No se requiere integración real con un ERP/POS externo; el PDF lo marca como actor **opcional** — se deja el punto de extensión (API REST ya cumple ese rol) pero no se implementa un conector concreto.
- El repositorio debe ser público en GitHub, sin archivos de entorno ni dependencias versionadas (`.env`, `node_modules`, `target/`).

---

## 6. Supuestos y dependencias

- Se asume **una sola organización** con **N sucursales**, todas dentro del mismo país/moneda (no se modela multi-moneda ni multi-tenant real).
- Se asume que "tiempo real o near-real-time" se satisface con una base de datos compartida consultada por REST (sin WebSockets ni colas de eventos), decisión ya validada con el usuario.
- Se asume que el catálogo de productos es compartido por toda la red (un mismo `MA_PRODUCTS.sku` existe en todas las sucursales), y lo que varía por sucursal es únicamente el saldo de `TR_INVENTORY`. Esto es coherente con el DER actual (no hay tabla de "productos por sucursal").
- Se asume que un usuario con rol `BRANCH_MANAGER` u `INVENTORY_OPERATOR` puede tener acceso a **una o varias** sucursales (de ahí la tabla N:M `MA_USER_BRANCH`), y que `GENERAL_ADMIN` no necesita filas en esa tabla porque su acceso es implícito por rol.
- Dependencia externa: ninguna (no se integra con pasarelas de pago, correo real, ni servicios de mapas/logística de terceros). El envío de alertas por correo, si se implementa, puede simularse con un servicio SMTP de pruebas (ej. Mailhog en Docker) para no depender de credenciales externas reales.

---

## 7. Actores y casos de uso

| Actor | Responsabilidades | Acceso a sucursales |
|---|---|---|
| **Administrador general** | Gestiona configuración, usuarios, sucursales; visibilidad total del sistema; único rol con acceso al log de auditoría y a la comparativa entre sucursales del dashboard. | Todas (implícito por rol) |
| **Gerente de sucursal** | Supervisa operaciones de su(s) sucursal(es), aprueba transferencias entrantes/salientes, consulta reportes y dashboard de su sucursal. | Una o varias, vía `MA_USER_BRANCH` |
| **Operador de inventario** | Realiza ingresos/retiros de stock, solicita transferencias, registra ventas y recepciones de compra. | Una o varias, vía `MA_USER_BRANCH` |
| **Sistema externo (opcional)** | Punto de extensión vía API REST para integración futura con ERP/POS; no se implementa un conector concreto en esta entrega. | N/A |

---

## 8. Historias de usuario

Las 3 propuestas por el PDF (sección 6.3), tal cual:

> Como operador de inventario, quiero registrar el ingreso de productos con su precio de compra, para mantener el costo promedio del inventario actualizado y generar órdenes de pago a proveedores.

> Como gerente de sucursal, quiero ver en un dashboard la comparativa de ventas entre el mes actual y los tres meses anteriores, para identificar tendencias y tomar decisiones de compra anticipadas.

> Como operador de inventario, quiero solicitar la transferencia de un producto desde otra sucursal con indicación de urgencia, para que la sucursal origen pueda priorizar el despacho según disponibilidad.

Adicionales, para las dos funcionalidades elegidas:

> Como operador de inventario, quiero recibir una notificación cuando un producto cae por debajo de su stock mínimo, para poder generar una orden de compra antes de quedarme sin inventario.

> Como administrador general, quiero recibir una alerta cuando un producto supera su stock máximo configurado, para identificar sobre-stock y evitar capital inmovilizado.

> Como administrador general, quiero consultar el registro de auditoría de una entidad específica (ej. un producto o una orden de compra), para saber quién la modificó, cuándo y qué cambió exactamente.

---

## 9. Revisión del prototipo de base de datos

Se revisó `Prototipo_DB.pdf` — DER con 20 entidades: `MA_BRANCHES, MA_USERS, TR_INVENTORY, TR_INVENTORY_MOVEMENTS, TR_PURCHASE_ORDERS, TR_PURCHASE_ORDER_ITEMS, TR_PURCHASE_RECEIPTS, TR_PURCHASE_RECEIPT_ITEMS, TR_SALES, TR_SALE_ITEMS, TR_TRANSFERS, TR_TRANSFER_ITEMS, TR_TRANSFER_EVENTS, MA_SUPPLIERS, MA_PRODUCTS, MA_CATEGORIES, MA_UNITS, MA_PRODUCT_UNITS, MA_PRICE_LISTS, MA_PRICE_LIST_ITEMS`.

### 9.1 Lo que ya está bien resuelto (y por qué no tocarlo)

- **`TR_INVENTORY_MOVEMENTS` con `reference_type`/`reference_id` polimórfico**: permite que un movimiento apunte a una venta, una compra, una transferencia o un ajuste sin necesitar 4 columnas FK nullable distintas. Es el patrón correcto para "una tabla, múltiples orígenes posibles" y es justamente lo que da la trazabilidad completa que el PDF exige en 3.1. *Trade-off a documentar*: al ser polimórfico, MySQL no puede validar la integridad referencial de `reference_id` a nivel de FK — la validación de que el `reference_id` referenciado existe debe hacerse en el service layer del backend.
- **`TR_INVENTORY` como saldo + `TR_INVENTORY_MOVEMENTS` como historial**: patrón correcto de "vista materializada + log de eventos". Evita recalcular el stock sumando todo el historial en cada consulta, pero conserva el detalle completo para auditoría.
- **`MA_PRODUCT_UNITS` + `MA_UNITS` + `MA_PRODUCTS.base_unit_id`**: resuelve exactamente el requisito de "múltiples unidades de medida por producto" (ej. comprar en cajas, vender en unidades) con `conversion_factor` y flags `is_purchase_unit`/`is_sale_unit`. No requiere cambios.
- **`TR_PURCHASE_RECEIPTS` + `TR_PURCHASE_RECEIPT_ITEMS` separadas de `TR_PURCHASE_ORDER_ITEMS`**: permite que una orden se reciba en varias entregas parciales, cada una con su propio detalle de cantidades recibidas. Correcto y necesario — una sola tabla de recepción no soportaría entregas parciales múltiples.
- **`TR_TRANSFERS` (snapshot de fechas clave + estado) + `TR_TRANSFER_EVENTS` (historial completo de cambios de estado)**: no es redundante — `TR_TRANSFERS` da acceso rápido a las fechas que necesita el reporte de cumplimiento logístico (3.5), mientras `TR_TRANSFER_EVENTS` da la traza completa de "en preparación → en tránsito → recibido/con faltantes" que pide el dashboard (3.6). Mantener ambas.
- **`MA_PRICE_LISTS` + `MA_PRICE_LIST_ITEMS`**: cubre "gestionar diferentes listas de precios" (3.3) de forma limpia, con vigencia por fecha (`start_date`/`end_date`).
- **`weighted_avg_cost` en `TR_INVENTORY`**: cubre directamente el requisito explícito de 3.2.

### 9.2 Qué agregar — nuevas tablas y columnas

| Cambio | Motivo |
|---|---|
| **Tabla `SY_NOTIFICATIONS`** | Requerida por la funcionalidad "Alertas inteligentes" elegida. Columnas: `id, type ENUM(LOW_STOCK, HIGH_STOCK, TRANSFER_SHORTAGE), branch_id FK, product_id FK NULL, message VARCHAR(255), channel ENUM(IN_APP, EMAIL), status ENUM(PENDING, SENT, READ), recipient_user_id FK NULL, generated_at DATETIME, read_at DATETIME NULL`. |
| **`TR_INVENTORY.max_stock DECIMAL(15,4)`** | El PDF pide alertar "cuando un producto **supera o cae por debajo** de umbrales configurables" (sección 4, tabla de "Alertas inteligentes") — el prototipo solo tiene `min_stock`. Sin esta columna no se puede cumplir la mitad del requisito. |
| **Tabla `SY_AUDIT_LOG`** | Requerida por la funcionalidad "Auditoría y trazabilidad" elegida. Es un log **genérico** (usuarios, productos, precios, órdenes...), distinto de `TR_INVENTORY_MOVEMENTS` que es específico de stock. Columnas: `id, entity VARCHAR(60), entity_id BIGINT, action ENUM(CREATE, UPDATE, DELETE, LOGIN), user_id FK, old_values JSON NULL, new_values JSON NULL, event_date DATETIME`. |
| **Tabla `MA_USER_BRANCH` (N:M)** | `MA_USERS.branch_id` como FK único no permite modelar un gerente con acceso a varias sucursales, ni un `GENERAL_ADMIN` con acceso a "todas" sin insertar una fila por sucursal (frágil ante nuevas sucursales). Columnas: `id, user_id FK, branch_id FK, UNIQUE(user_id, branch_id)`. Regla de aplicación: si el rol del usuario es `GENERAL_ADMIN`, el backend concede acceso a todas las sucursales sin consultar esta tabla; para los otros dos roles, se exige al menos una fila. Esto **elimina** la columna `MA_USERS.branch_id` (se reemplaza, no se suma). |
| **Tabla `MA_ROLES`** | Los roles dejan de modelarse como `ENUM` en `MA_USERS` y pasan a ser una tabla maestra — permite administrar roles (agregar uno nuevo, describirlo) sin una migración de esquema, y es coherente con tratarlos como dato maestro (categoría `MA_`) en vez de un valor cerrado en código. Columnas: `id, code VARCHAR(40) UNIQUE, name VARCHAR(100), description VARCHAR(255), created_at DATETIME`. En `MA_USERS`: reemplazar la columna `role` por `role_id BIGINT FK` → `MA_ROLES`. Semilla inicial: `GENERAL_ADMIN`, `BRANCH_MANAGER`, `INVENTORY_OPERATOR`. |
| **Tabla `MA_CUSTOMERS`** | `TR_SALES.customer_name` como texto libre no permite reportes por cliente ni datos de contacto/identificación fiscal. Columnas: `id, name VARCHAR(150), document_type VARCHAR(20) NULL, document_number VARCHAR(50) NULL, phone VARCHAR(30) NULL, email VARCHAR(150) NULL, active BOOLEAN, created_at DATETIME`. En `TR_SALES`: reemplazar `customer_name` por `customer_id BIGINT FK NULL` (nullable para venta de mostrador sin cliente registrado). |
| **`updated_at DATETIME`** en `MA_PRODUCTS`, `MA_SUPPLIERS`, `MA_USERS`, `MA_BRANCHES`, `MA_CATEGORIES`, `MA_PRICE_LISTS` | Hoy solo tienen `created_at`. Es una columna barata que complementa a `SY_AUDIT_LOG` para saber "cuándo cambió por última vez" sin tener que consultar el log completo. |
| **`TR_TRANSFERS.route_priority`**: cambiar de `VARCHAR(30)` a `ENUM('HIGH','MEDIUM','LOW')` | El PDF pide "clasificar rutas por prioridad" (3.5) — con texto libre, el dashboard no puede agrupar de forma confiable (riesgo de "Alta", "alta", "HIGH " como valores distintos). |
| **Definir explícitamente los valores de los ENUM ya presentes pero vacíos en el prototipo** | `TR_PURCHASE_ORDERS.status` → `DRAFT, SENT, PARTIALLY_RECEIVED, FULLY_RECEIVED, CANCELLED`. `TR_SALES.status` → `CONFIRMED, VOIDED`. `TR_TRANSFERS.status` → ver sección 2.5. `TR_TRANSFERS.urgency` → `LOW, MEDIUM, HIGH, CRITICAL`. `TR_INVENTORY_MOVEMENTS.movement_type` → `PURCHASE, SALE, RETURN, POSITIVE_ADJUSTMENT, NEGATIVE_ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT`. `TR_PURCHASE_RECEIPTS.receipt_type` → `FULL, PARTIAL`. (Los roles de `MA_USERS` ya **no** son un ENUM — ver `MA_ROLES` arriba). |
| **Tabla `SY_REFRESH_TOKENS`** | Requerida tras revisar la estrategia de autenticación (ver tabla de decisiones, sección 1): se pasó de JWT stateless puro a **access token de corta duración + refresh token persistido**, precisamente para poder revocar una sesión comprometida sin esperar a que expire el access token. Columnas: `id, user_id FK, token_hash VARCHAR(255) UNIQUE, expires_at DATETIME, revoked BOOLEAN, created_at DATETIME, user_agent VARCHAR(255) NULL`. Se guarda el *hash* del token, nunca el valor en claro (mismo criterio que `password_hash` en `MA_USERS`). |

### 9.3 Qué **no** agregar (para no sobre-diseñar)

- **No** se necesita una tabla `DEVOLUCIONES` aparte: se cubre con `TR_INVENTORY_MOVEMENTS.movement_type = RETURN` + `reference_type/reference_id` apuntando a la venta o compra original. Agregar una tabla dedicada sería duplicar lo que el patrón polimórfico ya resuelve.
- **No** se necesita tabla `TRANSPORTISTAS`: el PDF solo pide registrar el transportista como dato del envío (ya existe `TR_TRANSFERS.carrier VARCHAR(150)`); modelarlo como entidad aparte con evaluación de desempeño no está pedido y sería alcance no solicitado (ese nivel de detalle sí aplicaría si se hubiera elegido la funcionalidad "Gestión de proveedores extendida", que no fue la elegida).
- **No** se necesita IVA/impuestos por ítem en `TR_PURCHASE_ORDER_ITEMS`/`TR_SALE_ITEMS`: el PDF no lo menciona en ningún módulo obligatorio; añadirlo ahora sería scope creep.
- **No** se necesita una tabla de sesiones completa (con estado, IP, expiración por sesión, etc.): con `SY_REFRESH_TOKENS` alcanza — el access token sigue siendo stateless (no se persiste), solo el refresh token vive en BD para poder revocarlo.
- **No** se necesita tabla `PROVEEDOR_PRODUCTO` (catálogo producto-proveedor con condiciones comerciales): eso es específico de la funcionalidad "Gestión de proveedores extendida", que no fue una de las dos elegidas.
- **No** se necesita tabla `LOTES` con fecha de vencimiento: eso es específico de "Control de caducidad", que tampoco fue elegida.

### 9.4 Resumen de cambios al DER

| Tabla | Acción | Motivo |
|---|---|---|
| `SY_NOTIFICATIONS` | **Agregar** | Alertas inteligentes |
| `SY_AUDIT_LOG` | **Agregar** | Auditoría y trazabilidad |
| `MA_USER_BRANCH` | **Agregar** | Reemplaza `MA_USERS.branch_id`; soporta admin general y accesos multi-sucursal |
| `MA_CUSTOMERS` | **Agregar** | Reemplaza `TR_SALES.customer_name` por relación formal |
| `SY_REFRESH_TOKENS` | **Agregar** | Soporta el cambio a JWT + refresh token (revocación de sesiones) |
| `MA_ROLES` | **Agregar** | Reemplaza el `ENUM` de rol en `MA_USERS` por una tabla maestra administrable |
| `TR_INVENTORY` | **Modificar** | Agregar `max_stock` |
| `TR_SALES` | **Modificar** | Reemplazar `customer_name` por `customer_id` FK nullable |
| `MA_USERS` | **Modificar** | Quitar `branch_id`, quitar el `ENUM role`, agregar `role_id` FK → `MA_ROLES`, agregar `updated_at` |
| `TR_TRANSFERS` | **Modificar** | `route_priority` de VARCHAR a ENUM |
| `MA_PRODUCTS`, `MA_SUPPLIERS`, `MA_BRANCHES`, `MA_CATEGORIES`, `MA_PRICE_LISTS` | **Modificar** | Agregar `updated_at` |
| Todas las demás (11 tablas: `TR_INVENTORY_MOVEMENTS`, `TR_PURCHASE_ORDERS`, `TR_PURCHASE_ORDER_ITEMS`, `TR_PURCHASE_RECEIPTS`, `TR_PURCHASE_RECEIPT_ITEMS`, `TR_SALE_ITEMS`, `TR_TRANSFER_ITEMS`, `TR_TRANSFER_EVENTS`, `MA_UNITS`, `MA_PRODUCT_UNITS`, `MA_PRICE_LIST_ITEMS`) | **Mantener** | Ya cubren correctamente su requisito correspondiente, sin cambios |

### 9.5 Recomendaciones adicionales (no estructurales)

- Índices recomendados para las consultas del dashboard: `TR_INVENTORY_MOVEMENTS(movement_date)`, `TR_SALES(sale_date)`, `TR_PURCHASE_ORDERS(order_date)`, y compuestos `TR_INVENTORY_MOVEMENTS(branch_id, product_id)`.
- Mantener el patrón de "borrado lógico" ya presente (`active`/`active` BOOLEAN en `MA_PRODUCTS`, `MA_SUPPLIERS`, `MA_BRANCHES`, `MA_CATEGORIES`, `MA_PRICE_LISTS`, `MA_USERS`) también para la nueva tabla `MA_CUSTOMERS` — no usar `DELETE` físico sobre entidades con historial transaccional asociado.

---

## 10. Próximos pasos (fuera de este documento)

- [ ] Backlog de tareas para Trello — ver `Tareas_Trello.md` (mismo repositorio).
- [ ] Diagrama de casos de uso (Mermaid/PlantUML).
- [ ] Diagrama de actividades: flujo de venta y flujo de transferencia entre sucursales.
- [ ] Diagrama de arquitectura (capas, servicios, BD, Docker).
- [ ] Diagrama entidad-relación actualizado con los cambios de la sección 9.4.
- [ ] Archivo `IA_EVIDENCIA.md` con prompts, herramientas y evaluación crítica del uso de IA durante el desarrollo.
