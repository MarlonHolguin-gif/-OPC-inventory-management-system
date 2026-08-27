# Evidencia de Uso de Inteligencia Artificial en el Desarrollo

> Responde a la sección 9 de `Prueba Tecnica Inventario.pdf`: herramientas usadas, prompts concretos, evaluación crítica y estimación del porcentaje de código/documentación generado con asistencia de IA.
> Es un documento **vivo**: se actualiza a medida que avanza el desarrollo, no se reconstruye al final. Lo que sigue refleja el trabajo real hecho hasta ahora — no son ejemplos ilustrativos, son extractos genuinos de las sesiones de desarrollo de este proyecto.

---

## 1. Herramientas utilizadas y en qué etapa

| Herramienta | Etapa del desarrollo |
|---|---|
| **Claude Code** (Sonnet 5), como agente de CLI con acceso a lectura/escritura de archivos, ejecución de comandos (Maven, npm, Docker, Git) y búsqueda web | Todo el desarrollo hasta ahora: análisis de requerimientos, diseño de arquitectura, modelado de datos, backend, frontend, infraestructura Docker, documentación |
| **Búsqueda web** (dentro de la misma sesión de Claude) | Verificar hechos que exceden el conocimiento de entrenamiento del modelo antes de actuar sobre ellos — ver ejemplos en la sección 2.6 |
| **Artifacts de Claude** (renderizado de diagramas Mermaid) | Visualización intermedia del DER para revisión conjunta antes de comprometerlo como archivo del repositorio |
| **Playwright** (instalado como proyecto npm desacoplado del repo, con el binario de Chromium cacheado localmente) | Verificación real en navegador de cada pantalla nueva del frontend (login, catálogo, formularios de movimientos/compras/ventas) — clic por clic, con capturas de pantalla — en vez de asumir que el código React "se ve bien" por lectura. Ver sección 2.10 |
| **Cliente MySQL vía `docker exec`** | Verificación directa contra la base de datos real después de cada endpoint que escribe datos (conteo de filas antes/después, inspección de columnas) — el mecanismo que expuso los dos bugs de Hibernate de la sección 2.9 |
| **MCP de Trello** (lectura y escritura directa del tablero real) | Auditar el backlog completo (99 tarjetas) para confirmar o descartar gaps reportados por el usuario, y crear las tarjetas nuevas que resultaron de esa auditoría — ver sección 2.11 |

---

## 2. Ejemplos concretos de prompts y resultados, por área

### 2.1 Diseño de arquitectura — *Impacto: Alto*

**Prompt (resumido):** *"Analiza el PDF de la prueba técnica y crea un reporte punto por punto de los requerimientos... analiza también mi prototipo de base de datos y dime qué le agregarías y qué le quitarías... hazme preguntas sobre todo lo que tengas dudas."*

**Resultado:** `Analisis_Requerimientos.md` (desglose de las 12 secciones del PDF, RF/RNF, actores, historias de usuario) y la revisión completa del DER (qué mantener, qué agregar — `NOTIFICACIONES`, `AUDITORIA`, `USUARIO_SUCURSAL`, `CLIENTES` — y qué **no** agregar para no sobre-diseñar).

**Cómo se dirigió el resultado:** antes de aceptar cualquier recomendación de esquema o arquitectura, el modelo presentó las decisiones abiertas como preguntas de opción múltiple (sincronización entre sucursales, estrategia de autenticación, modelado del admin general, etc.) en vez de decidir unilateralmente. Ver evaluación crítica (3.2) para un caso donde esa primera recomendación se corrigió después.

### 2.2 Generación de código — *Impacto: Alto*

**Prompt (resumido):** *"Verificar/completar las dependencias base del proyecto OPC-back: Spring Web, Spring Data JPA, Spring Security, MySQL Driver, Validation, Lombok... y hazme preguntas sobre lo que se va a cambiar."*

**Resultado:** dependencia `spring-boot-starter-actuator` agregada al `pom.xml`, `SecurityConfig.java` (bean `Customizer<HttpSecurity>`), configuración de `application.properties` vía variables de entorno, `Dockerfile` multi-stage para el backend, y en el frontend: `httpClient.js` (interceptores axios), `AuthProvider`/`useAuth`, `ProtectedRoute`, `LoginPage`/`DashboardPage`, enrutamiento en `App.jsx`.

### 2.3 Generación de tests — *Impacto: Alto*

