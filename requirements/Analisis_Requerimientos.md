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
| Acceso del Administrador general a todas las sucursales | Tabla intermedia **`usuario_sucursal` (N:M)** | `sucursal_id` nullable en `USUARIOS` |
| Registro de clientes en Ventas | Tabla **`CLIENTES`** formal | Texto libre (`cliente_nombre`) |
| Funcionalidad(es) adicional(es) a implementar (sección 4 del PDF) | **Alertas inteligentes** + **Auditoría y trazabilidad** | Predicción de demanda, control de caducidad, gestión de proveedores extendida, reportes exportables |

Con una sola base de datos compartida por todas las sucursales, el requisito de "tiempo real o near-real-time" se cumple de forma natural: no hay que sincronizar nada entre sistemas distintos, porque todos los nodos leen y escriben sobre el mismo dato. La "autonomía operativa por sucursal" no es aislamiento de datos, sino aislamiento **lógico** (cada operación queda asociada a `sucursal_id`, y los permisos de rol limitan qué puede modificar cada usuario).

---

## 2. Análisis punto por punto de la prueba técnica

### 2.1 Descripción del problema y alcance (sección 2 del PDF)

- **Cada sucursal opera de forma independiente en sus transacciones locales** → cada movimiento, venta, compra y transferencia lleva `sucursal_id`. Las reglas de negocio (ej. validar stock antes de vender) se evalúan siempre contra el inventario de la sucursal del usuario autenticado, no contra el total de la red.
- **Comparte información en tiempo real / near-real-time** → cubierto por la BD compartida (ver decisión arriba). No se requiere mensajería ni colas para cumplir este punto en el alcance de la prueba.
- **Puede consultar el inventario de cualquier otra sucursal** → implica un endpoint de solo lectura tipo `GET /inventario?sucursalId={id}` accesible entre sucursales, distinto del endpoint de edición (que sí debe estar restringido a la sucursal propia salvo rol admin).
- **Puede solicitar y recibir transferencias** → cubierto por el módulo 3.4 (ver abajo).

### 2.2 Módulo de Gestión de Inventario — CRUD completo (sección 3.1)

Requisitos explícitos del PDF y su interpretación técnica:

| Requisito del PDF | Interpretación / diseño |
|---|---|
| Visualizar catálogo de la sucursal propia | `GET /api/inventario` filtrado por `sucursal_id` del usuario autenticado |
| Consultar inventario de otra sucursal | `GET /api/inventario/sucursal/{id}` — mismo dato, filtro explícito por parámetro |
| Registrar ingreso (compras, devoluciones, ajustes) | Inserta fila en `INVENTARIO_MOVIMIENTOS` con `tipo_movimiento` correspondiente y actualiza `cantidad_actual` en `INVENTARIO` dentro de la misma transacción |
| Registrar retiro (ventas, mermas, ajustes) | Igual al anterior con `tipo_movimiento` de salida |
| Controlar stock mínimo y alertar reabastecimiento | Comparación `cantidad_actual < stock_minimo` — alimenta el módulo de Alertas Inteligentes (funcionalidad adicional elegida) |
| Múltiples unidades de medida por producto | Ya resuelto en el DER vía `UNIDADES_MEDIDA` + `PRODUCTO_UNIDADES` (factor de conversión, unidad de compra vs. unidad de venta) |
| **Trazabilidad completa** ("Importante" del PDF): fecha, responsable, motivo y cantidad en cada movimiento | Ya resuelto en `INVENTARIO_MOVIMIENTOS` (`fecha_movimiento`, `usuario_responsable_id`, `motivo`, `cantidad`) |

**Regla de negocio clave a implementar en el backend:** ningún endpoint debe permitir modificar `INVENTARIO.cantidad_actual` directamente. Todo cambio de stock debe pasar por la creación de un `INVENTARIO_MOVIMIENTOS` (patrón *event-sourcing parcial*: la tabla de movimientos es la fuente de verdad, `INVENTARIO` es una vista materializada/caché del saldo actual). Esto es lo que hace posible la trazabilidad exigida sin lógica adicional.

### 2.3 Módulo de Compras (sección 3.2)

| Requisito del PDF | Interpretación / diseño |
|---|---|
| Crear y gestionar órdenes de compra a proveedores | `ORDENES_COMPRA` + `ORDENES_COMPRA_ITEMS` (ya en el DER) |
| Condiciones de compra: precio unitario, descuentos, plazo de pago | Ya en el DER (`precio_unitario`, `descuento`, `plazo_pago`) |
| Actualizar inventario automáticamente al confirmar recepción | `RECEPCIONES_COMPRA` + `RECEPCIONES_COMPRA_ITEMS` generan movimientos de tipo `COMPRA` en `INVENTARIO_MOVIMIENTOS`; soporta **recepción parcial** (una orden puede tener varias recepciones) |
| Histórico de compras por proveedor y por producto | Consulta agregada sobre `ORDENES_COMPRA` ⋈ `ORDENES_COMPRA_ITEMS`, sin tablas nuevas |
| Costo promedio ponderado | Ya en el DER (`INVENTARIO.costo_promedio_ponderado`); se recalcula en cada recepción: `nuevo_costo = (stock_actual*costo_actual + cantidad_recibida*costo_unitario) / (stock_actual + cantidad_recibida)` |

### 2.4 Módulo de Ventas (sección 3.3)

| Requisito del PDF | Interpretación / diseño |
|---|---|
| Registrar venta por producto, cantidad, precio | `VENTAS` + `VENTAS_ITEMS` |
| Asociar venta a sucursal, fecha, responsable | Ya en el DER (`sucursal_id`, `fecha_venta`, `vendedor_id`) |
| Validar stock antes de confirmar | Validación de negocio en el service de Ventas: rechazar si `cantidad_solicitada > INVENTARIO.cantidad_actual` |
| Descuentos y listas de precios | Ya en el DER (`LISTAS_PRECIOS`, `LISTAS_PRECIOS_ITEMS`, `descuento_pct`) |
| Comprobantes / registro para consulta posterior | La fila de `VENTAS` + `VENTAS_ITEMS` ya es el comprobante consultable; el "módulo de reportes exportables" (funcionalidad adicional no elegida) sería lo que lo convierte a PDF/Excel — **no está en el alcance actual**, se deja como extensión futura |

### 2.5 Módulo de Transferencia de Productos entre Sucursales (sección 3.4)

El PDF describe un flujo de **5 pasos** explícito. Se mapea 1:1 contra el DER:

1. **Solicitud** (producto, cantidad, origen) → crea `TRANSFERENCIAS` (`estado = SOLICITADA`) + `TRANSFERENCIAS_ITEMS` (`cantidad_solicitada`)
2. **Preparación del envío** (origen revisa/ajusta cantidad) → actualiza `TRANSFERENCIAS_ITEMS.cantidad_enviada`, `TRANSFERENCIAS.estado = EN_PREPARACION`
3. **Registro de envío** (fecha estimada, transportista) → `TRANSFERENCIAS.estado = EN_TRANSITO`, `fecha_despacho_real`, `transportista`, `fecha_estimada_llegada`
4. **Confirmación de recepción completa** → `TRANSFERENCIAS.estado = RECIBIDA_COMPLETA`, genera movimiento `TRANSFERENCIA_SALIDA` en origen y `TRANSFERENCIA_ENTRADA` en destino
5. **Confirmación de recepción parcial** (faltantes, alerta, tratamiento) → `TRANSFERENCIAS_ITEMS.cantidad_recibida` + `diferencia`, `TRANSFERENCIAS.estado = RECIBIDA_PARCIAL`, dispara una notificación (módulo de Alertas)

Cada cambio de paso queda además registrado en `TRANSFERENCIAS_EVENTOS` (historial de estados con notas), lo cual es justamente lo que pide 3.5 para "visualizar el estado de cada transferencia en curso".

**Definición pendiente:** los valores del ENUM `TRANSFERENCIAS.estado` deben ser exactamente: `SOLICITADA, EN_PREPARACION, EN_TRANSITO, RECIBIDA_COMPLETA, RECIBIDA_PARCIAL, CANCELADA`.

### 2.6 Módulo de Tiempos de Envío y Logística (sección 3.5)