**Prompt (resumido):** *"Tests del servicio de movimientos de inventario"* (tarjeta del backlog, criterios de aceptación: registrar ingreso/retiro actualiza cantidad correctamente, retiro con stock insuficiente es rechazado, recalcula costo promedio ponderado en ingresos).

**Resultado:** `InventoryMovementServiceTest` (4 casos, Mockito puro) y, más tarde, `PurchaseReceiptServiceTest` (2 casos, construyendo un `InventoryMovementService` real con sus repositorios mockeados para probar la cadena completa recepción→movimiento→recálculo de costo con números concretos: 50 unidades a 100 + 10 unidades a 200 → costo promedio 116.6666667).

**Hallazgo honesto durante esta tarjeta:** al sentarse a escribir los tests, salió a la luz que `InventoryMovementService` **todavía no implementaba** la validación de stock suficiente ni el recálculo de costo promedio ponderado, pese a que las tarjetas anteriores ya los pedían como criterio de aceptación. La tarjeta de "tests" terminó siendo, en la práctica, la que forzó a completar la implementación real antes de poder probarla — un patrón que se repitió después en Compras (endpoint de reactivar proveedor faltante) y en Ventas (ver sección 2.9).

**Corrección de proceso, con el usuario como origen:** Tests de Ventas: el usuario dicta primero los casos de negocio y los números exactos esperados, y la IA solo los traduce a código Mockito/JUnit, verificando cada número contra la fórmula antes de aceptarlo — el mismo trato que ya existía de facto para el 116.6666667 de Compras, pero ahora hecho explícito y aplicado desde el planteamiento del caso, no solo en la revisión final.

**Resultado con ese protocolo:** `SaleServiceTest` (6 casos). Los números de entrada de los 3 primeros casos los dio el usuario sin ayuda — *"Chocorramo, cantidad 10, precio unitario 3500"*; *"Pastel, cantidad 20, precio 15000, descuento 20%"*; y un tercer caso con 3 productos donde, ante una ambigüedad real en su propia especificación (a cuál de dos productos aplicar el 10% de descuento), se le presentaron las 3 combinaciones posibles con su resultado ya calculado para que eligiera con números reales delante en vez de una descripción abstracta. Los otros 3 casos (lista no vigente, producto sin precio en la lista, venta de mostrador) sí los planteó la IA, con el usuario solo confirmando el alcance.

**Por qué esto sí cambia el impacto real, no solo la etiqueta:** en `InventoryMovementServiceTest` y `PurchaseReceiptServiceTest`, tanto el escenario a probar como el número exacto salieron de la IA a partir del criterio de aceptación de la tarjeta. En `SaleServiceTest`, la mitad de los casos y sus números fueron decisión del usuario antes de que la IA escribiera una sola línea de código de test.

### 2.4 Documentación técnica — *Impacto: Alto*

Esta área tuvo dos dinámicas distintas dentro del mismo proyecto, y vale la pena distinguirlas en vez de presentarlas como si fueran iguales:

**a) `Justificacion_Stack_Tecnologico.md` — con aporte real del desarrollador.**
El desarrollador proporcionó directamente su propia justificación de por qué eligió cada tecnología (en sus palabras: Java por robusto/orientado a objetos/empresarial; Spring Boot por la organización en capas y la integración con JPA/Hibernate/Security; React por componentes reutilizables y separación de la UI respecto a la lógica de negocio; MySQL por ser relacional y su integración con JPA/Hibernate). Ese texto quedó incorporado tal cual, citado, al inicio de cada sección correspondiente del documento (secciones 1, 2 y 3). El trabajo de la IA fue construir a partir de ahí: comparar contra alternativas descartadas (Node/Django/.NET, Vue/Angular, PostgreSQL/MongoDB) y desarrollar el argumento específico de por qué un modelo relacional es más apropiado que uno documental para este dominio (sección 3.1), que no formaba parte de la explicación original del desarrollador.

**b) `Decisiones_Arquitectura.md` y `README.md` — dirigidos por el backlog.**
Para estos dos, el prompt de origen fue el criterio de aceptación de la tarjeta del backlog correspondiente (ej. *"Producir un registro de decisiones técnicas exigido por la sección 8.2 del PDF..."*), y la IA redactó el contenido completo a partir de ahí, apoyándose en las decisiones de arquitectura ya tomadas en conversaciones previas (autenticación, sincronización entre sucursales, etc.), no en información nueva aportada específicamente para esos documentos.