| Requisito del PDF | Interpretación / diseño |
|---|---|
| Tiempos estimados vs. reales | Ya en el DER: `fecha_estimada_despacho` vs `fecha_despacho_real`, `fecha_estimada_llegada` vs `fecha_llegada_real` |
| Clasificar rutas por prioridad, costo o tiempo | `prioridad_ruta` existe pero como `VARCHAR(30)` libre → **se recomienda convertir a ENUM** (`ALTA, MEDIA, BAJA`) para que el dashboard pueda agrupar de forma confiable (ver sección 9 de este documento) |
| Estado de cada transferencia en curso | `TRANSFERENCIAS.estado` + historial en `TRANSFERENCIAS_EVENTOS` |
| Reportes de cumplimiento logístico por sucursal/ruta | Consulta agregada: `% transferencias con fecha_llegada_real <= fecha_estimada_llegada`, agrupado por `sucursal_origen_id` — no requiere tablas nuevas |

### 2.7 Dashboard / Análisis y Visualización (sección 3.6)

Los 5 indicadores mínimos que pide el PDF, y de dónde sale cada uno sin tablas nuevas (todo es agregación sobre datos ya modelados):

1. Ventas del mes vs. meses anteriores → `SUM(VENTAS.total)` agrupado por mes, filtrado por `sucursal_id`
2. Rotación de inventario, alta/baja demanda → `SUM(cantidad)` de `INVENTARIO_MOVIMIENTOS` (tipo `VENTA`) por producto en un rango de fechas
3. Transferencias activas y su impacto en inventario → `COUNT(*)` de `TRANSFERENCIAS` con `estado NOT IN (RECIBIDA_COMPLETA, CANCELADA)`
4. Productos próximos a agotarse → `INVENTARIO` donde `cantidad_actual <= stock_minimo` (mismo criterio que las Alertas Inteligentes)
5. Comparativa entre sucursales (solo perfiles administrativos) → mismas consultas 1–4 pero sin filtrar por `sucursal_id`, restringido por rol `ADMIN_GENERAL` a nivel de autorización en el backend

**Nota de rendimiento:** estas consultas se benefician de índices sobre `fecha_venta`, `fecha_movimiento` y `fecha_orden` (ver sección 9.5).

### 2.8 Funcionalidad adicional (sección 4)

El PDF pide implementar **al menos una**. Se eligieron **dos**: Alertas inteligentes y Auditoría y trazabilidad. Justificación de la elección (para el README):

- **Alertas inteligentes**: reutiliza directamente el dato de `stock_minimo` que ya existe en el DER, tiene alto valor operativo declarado por el propio PDF, y es una extensión natural del módulo de inventario que de todos modos hay que construir.
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
- RF-05: Configurar `stock_minimo` y `stock_maximo` por producto y sucursal, y calcular su estado de alerta.
- RF-06: Gestionar múltiples unidades de medida por producto con factor de conversión y distinción compra/venta.

**Compras**
- RF-07: Crear y gestionar órdenes de compra a proveedores con ítems, precios y descuentos.
- RF-08: Registrar recepción total o parcial de una orden de compra, actualizando inventario automáticamente.
- RF-09: Calcular costo promedio ponderado al recibir mercancía.
- RF-10: Consultar histórico de compras por proveedor y por producto.

**Ventas**
- RF-11: Registrar ventas con validación de stock disponible antes de confirmar.
- RF-12: Aplicar listas de precios y descuentos por ítem.
- RF-13: Registrar cliente de la venta (tabla `CLIENTES`) o venta de mostrador sin cliente registrado.
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
- RF-26: Mostrar comparativa entre sucursales (solo rol `ADMIN_GENERAL`).

**Alertas inteligentes**
- RF-27: Generar notificación cuando `cantidad_actual` cruza `stock_minimo` o `stock_maximo`.
- RF-28: Listar y marcar como leídas las notificaciones del usuario/sucursal.

**Auditoría y trazabilidad**
- RF-29: Registrar automáticamente cada creación/actualización/eliminación relevante (usuario, entidad, acción, valores antes/después, fecha).
- RF-30: Consultar el log de auditoría filtrando por entidad, usuario o rango de fechas (solo rol `ADMIN_GENERAL`).

**Seguridad y accesos**
- RF-31: Autenticación vía JWT; cada endpoint valida rol y, cuando aplique, pertenencia a sucursal.
- RF-32: Un usuario puede tener acceso a una o varias sucursales (`usuario_sucursal`); el rol `ADMIN_GENERAL` ve todas sin necesidad de asignación explícita.

---

## 4. Requerimientos no funcionales

| Categoría | Requerimiento |
|---|---|
| Rendimiento | Los endpoints de consulta de inventario y dashboard deben responder en <500ms con datasets de prueba (miles de movimientos); requiere índices sobre columnas de fecha y FKs usadas en filtros. |
| Seguridad | Contraseñas con hash (BCrypt), tokens JWT con expiración corta, autorización por rol a nivel de endpoint (no solo en el frontend), sin secretos hardcodeados (variables de entorno vía Docker Compose). |
| Escalabilidad | El diseño de BD única compartida es suficiente para el número de sucursales del alcance de la prueba; si creciera a decenas de sucursales con alto volumen, se documentará como limitación conocida (ver sección 6, Supuestos). |
| Usabilidad | Frontend responsivo (al menos desktop + tablet), mensajes de error claros ante validaciones de negocio (ej. stock insuficiente), estados de carga visibles. |
| Disponibilidad | El sistema corre en un único `docker compose up`; no se exige alta disponibilidad (fuera del alcance de una prueba técnica). |
| Auditabilidad | Todo movimiento de inventario y toda acción relevante sobre el sistema debe quedar registrada con usuario, fecha y motivo (cubierto por `INVENTARIO_MOVIMIENTOS` + `AUDITORIA`). |
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
- Se asume que el catálogo de productos es compartido por toda la red (un mismo `PRODUCTOS.sku` existe en todas las sucursales), y lo que varía por sucursal es únicamente el saldo de `INVENTARIO`. Esto es coherente con el DER actual (no hay tabla de "productos por sucursal").
- Se asume que un usuario con rol `GERENTE_SUCURSAL` u `OPERADOR_INVENTARIO` puede tener acceso a **una o varias** sucursales (de ahí la tabla N:M `usuario_sucursal`), y que `ADMIN_GENERAL` no necesita filas en esa tabla porque su acceso es implícito por rol.
- Dependencia externa: ninguna (no se integra con pasarelas de pago, correo real, ni servicios de mapas/logística de terceros). El envío de alertas por correo, si se implementa, puede simularse con un servicio SMTP de pruebas (ej. Mailhog en Docker) para no depender de credenciales externas reales.

---

## 7. Actores y casos de uso

| Actor | Responsabilidades | Acceso a sucursales |
|---|---|---|
| **Administrador general** | Gestiona configuración, usuarios, sucursales; visibilidad total del sistema; único rol con acceso al log de auditoría y a la comparativa entre sucursales del dashboard. | Todas (implícito por rol) |
| **Gerente de sucursal** | Supervisa operaciones de su(s) sucursal(es), aprueba transferencias entrantes/salientes, consulta reportes y dashboard de su sucursal. | Una o varias, vía `usuario_sucursal` |
| **Operador de inventario** | Realiza ingresos/retiros de stock, solicita transferencias, registra ventas y recepciones de compra. | Una o varias, vía `usuario_sucursal` |
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

Se revisó `Prototipo_DB.pdf` — DER con 20 entidades: `SUCURSALES, USUARIOS, INVENTARIO, INVENTARIO_MOVIMIENTOS, ORDENES_COMPRA, ORDENES_COMPRA_ITEMS, RECEPCIONES_COMPRA, RECEPCIONES_COMPRA_ITEMS, VENTAS, VENTAS_ITEMS, TRANSFERENCIAS, TRANSFERENCIAS_ITEMS, TRANSFERENCIAS_EVENTOS, PROVEEDORES, PRODUCTOS, CATEGORIAS_PRODUCTO, UNIDADES_MEDIDA, PRODUCTO_UNIDADES, LISTAS_PRECIOS, LISTAS_PRECIOS_ITEMS`.

### 9.1 Lo que ya está bien resuelto (y por qué no tocarlo)