### 2.5 Revisión de código — *Impacto: Medio-Alto*

Tres hallazgos reales durante este proyecto, encontrados **probando la aplicación de verdad**, no solo leyendo el código:

1. `SecurityConfig.java` inicial fallaba al arrancar (`Can't configure requestMatchers after anyRequest`) porque el bean `Customizer<HttpSecurity>` se reutiliza tanto en la cadena de seguridad principal como en la que Spring Boot 4 genera aparte para Actuator, y ambas intentaban cerrar el registro de autorización. Se detectó al correr `mvnw spring-boot:run` contra una base de datos real, no en una revisión estática.
2. `AuthContext.jsx` original (componente + hook en un mismo archivo) rompía la regla de ESLint `react-refresh/only-export-components`. Se corrigió separando en `AuthContext.js` + `AuthProvider.jsx` + `useAuth.js`.
3. **Flyway instalado pero nunca ejecutándose, sin ningún error.** Al integrar Flyway se agregó primero `flyway-core` + `flyway-mysql`; la aplicación arrancaba bien y no había ningún mensaje de error, pero revisando los logs con lupa no aparecía ninguna línea de Flyway — el esquema nunca se creaba. La causa: en Spring Boot 4 la autoconfiguración de Flyway se modularizó y requiere específicamente `spring-boot-starter-flyway`, no solo la librería base. Es el mismo patrón que el hallazgo de `spring-boot-starter-webmvc` (2.6): Spring Boot 4 cambia silenciosamente qué dependencia activa qué autoconfiguración, y un arranque "exitoso" no prueba que una pieza específica esté realmente funcionando.

Después de estos tres, y ya con JWT, Inventario, Compras y Ventas implementados, aparecieron más bugs reales — todos encontrados ejecutando la aplicación de verdad (Docker + navegador + consultas SQL directas), ninguno por lectura de código:

| # | Bug | Cómo se detectó | Corrección |
|---|---|---|---|
| 4 | CORS nunca configurado en `SecurityConfig` — el preflight del navegador bloqueaba toda petición del frontend al backend | Prueba con Playwright en un navegador real; `curl` no lo hubiera mostrado porque no envía preflight | Bean `CorsConfigurationSource` + `.cors(...)` en la cadena de seguridad |
| 5 | 401 persistente aun con token válido y reglas de autorización correctas | El forward interno de Spring hacia `/error` en un 404 volvía a pasar por el filtro JWT como anónimo, pisando la respuesta real | Agregar `/error` a `permitAll()` |
| 6 | `LazyInitializationException` repetida (3 veces: `CustomUserDetailsService`, `AuthService.login`, `BranchAccessService.assertCanWrite`) | Se disparaba solo en tiempo de ejecución al acceder a una colección lazy fuera de sesión | `@Transactional` en el método correcto — el tercer caso exigió entender que la auto-invocación (`this.metodo()`) rompe el proxy AOP de Spring, así que el `@Transactional` tenía que ir en el método llamado *desde afuera*, no en el interno |
| 7 | Input de cantidad del formulario de movimientos bloqueaba el envío sin mostrar ningún error propio | La validación nativa HTML5 (`min`) del navegador interceptaba el `submit` antes de que el `onSubmit` de React se ejecutara | `noValidate` en el `<form>`, dejando la validación custom como única fuente de verdad |
| 8 | Mensaje de éxito de una recepción de compra desaparecía casi instantáneamente | El JSX del mensaje vivía dentro de la rama condicional que cambiaba de estado (orden cerrada) justo cuando la recepción se completaba | Sacar el mensaje de éxito/error fuera del `isClosed ? ... : <form>` |
| 9 | Al crear una lista de precios con ítems, estos se guardaban en la base de datos pero desaparecían de la respuesta | Los ítems se guardaban por un repositorio separado en vez de agregarse a la colección dueña (`priceList.getItems()`) antes de un único `save()` en cascada | Igualar el patrón ya usado en `PurchaseOrderService`: construir los ítems y agregarlos a la colección del padre antes de guardar |
| 10 | Eliminar un ítem de una lista de precios devolvía 200 pero **no borraba nada**, ni en la respuesta ni en la base de datos | Se activó el log de SQL (`SHOW_SQL=true`) y se confirmó que nunca se emitía el `DELETE` — la relación `cascade=ALL, orphanRemoval=true` "revivía" el ítem al hacer merge-cascade sobre una colección todavía no inicializada, cuando el borrado se hacía por fuera de esa colección | Eliminar mutando `priceList.getItems()` directamente (`removeIf`), dejando que Hibernate emita el `DELETE` por orphan removal |
| 11 | Mensaje de error "Stock insuficiente: disponible **85.0000**, solicitado 90" | Lo encontró el usuario probando la venta manualmente en el navegador, no la IA | `BigDecimal.stripTrailingZeros().toPlainString()` antes de interpolar la cantidad en el mensaje |