- **`INVENTARIO_MOVIMIENTOS` con `reference_type`/`reference_id` polimórfico**: permite que un movimiento apunte a una venta, una compra, una transferencia o un ajuste sin necesitar 4 columnas FK nullable distintas. Es el patrón correcto para "una tabla, múltiples orígenes posibles" y es justamente lo que da la trazabilidad completa que el PDF exige en 3.1. *Trade-off a documentar*: al ser polimórfico, MySQL no puede validar la integridad referencial de `reference_id` a nivel de FK — la validación de que el `reference_id` referenciado existe debe hacerse en el service layer del backend.
- **`INVENTARIO` como saldo + `INVENTARIO_MOVIMIENTOS` como historial**: patrón correcto de "vista materializada + log de eventos". Evita recalcular el stock sumando todo el historial en cada consulta, pero conserva el detalle completo para auditoría.
- **`PRODUCTO_UNIDADES` + `UNIDADES_MEDIDA` + `PRODUCTOS.unidad_base_id`**: resuelve exactamente el requisito de "múltiples unidades de medida por producto" (ej. comprar en cajas, vender en unidades) con `factor_conversion` y flags `es_unidad_compra`/`es_unidad_venta`. No requiere cambios.
- **`RECEPCIONES_COMPRA` + `RECEPCIONES_COMPRA_ITEMS` separadas de `ORDENES_COMPRA_ITEMS`**: permite que una orden se reciba en varias entregas parciales, cada una con su propio detalle de cantidades recibidas. Correcto y necesario — una sola tabla de recepción no soportaría entregas parciales múltiples.
- **`TRANSFERENCIAS` (snapshot de fechas clave + estado) + `TRANSFERENCIAS_EVENTOS` (historial completo de cambios de estado)**: no es redundante — `TRANSFERENCIAS` da acceso rápido a las fechas que necesita el reporte de cumplimiento logístico (3.5), mientras `TRANSFERENCIAS_EVENTOS` da la traza completa de "en preparación → en tránsito → recibido/con faltantes" que pide el dashboard (3.6). Mantener ambas.
- **`LISTAS_PRECIOS` + `LISTAS_PRECIOS_ITEMS`**: cubre "gestionar diferentes listas de precios" (3.3) de forma limpia, con vigencia por fecha (`fecha_inicio`/`fecha_fin`).
- **`costo_promedio_ponderado` en `INVENTARIO`**: cubre directamente el requisito explícito de 3.2.

### 9.2 Qué agregar — nuevas tablas y columnas

| Cambio | Motivo |
|---|---|
| **Tabla `NOTIFICACIONES`** | Requerida por la funcionalidad "Alertas inteligentes" elegida. Columnas: `id, tipo ENUM(STOCK_BAJO, STOCK_ALTO, TRANSFERENCIA_FALTANTE), sucursal_id FK, producto_id FK NULL, mensaje VARCHAR(255), canal ENUM(IN_APP, EMAIL), estado ENUM(PENDIENTE, ENVIADA, LEIDA), destinatario_usuario_id FK NULL, fecha_generada DATETIME, fecha_leida DATETIME NULL`. |
| **`INVENTARIO.stock_maximo DECIMAL(15,4)`** | El PDF pide alertar "cuando un producto **supera o cae por debajo** de umbrales configurables" (sección 4, tabla de "Alertas inteligentes") — el prototipo solo tiene `stock_minimo`. Sin esta columna no se puede cumplir la mitad del requisito. |
| **Tabla `AUDITORIA`** | Requerida por la funcionalidad "Auditoría y trazabilidad" elegida. Es un log **genérico** (usuarios, productos, precios, órdenes...), distinto de `INVENTARIO_MOVIMIENTOS` que es específico de stock. Columnas: `id, entidad VARCHAR(60), entidad_id BIGINT, accion ENUM(CREATE, UPDATE, DELETE, LOGIN), usuario_id FK, valores_anteriores JSON NULL, valores_nuevos JSON NULL, fecha_evento DATETIME`. |
| **Tabla `USUARIO_SUCURSAL` (N:M)** | `USUARIOS.sucursal_id` como FK único no permite modelar un gerente con acceso a varias sucursales, ni un `ADMIN_GENERAL` con acceso a "todas" sin insertar una fila por sucursal (frágil ante nuevas sucursales). Columnas: `id, usuario_id FK, sucursal_id FK, UNIQUE(usuario_id, sucursal_id)`. Regla de aplicación: si `rol = ADMIN_GENERAL`, el backend concede acceso a todas las sucursales sin consultar esta tabla; para los otros dos roles, se exige al menos una fila. Esto **elimina** la columna `USUARIOS.sucursal_id` (se reemplaza, no se suma). |
| **Tabla `CLIENTES`** | `VENTAS.cliente_nombre` como texto libre no permite reportes por cliente ni datos de contacto/identificación fiscal. Columnas: `id, nombre VARCHAR(150), tipo_documento VARCHAR(20) NULL, numero_documento VARCHAR(50) NULL, telefono VARCHAR(30) NULL, email VARCHAR(150) NULL, activo BOOLEAN, created_at DATETIME`. En `VENTAS`: reemplazar `cliente_nombre` por `cliente_id BIGINT FK NULL` (nullable para venta de mostrador sin cliente registrado). |
| **`updated_at DATETIME`** en `PRODUCTOS`, `PROVEEDORES`, `USUARIOS`, `SUCURSALES`, `CATEGORIAS_PRODUCTO`, `LISTAS_PRECIOS` | Hoy solo tienen `created_at`. Es una columna barata que complementa a `AUDITORIA` para saber "cuándo cambió por última vez" sin tener que consultar el log completo. |
| **`TRANSFERENCIAS.prioridad_ruta`**: cambiar de `VARCHAR(30)` a `ENUM('ALTA','MEDIA','BAJA')` | El PDF pide "clasificar rutas por prioridad" (3.5) — con texto libre, el dashboard no puede agrupar de forma confiable (riesgo de "Alta", "alta", "ALTA " como valores distintos). |
| **Definir explícitamente los valores de los ENUM ya presentes pero vacíos en el prototipo** | `USUARIOS.rol` → `ADMIN_GENERAL, GERENTE_SUCURSAL, OPERADOR_INVENTARIO`. `ORDENES_COMPRA.estado` → `BORRADOR, ENVIADA, RECIBIDA_PARCIAL, RECIBIDA_TOTAL, CANCELADA`. `VENTAS.estado` → `CONFIRMADA, ANULADA`. `TRANSFERENCIAS.estado` → ver sección 2.5. `TRANSFERENCIAS.urgencia` → `BAJA, MEDIA, ALTA, CRITICA`. `INVENTARIO_MOVIMIENTOS.tipo_movimiento` → `COMPRA, VENTA, DEVOLUCION, AJUSTE_POSITIVO, AJUSTE_NEGATIVO, TRANSFERENCIA_ENTRADA, TRANSFERENCIA_SALIDA`. `RECEPCIONES_COMPRA.tipo_recepcion` → `TOTAL, PARCIAL`. |
| **Tabla `REFRESH_TOKENS`** | Requerida tras revisar la estrategia de autenticación (ver tabla de decisiones, sección 1): se pasó de JWT stateless puro a **access token de corta duración + refresh token persistido**, precisamente para poder revocar una sesión comprometida sin esperar a que expire el access token. Columnas: `id, usuario_id FK, token_hash VARCHAR(255) UNIQUE, expira_en DATETIME, revocado BOOLEAN, creado_en DATETIME, user_agent VARCHAR(255) NULL`. Se guarda el *hash* del token, nunca el valor en claro (mismo criterio que `password_hash` en `USUARIOS`). |

### 9.3 Qué **no** agregar (para no sobre-diseñar)