### 2.6 Consulta de buenas prácticas — *Impacto: Medio*

El backend usa **Spring Boot 4**, una versión más nueva que el conocimiento de entrenamiento del modelo. En vez de asumir que `spring-boot-starter-webmvc` (en vez del `spring-boot-starter-web` más conocido) era un error del `pom.xml` ya existente, se verificó primero contra la documentación oficial — resultó ser la nomenclatura modular correcta de Spring Boot 4, y `spring-boot-starter-web` es lo que en realidad quedó deprecado. Lo mismo se hizo para confirmar el flujo actual de generación de API key/token de Trello (cambió de `trello.com/app-key` al portal de Power-Ups) y para fijar la versión vigente de la imagen Docker de MySQL.

### 2.7 Módulo de Inventario: movimientos y alertas — *Impacto: Alto*

**Prompt (resumido):** *"Registro de movimiento de inventario (ingreso/retiro)... criterios: valida cantidad_actual suficiente, actualiza costo promedio ponderado en ingresos con costo, genera el registro en tr_inventory_movements"*, seguido de una pregunta de aclaración real del usuario sobre qué significa exactamente elegir "transferencia recibida" como tipo de movimiento manual (¿acepta una transferencia de otra sucursal?).

**Resultado:** `InventoryMovementService` como único punto de escritura de `tr_inventory.current_quantity` (reforzado en tiempo de compilación: `Inventory.currentQuantity` no tiene setter público, solo `applyMovement()`), `InventoryAlertService` (función pura `evaluate(current, min, max)`), catálogo de inventario y formulario de movimiento en el frontend.

**Cómo se dirigió el resultado:** la pregunta del usuario sobre "transferencia recibida" llevó a una decisión explícita — hoy los 7 tipos de movimiento son seleccionables manualmente, pero está anotado en memoria que `PURCHASE`/`SALE`/`TRANSFER_IN`/`TRANSFER_OUT` deben pasar a generarse automáticamente desde sus propios módulos (Compras, Ventas, Transferencias) en cuanto existan, dejando el formulario manual solo para ajustes de conteo físico. Compras y Ventas ya cumplieron esa transición (secciones 2.8 y 2.9); Transferencias sigue pendiente.

### 2.8 Módulo de Compras — *Impacto: Alto*

**Prompt (resumido):** tarjetas del backlog pegadas en lote — *"1. CRUD de proveedores... 2. Crear orden de compra con ítems... 3. Registrar recepción de orden... 4. Recalcular costo promedio ponderado... 5. Histórico de compras"*, seguidas de otro lote para el frontend equivalente.

**Resultado:** módulo `opcback.purchases` completo (proveedores, órdenes, recepciones, histórico) reutilizando `InventoryMovementService` para generar el movimiento `PURCHASE` en cada recepción, y las páginas React correspondientes.

**Corrección post-entrega dirigida por el usuario:** probando la UI manualmente, el usuario encontró que un proveedor desactivado no se podía reactivar (sí existía esa opción para Usuarios, por asimetría del diseño se había quedado fuera de Proveedores). Se agregó `SupplierService.reactivate()` + endpoint + botón, y se verificó contra el proveedor real que el usuario había creado y desactivado — no con datos sintéticos.

### 2.9 Módulo de Ventas — *Impacto: Alto*

**Prompt (resumido):** *"1. CRUD de clientes... 2. CRUD de listas de precios (vigencia por fecha, un solo precio activo por producto por lista)... 3. Registrar venta con validación de stock... 4. Consulta de histórico de ventas"*, y después el lote de frontend: *"1. Formulario de venta (mostrar stock disponible antes de confirmar)... 2. Gestión de listas de precios (indicar visualmente cuál está vigente hoy)"*.

**Resultado:** módulo `opcback.sales` completo — `SaleService.register()` resuelve el precio desde la lista vigente indicada, calcula subtotal/descuento/total, y delega en `InventoryMovementService` el movimiento `SALE` dentro de la misma transacción (un stock insuficiente revierte la venta completa, verificado contando filas en `tr_sales`/`tr_sale_items`/`tr_inventory_movements` antes y después del intento rechazado, no solo leyendo el código). En el frontend, `SaleFormPage` muestra el stock disponible junto a cada producto seleccionado y resalta en rojo cuando la cantidad pedida lo supera, y `PriceListsPage` marca cada lista con una insignia "Vigente hoy"/"No vigente" calculada igual que la validación del backend.

**Bugs reales encontrados en este módulo:** los dos bugs de Hibernate de la tabla de la sección 2.5 (ítems de lista de precios que desaparecían de la respuesta; borrado de ítem que no borraba nada) aparecieron exactamente aquí, y ninguno de los dos se habría detectado sin volver a consultar la base de datos después de cada llamada — el primer intento de ambos endpoints "funcionaba" a nivel de código y de respuesta HTTP 200, pero no hacía lo que decía hacer.

**Alcance acotado a lo pedido en ese momento:** el CRUD visual de clientes y la consulta de histórico de ventas se dejaron fuera aquí a propósito — el usuario pidió específicamente las dos tarjetas de "formulario de venta" y "gestión de listas de precios", sin ampliar el alcance. Ambos gaps (más uno de Catálogo) se cerraron después, al auditar el backlog completo — ver sección 2.11.

### 2.10 Verificación end-to-end con navegador real (Playwright) — *Impacto: Alto*