- **No** se necesita una tabla `DEVOLUCIONES` aparte: se cubre con `INVENTARIO_MOVIMIENTOS.tipo_movimiento = DEVOLUCION` + `reference_type/reference_id` apuntando a la venta o compra original. Agregar una tabla dedicada sería duplicar lo que el patrón polimórfico ya resuelve.
- **No** se necesita tabla `TRANSPORTISTAS`: el PDF solo pide registrar el transportista como dato del envío (ya existe `TRANSFERENCIAS.transportista VARCHAR(150)`); modelarlo como entidad aparte con evaluación de desempeño no está pedido y sería alcance no solicitado (ese nivel de detalle sí aplicaría si se hubiera elegido la funcionalidad "Gestión de proveedores extendida", que no fue la elegida).
- **No** se necesita IVA/impuestos por ítem en `ORDENES_COMPRA_ITEMS`/`VENTAS_ITEMS`: el PDF no lo menciona en ningún módulo obligatorio; añadirlo ahora sería scope creep.
- **No** se necesita una tabla de sesiones completa (con estado, IP, expiración por sesión, etc.): con `REFRESH_TOKENS` alcanza — el access token sigue siendo stateless (no se persiste), solo el refresh token vive en BD para poder revocarlo.
- **No** se necesita tabla `PROVEEDOR_PRODUCTO` (catálogo producto-proveedor con condiciones comerciales): eso es específico de la funcionalidad "Gestión de proveedores extendida", que no fue una de las dos elegidas.
- **No** se necesita tabla `LOTES` con fecha de vencimiento: eso es específico de "Control de caducidad", que tampoco fue elegida.

### 9.4 Resumen de cambios al DER

| Tabla | Acción | Motivo |
|---|---|---|
| `NOTIFICACIONES` | **Agregar** | Alertas inteligentes |
| `AUDITORIA` | **Agregar** | Auditoría y trazabilidad |
| `USUARIO_SUCURSAL` | **Agregar** | Reemplaza `USUARIOS.sucursal_id`; soporta admin general y accesos multi-sucursal |
| `CLIENTES` | **Agregar** | Reemplaza `VENTAS.cliente_nombre` por relación formal |
| `REFRESH_TOKENS` | **Agregar** | Soporta el cambio a JWT + refresh token (revocación de sesiones) |
| `INVENTARIO` | **Modificar** | Agregar `stock_maximo` |
| `VENTAS` | **Modificar** | Reemplazar `cliente_nombre` por `cliente_id` FK nullable |
| `USUARIOS` | **Modificar** | Quitar `sucursal_id`, agregar `updated_at` |
| `TRANSFERENCIAS` | **Modificar** | `prioridad_ruta` de VARCHAR a ENUM |
| `PRODUCTOS`, `PROVEEDORES`, `SUCURSALES`, `CATEGORIAS_PRODUCTO`, `LISTAS_PRECIOS` | **Modificar** | Agregar `updated_at` |
| Todas las demás (11 tablas: `INVENTARIO_MOVIMIENTOS`, `ORDENES_COMPRA`, `ORDENES_COMPRA_ITEMS`, `RECEPCIONES_COMPRA`, `RECEPCIONES_COMPRA_ITEMS`, `VENTAS_ITEMS`, `TRANSFERENCIAS_ITEMS`, `TRANSFERENCIAS_EVENTOS`, `UNIDADES_MEDIDA`, `PRODUCTO_UNIDADES`, `LISTAS_PRECIOS_ITEMS`) | **Mantener** | Ya cubren correctamente su requisito correspondiente, sin cambios |

### 9.5 Recomendaciones adicionales (no estructurales)

- Índices recomendados para las consultas del dashboard: `INVENTARIO_MOVIMIENTOS(fecha_movimiento)`, `VENTAS(fecha_venta)`, `ORDENES_COMPRA(fecha_orden)`, y compuestos `INVENTARIO_MOVIMIENTOS(sucursal_id, producto_id)`.
- Mantener el patrón de "borrado lógico" ya presente (`activo`/`activa` BOOLEAN en `PRODUCTOS`, `PROVEEDORES`, `SUCURSALES`, `CATEGORIAS_PRODUCTO`, `LISTAS_PRECIOS`, `USUARIOS`) también para la nueva tabla `CLIENTES` — no usar `DELETE` físico sobre entidades con historial transaccional asociado.

---

## 10. Próximos pasos (fuera de este documento)

- [ ] Backlog de tareas para Trello — ver `Tareas_Trello.md` (mismo repositorio).
- [ ] Diagrama de casos de uso (Mermaid/PlantUML).
- [ ] Diagrama de actividades: flujo de venta y flujo de transferencia entre sucursales.
- [ ] Diagrama de arquitectura (capas, servicios, BD, Docker).
- [ ] Diagrama entidad-relación actualizado con los cambios de la sección 9.4.
- [ ] Archivo `IA_EVIDENCIA.md` con prompts, herramientas y evaluación crítica del uso de IA durante el desarrollo.