A partir del módulo de Compras, cada pantalla nueva del frontend se probó con un navegador real automatizado (Playwright), instalado como proyecto npm aislado del repositorio (no es una dependencia del proyecto, solo una herramienta de esta sesión de desarrollo) y reutilizando el binario de Chromium ya cacheado localmente entre sesiones. Esto corrige una limitación que este mismo documento declaraba en una versión anterior (ver nota en la sección 3): en ese momento la sesión no tenía forma de confirmar visualmente el frontend y dependía de que el usuario lo probara por su cuenta. Con Playwright, la IA pudo iniciar sesión, llenar formularios, hacer clic en botones reales y tomar capturas de pantalla dentro de la misma sesión — lo que expuso directamente el bug del `noValidate` (2.5, #7) y el del mensaje de éxito que desaparecía (2.5, #8), y confirmó visualmente el criterio de aceptación de "mostrar stock disponible antes de confirmar" en Ventas con una captura de pantalla real, no con una descripción de lo que el código *debería* hacer.

**Bug del propio arnés de pruebas, encontrado por la IA misma:** al probar la gestión de clientes de Ventas, un `page.click('button:has-text("Cerrar")')` cerró la sesión en vez de cerrar un panel — porque ese selector por subcadena también hacía match con el botón "Cerrar sesión" del header. No era un bug de la aplicación sino del propio script de Playwright; se corrigió con un selector de texto exacto (`text-is`). Se deja constancia porque la tentación en ese momento era reportarlo como un bug de la app sin verificar primero cuál de las dos partes (código de producto o script de prueba) era la culpable.

### 2.11 Cierre de gaps del backlog no detectados por el usuario ni por la IA hasta pedir la auditoría — *Impacto: Alto*

**Prompt (resumido):** *"Revisa el Trello para ubicar esas tarjetas porque yo revisé y no encontré nada relacionado"* — el usuario había notado que el backend de Catálogo (categorías/unidades/productos) y dos piezas de Ventas (clientes, histórico) no tenían ninguna pantalla de frontend, y sospechaba que se le había pasado una tarjeta del backlog.

**Resultado:** se recorrieron las 7 listas y las 99 tarjetas completas del tablero real de Trello (vía MCP, no una búsqueda parcial) y se confirmó que **el gap era real y del backlog original, no un descuido de ejecución**: nunca existió una tarjeta `[INV] Frontend: gestión de categorías/unidades/productos` ni `[VENTAS] Frontend: gestión de clientes` ni `[VENTAS] Frontend: consulta de histórico de ventas`. Se crearon las 3 tarjetas faltantes directamente en el tablero (con su propia descripción y criterios de aceptación, mismo formato que el resto) antes de implementarlas, para que el backlog quedara completo y auditable en vez de que el trabajo apareciera "de la nada" en el código.

**Por qué importa como evidencia:** es un caso donde la respuesta correcta no era "tienes razón, se me pasó" ni "no, sí está" sin verificar — era ir a la fuente (el tablero real) y confirmar con datos antes de aceptar o descartar la sospecha del usuario. Las 3 pantallas resultantes (`CatalogPage.jsx` con pestañas para categorías/unidades/productos y gestión de conversión de unidades, `CustomersPage.jsx`, `SalesHistoryPage.jsx`) se verificaron con Playwright igual que el resto (sección 2.10), incluyendo el bug del selector de "Cerrar" ya descrito arriba.

### 2.12 Diagnóstico de un archivo corrupto en el repositorio — *Impacto: Medio*

**Prompt (resumido):** *"¿En qué parte de la prueba técnica está esto de listas de precios?"* — para responder con precisión hacía falta leer el PDF original, pero `Prueba Tecnica Inventario.pdf` en el repositorio no se dejaba leer: ni el visor de PDF de la sesión ni `pdftotext` extraían texto (páginas en blanco, errores de `zlib`).

**Investigación, no solo "no puedo leerlo":** en vez de reportar la limitación y pedirle al usuario que transcribiera el PDF a mano, se comparó el archivo actual contra las dos versiones que existen en el historial de Git (`git show <commit>:ruta`). La versión del primer commit (`746fb66`) abría perfectamente con PyMuPDF (instalado puntualmente vía `pip install --user pymupdf`, sin tocar las dependencias del proyecto); la versión más reciente (`a4a2de0`, cuyo propio mensaje de commit decía *"cambio de tamaño por haberse abierto varias veces en un lector externo; sin cambios de contenido"*) resultó tener los flujos de compresión internos realmente dañados, contradiciendo esa suposición del commit. La causa raíz quedó identificada con evidencia (dos hashes de Git distintos, uno legible y uno corrupto), no como una conjetura.

**Nota honesta:** mientras se investigaba esto, el archivo del working tree cambió por sí solo a la versión legible (probablemente una restauración de OneDrive sobre la carpeta de Escritorio) sin que la IA ejecutara ningún comando que escribiera sobre esa ruta — se le avisó al usuario explícitamente en vez de asumir que era resultado de algo hecho a propósito, y se le pidió confirmar si lo dejaba así antes de dar el asunto por cerrado.

---

## 3. Evaluación crítica

### Qué aportó la IA

- Velocidad real en tareas mecánicas de alto volumen: el backlog completo de Trello (98 tarjetas, 15 épicas) y su conversión a un JSON importable a Trello se generaron y validaron en minutos.
- Cobertura sistemática: el desglose punto por punto de las 12 secciones del PDF difícilmente se hubiera hecho con el mismo nivel de detalle bajo presión de tiempo.
- Verificación activa en vez de solo generación: cuando algo no se pudo confirmar con seguridad (ej. la nomenclatura de Spring Boot 4, la existencia de un conector oficial de Trello), se buscó la fuente antes de actuar, en vez de asumir.
- Disposición a exponer trade-offs en vez de decidir en silencio: cada decisión de arquitectura (auth, sincronización, esquema) se presentó con alternativas descartadas explícitas, siguiendo el principio rector del propio PDF ("¿por qué se hizo así?").

### Qué fue necesario ajustar o corregir manualmente

- **La decisión de autenticación se revirtió** después de que el usuario cuestionara la recomendación inicial ("JWT stateless sin refresh") preguntando si no era más seguro usar refresh token. La IA había presentado esa opción como "recomendada" por simplicidad; el cuestionamiento del usuario la llevó a re-evaluarla y cambiarla a JWT + refresh token persistido (ver ADR-003 en `Decisiones_Arquitectura.md`) — un caso claro de que la primera recomendación de la IA no era la mejor decisión, y de que el criterio humano la mejoró.
- **Dos bugs reales** (sección 2.5) que solo aparecieron al ejecutar la aplicación de verdad, no al leer el código generado, pero solo porque se insistió en probar en runtime en vez de asumir que "compila" significa "funciona".
- **Uso indebido de la herramienta de planificación**: en un punto la IA entró en modo de planificación formal (exploración con subagentes, archivo de plan, aprobación) para una tarjeta del backlog que ya tenía criterios de aceptación claros — el usuario lo marcó como fricción innecesaria ("haz solo lo que te pedí, usa auto mode"). Se corrigió para las tareas siguientes.
- **Un `ScheduleWakeup` de loop autónomo activado por error**: al esperar la respuesta de un subagente, la IA programó sin necesidad un mecanismo de reintento periódico pensado para otro tipo de flujo, generando un ciclo de ejecución en segundo plano que el propio agente tuvo que detectar y detener.
- **Contraseñas y nombres de base de datos hardcodeados heredados de una plantilla anterior** (`parque_cafe`, `root`/`admin` en `application.properties`) se detectaron y reemplazaron por variables de entorno.
- **El bug de Flyway descrito en 2.5** — no se dio por buena la integración solo porque la app arrancaba sin errores; hizo falta revisar los logs a propósito, encontrar que faltaba `spring-boot-starter-flyway`, corregir y volver a verificar desde un volumen vacío para confirmar que sí funcionaba.
- **Documentación pendiente detectada por el usuario, no por la IA, dos veces en la misma sesión de trabajo de base de datos.** Después de completar la integración de Flyway y el seed de datos, la IA reportó la tarea como terminada sin haber actualizado `Decisiones_Arquitectura.md`, `DER.md` ni esta misma evidencia de IA — fue el usuario quien preguntó explícitamente "¿actualizaste la documentación?" en dos ocasiones separadas antes de que se hiciera. Es una limitación real de proceso: la IA no verifica por iniciativa propia que la documentación quede sincronizada con el código/infraestructura que acaba de cambiar, salvo que se le pida. **Se repitió una tercera vez, más adelante en el proyecto**: al terminar los módulos de Compras y Ventas, ni la sección "Estado de implementación" de `DER.md` ni este mismo archivo se actualizaron — quedaron describiendo un estado anterior (sin JPA, sin tests) durante varias tarjetas del backlog. Fue el usuario quien, revisando el propio `Analisis_Requerimientos.md`, preguntó cuál de esos puntos del checklist realmente faltaba — la IA los verificó uno por uno contra el repositorio y el Trello real (en vez de confiar en el `[x]` ya marcado) antes de responder, y solo entonces se actualizaron ambos documentos.
- **La validación de stock suficiente y el recálculo de costo promedio ponderado no estaban implementados** cuando se pidieron sus tests (sección 2.3) — la tarjeta de "tests" terminó forzando a completar la implementación real antes de poder probarla, en vez de ser una tarjeta puramente de verificación.
- **El endpoint para reactivar un proveedor desactivado faltaba** (sección 2.8) — lo encontró el usuario probando la UI manualmente, no la IA, pese a que el mismo patrón ya existía para Usuarios.
- **Dos bugs de Hibernate en el módulo de Ventas** (sección 2.9: ítems de lista de precios que se guardaban pero no se veían; borrado de ítem que devolvía 200 sin borrar nada) — ninguno de los dos era visible leyendo el código ni probando solo la respuesta HTTP; hizo falta activar el log de SQL y volver a consultar la base de datos después de cada operación para confirmar que el efecto real coincidía con la respuesta reportada.
- **El mensaje "Stock insuficiente: disponible 85.0000"** (sección 2.5, #11) — encontrado por el usuario probando la venta en el navegador, no por la IA.
- **La IA cuestionó su propia interpretación de un requisito ambiguo cuando el usuario dudó de ella, en vez de defenderla.** El PDF solo dice, en la sección 3.3, *"aplicar descuentos y gestionar diferentes listas de precios"* — una sola línea, sin más detalle. La IA la había interpretado como listas independientes de la sucursal (pensadas para variar precios en el tiempo). Cuando el usuario preguntó *"no he comprendido bien si es así como lo hicimos, ¿qué piensas tú?"*, la respuesta no fue justificar el diseño ya construido, sino señalar una debilidad real y no forzada: en un sistema explícitamente multi-sucursal, que la lista de precios sea totalmente independiente de la sucursal (se puede vender en Cali con la lista de Bogotá sin ninguna restricción) es inconsistente con el resto del sistema, y una lectura igual de válida del requisito original habría sido "una lista de precios por sucursal". Se dejó la decisión explícitamente pendiente para que el usuario la resuelva, en vez de cambiar el código unilateralmente para parecer más alineado con la crítica.

### Dónde no fue útil / limitaciones

- **No hay verificación visual real del frontend — superado a partir del módulo de Compras.** En las primeras sesiones (login, rutas protegidas) esta limitación era real: la sesión corría como *background job* sin conector de Chrome, y la IA le pedía al usuario que probara el frontend en su propia máquina. Desde que se instaló Playwright como herramienta de esta sesión (sección 2.10), esa verificación pasó a hacerla la propia IA — con capturas de pantalla reales como evidencia — y encontró bugs (native validation bloqueando el submit, mensaje de éxito que desaparecía) que ni la lectura de código ni las pruebas solo-backend hubieran mostrado.
- **La relación entre lista de precios y sucursal queda sin resolver a propósito** (ver el cuestionamiento de la sección anterior) — no es un olvido, es una decisión de diseño ambigua que el usuario prefirió posponer en vez de decidir apurado.
- **El "test de instalación por alguien externo"** (criterio de aceptación de la tarjeta del README) no pudo hacerse con una persona real ajena al proyecto — se simuló siguiendo el README al pie de la letra sobre el *working tree* actual, con la limitación honesta de que, como nada estaba comiteado todavía, no era un clon real del repositorio.
- **Conocimiento desactualizado de versiones específicas** (Spring Boot 4, versionado de MySQL) requirió verificación externa en cada ocasión — sin esa verificación, la IA habría podido "corregir" código que en realidad era correcto.

---

## 4. Estimación del porcentaje de código/documentación generado con asistencia de IA

| Área | % asistido por IA | Nota |
|---|---|---|
| Backend (`OPC-back`) — Auth, Usuarios, Sucursales, Catálogo | ~90% | Redactado por la IA; el andamiaje inicial del proyecto (Spring Initializr) ya existía antes de esta serie de sesiones |
| Backend — Inventario, Compras, Ventas (`inventory`, `purchases`, `sales`) | ~90% | Entidades, servicios, controladores y DTOs redactados por la IA a partir de las tarjetas del backlog pegadas por el usuario; la lógica de negocio no trivial (costo promedio ponderado, validación de stock, resolución de precio por lista vigente) se verificó contra Docker/MySQL real antes de darse por buena, no solo se generó — con al menos 5 bugs reales corregidos en el proceso (sección 2.5) |
| Pruebas automatizadas (`OPC-back/src/test`) | ~80% | `InventoryMovementServiceTest` y `PurchaseReceiptServiceTest` (100% caso+números de la IA) redactados a pedido explícito del usuario. `SaleServiceTest` es distinto: la mitad de los casos y sus números exactos los dictó el usuario antes de escribir código (sección 2.3) — el promedio del área baja por eso, no por relabeling |
| Frontend (`OPC-front`) | ~90% | Toda la capa de enrutamiento, auth, cliente HTTP y las páginas de Inventario/Movimientos/Compras/Ventas/Catálogo/Clientes/Histórico son generadas por IA; el scaffold base de Vite/React venía de antes. Verificado con Playwright en navegador real (sección 2.10), no solo por lectura de JSX |
| Infraestructura (Docker Compose, Dockerfiles, `.env.example`) | ~95% | Prácticamente en su totalidad generada por IA, con verificación de arranque real en cada cambio |
| Base de datos (DER, DDL, migraciones Flyway, datos de demo) | ~90% | El DER y el DDL los redactó la IA a partir de las tarjetas del backlog; los nombres de tabla en inglés con prefijo (`ma_`/`tr_`/`sy_`) y el paso de roles de `ENUM` a tabla los pidió el usuario explícitamente. Cada script se verificó contra MySQL 8 real antes de darlo por terminado, no solo se generó. Las tablas de Ventas (`ma_customers`, `ma_price_lists`, `ma_price_list_items`, `tr_sales`, `tr_sale_items`) ya existían desde `V1`, así que el módulo de Ventas no necesitó una migración nueva |
| Documentación de ingeniería (`requirements/*.md`) | ~85% | Redactada por IA a partir de indicaciones y criterios de aceptación puntuales del usuario; el contenido técnico de fondo (qué justificar, qué decidir) surge de la interacción, no de un volcado unilateral. Este mismo archivo y la sección 4 de `DER.md` quedaron desactualizados durante varias tarjetas (ver sección 3) hasta que el usuario pidió explícitamente ponerlos al día |

En todas las áreas, el porcentaje **no** implica ausencia de dirección humana: cada decisión de arquitectura significativa (autenticación, sincronización entre sucursales, modelado del DER, flujo de ramas de Git) fue presentada como pregunta explícita antes de implementarse, y al menos una de ellas (autenticación) se revirtió por cuestionamiento directo del usuario.
