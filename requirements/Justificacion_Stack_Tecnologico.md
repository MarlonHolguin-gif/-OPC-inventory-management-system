# Justificación del Stack Tecnológico

> Documento que responde al requisito de la sección 5 de `Prueba Tecnica Inventario.pdf`: *"El stack es completamente libre siempre que se cumplan los tres requisitos anteriores [separación de capas, comunicación por API, contenedorización]. Se valorará la justificación de las decisiones tecnológicas."*
> Tarea origen: épica **Fundación y Arquitectura**, tarjeta *"Definir y justificar el stack tecnológico"* (`Tareas_Trello.md`).

Stack elegido: **Java 21 + Spring Boot (backend)** · **React (frontend)** · **MySQL (base de datos)**.

Antes de justificar cada pieza por separado, vale aclarar el criterio general usado para decidir: este no es un sistema de contenido ni de alto volumen de escritura no estructurada — es un sistema **transaccional** (ventas, compras, transferencias) sobre un **modelo de datos altamente relacional** (20+ entidades con relaciones 1:N y N:M explícitas, ver `Prototipo_DB.pdf`), donde la integridad del dato (que el stock nunca quede negativo, que cada movimiento tenga un origen trazable, que una venta no se confirme sin validar disponibilidad) importa más que la velocidad de iteración sobre un esquema cambiante. Esa característica del problema es la que orienta las tres decisiones.

---

## 1. Backend: Java + Spring Boot

> **Motivación original (Marlon Holguín, desarrollador del proyecto):** *"Decidí utilizar Java, Spring Boot [...] porque necesitaba una arquitectura que permitiera separar correctamente el frontend, el backend y la persistencia de datos. Java me proporciona un lenguaje robusto, orientado a objetos y ampliamente utilizado en aplicaciones empresariales. Sobre Java utilicé Spring Boot porque facilita la construcción de APIs REST, permite trabajar de manera organizada mediante capas y tiene una integración muy buena con herramientas como JPA, Hibernate y Spring Security."*

A partir de esa motivación, esta sección profundiza en por qué esa elección encaja específicamente con los requisitos de esta prueba técnica, y qué se descartó en el camino.

### Por qué encaja con este problema específico

- **El núcleo del sistema es lógica de negocio transaccional, no solo CRUD.** Registrar un movimiento de inventario implica escribir en `TR_INVENTORY_MOVEMENTS` *y* actualizar `TR_INVENTORY.current_quantity` de forma atómica (ver `Analisis_Requerimientos.md` sección 2.2). Spring gestiona esto de forma declarativa con `@Transactional`, con rollback automático ante error, sin tener que orquestar manualmente confirmaciones/reversiones como en stacks donde las transacciones de BD son responsabilidad explícita del desarrollador en cada endpoint.
- **Spring Data JPA reduce drásticamente el código repetitivo** de las 6+ entidades con CRUD completo (productos, proveedores, órdenes de compra, ventas, transferencias, usuarios), dejando tiempo de desarrollo para la lógica que sí es específica del dominio: cálculo de costo promedio ponderado, validación de stock antes de vender, máquina de estados de una transferencia.
- **Spring Security cubre exactamente el modelo de autorización que exige la prueba**: tres roles con permisos distintos por endpoint (`GENERAL_ADMIN`, `BRANCH_MANAGER`, `INVENTORY_OPERATOR`) y acceso condicionado a la sucursal del usuario. Esto se implementa con anotaciones declarativas (`@PreAuthorize`) en vez de si-else repetidos en cada controlador.
- **Tipado estático y verificación en tiempo de compilación.** En un sistema donde un error de tipo en el cálculo de un total de venta o de un costo promedio tiene impacto financiero directo, preferimos que esos errores se detecten antes de llegar a producción, no en tiempo de ejecución.
- **Es el mismo lenguaje/ecosistema en el que ya está iniciado el proyecto** (`OPC-back` ya es un proyecto Spring Boot con Java 21) — no se está evaluando en el vacío, se está justificando una base ya existente y coherente con el resto de las decisiones (Docker, MySQL, JWT).

### Alternativas consideradas y por qué no se eligieron

| Alternativa | Por qué se descartó para este caso |
|---|---|
| **Node.js + Express/NestJS** | JavaScript/TypeScript es válido para APIs REST, pero el tipado de TypeScript es opcional y "borrado" en runtime; para lógica financiera con muchos cálculos numéricos (costo ponderado, descuentos, subtotales) se prefiere la garantía más fuerte de un lenguaje con tipos verificados en compilación. Spring además da manejo transaccional out-of-the-box más maduro que la mayoría de ORMs de Node. |
| **Python + Django/FastAPI** | Buena opción para prototipado rápido y para el módulo de predicción de demanda (no elegido en esta entrega), pero su ORM y manejo de transacciones son menos idiomáticos para un dominio con tantas relaciones e integridad referencial estricta como este. |
| **.NET / C#** | Técnicamente comparable a Spring Boot en robustez y tipado; se descarta únicamente por curva de adopción y por no ser el ecosistema en el que ya arrancó el proyecto. |

---

## 2. Frontend: React

> **Motivación original (Marlon Holguín, desarrollador del proyecto):** *"Para la interfaz web elegí React porque permite construir aplicaciones dinámicas mediante componentes reutilizables y facilita el consumo de las APIs desarrolladas en Spring Boot. Esto permite mantener separado el código de la interfaz del código encargado de la lógica del negocio."*

### Por qué encaja con este problema específico

- **El sistema tiene muchas pantallas de tipo formulario + tabla + estado** (catálogo de productos, órdenes de compra, ventas, seguimiento de transferencias, notificaciones): exactamente el caso de uso donde un modelo de componentes reutilizables (formularios de producto, tarjetas de KPI, líneas de tiempo de estado de una transferencia) reduce duplicación de código de interfaz.
- **El dashboard (sección 3.6 del PDF) necesita varias vistas con datos que cambian con la interacción del usuario** (filtros de fecha, comparativa entre sucursales) sin recargar la página completa — el manejo de estado y re-render eficiente de React encaja bien con esa necesidad de refresco parcial e interactivo.
- **Ecosistema de gráficas maduro** (Recharts, Chart.js vía wrappers, Visx) directamente relevante para los 5 indicadores mínimos del dashboard.
- **Cumple naturalmente la regla técnica obligatoria de "sin lógica de negocio en el cliente"**: React como librería de UI (no un framework "todo incluido" como Angular) empuja a que el estado de negocio real viva en el backend y el frontend solo orqueste llamadas a la API y renderice — coherente con la arquitectura de capas exigida en la sección 8.1 del PDF.
- **Consistencia con lo ya iniciado**: `OPC-front` ya está scaffoldeado con Vite + React.

### Alternativas consideradas y por qué no se eligieron

| Alternativa | Por qué se descartó para este caso |
|---|---|
| **Vue** | Curva de aprendizaje más suave y también válida, pero el ecosistema de librerías de dashboards/gráficas y de integración con backends Spring vía REST es más grande y documentado en React. |
| **Angular** | Es un framework más "opinionado" y pesado (incluye su propio manejo de formularios reactivos, DI, routing); para el alcance de esta prueba, React da suficiente estructura sin la sobrecarga de configuración inicial de Angular. |

---

## 3. Base de datos: MySQL

> **Motivación original (Marlon Holguín, desarrollador del proyecto):** *"Elegí MySQL porque necesitaba una base de datos relacional capaz de almacenar y relacionar de manera estructurada la información del sistema. Su integración con Spring Boot mediante JPA y Hibernate permite trabajar con las entidades Java y persistirlas en la base de datos de una manera más sencilla y organizada."*

### 3.1 Por qué una base de datos relacional (y no NoSQL) para este problema

Este es el punto que más directamente exige justificación según el PDF (sección 8.2: *"selección del motor de base de datos y el modelo de datos adoptado"*), y la razón central es estructural, no de preferencia:

- **El modelo de datos ya es intrínsecamente relacional.** El DER del proyecto (`Prototipo_DB.pdf`) tiene 20+ entidades conectadas por FKs explícitas: una venta tiene ítems, cada ítem referencia un producto, un producto tiene categoría y unidad de medida, una transferencia tiene ítems y eventos, una orden de compra tiene recepciones parciales con sus propios ítems. Modelar esto en un documento NoSQL obligaría a elegir entre (a) documentos anidados muy profundos que duplican datos de producto/precio en cada venta histórica, complicando actualizaciones consistentes, o (b) referencias manuales entre documentos sin que la base de datos garantice su integridad — reinventando a mano lo que una FK ya resuelve nativamente.
- **Se necesitan transacciones ACID multi-tabla reales.** Confirmar una venta implica: validar stock, insertar `TR_SALES` + `TR_SALE_ITEMS`, insertar un `TR_INVENTORY_MOVEMENTS` y actualizar `TR_INVENTORY.current_quantity` — todo o nada. Una base de datos relacional garantiza esta atomicidad de forma nativa entre múltiples tablas; la mayoría de bases NoSQL (MongoDB incluido) solo dan esa garantía completa dentro de un único documento, o requieren transacciones multi-documento que son más costosas y menos idiomáticas para ese motor.
- **Las consultas del dashboard son agregaciones con joins** (ventas por sucursal y mes, rotación de inventario por producto, cumplimiento logístico por ruta — ver `Analisis_Requerimientos.md` sección 2.7). SQL con `GROUP BY`, `JOIN` e índices compuestos es el lenguaje natural para ese tipo de reporte; en un modelo documental esas mismas consultas requieren agregaciones más complejas (pipelines) o denormalización previa.
- **La integridad referencial es una regla de negocio, no un detalle técnico.** Que no se pueda crear una `TR_SALE_ITEMS` apuntando a un `product_id` inexistente, o que no se pueda borrar una `SUCURSAL` con inventario activo, es exactamente el tipo de invariante que una FK con `ON DELETE RESTRICT` garantiza a nivel de motor — sin depender de que cada desarrollador recuerde validarlo en cada servicio.
- **No hay un caso de uso real de esquema variable o semi-estructurado** en el alcance de la prueba (no hay, por ejemplo, atributos arbitrarios y dinámicos por producto que cambien por categoría) que justificaría la flexibilidad de esquema que ofrece un documento NoSQL. La única excepción son las columnas `JSON` de `SY_AUDIT_LOG.old_values`/`new_values`, y ahí MySQL ya soporta tipo `JSON` nativo — se usa lo mejor de ambos mundos sin tener que migrar todo el motor.

En resumen: NoSQL brilla cuando el esquema es volátil, la escala de escritura es masiva y horizontal, y la consistencia fuerte entre entidades relacionadas no es crítica. Ninguna de esas tres condiciones aplica a este problema; las tres condiciones contrarias (esquema estable y ya modelado, volumen moderado, consistencia transaccional crítica) sí aplican, y son exactamente el terreno donde una base relacional es la herramienta correcta, no solo una opción válida.

### 3.2 Por qué MySQL específicamente (y no PostgreSQL)

El PDF permite ambos motores explícitamente (sección 8.1). La elección de MySQL sobre PostgreSQL es una decisión de **contexto**, no de superioridad técnica — ambos son ACID-compliant, ambos soportan JSON, ambos tienen imagen oficial de Docker madura:

- Es el motor con el que el candidato tiene mayor familiaridad operativa previa, lo que reduce riesgo de configuración incorrecta dentro del tiempo acotado de la prueba.
- El ecosistema de MySQL + Spring Data JPA + Hibernate está extremadamente documentado, minimizando fricción de integración.
- Para el volumen y complejidad de este proyecto (una prueba técnica, no un sistema con necesidades avanzadas de tipos de datos geoespaciales, full-text search avanzado o extensiones tipo `pg_vector`), las diferencias entre MySQL y PostgreSQL no son determinantes — ambos cumplen sobradamente los requisitos del PDF.

Se documenta como limitación conocida: si el proyecto creciera y necesitara, por ejemplo, `CHECK constraints` más expresivos o índices parciales, PostgreSQL sería la alternativa natural a reevaluar — pero eso está fuera del alcance actual.

---

## 4. Cómo las tres decisiones encajan entre sí

| Requisito obligatorio del PDF (sección 5 y 8.1) | Cómo lo resuelve esta combinación de stack |
|---|---|
| Separación de capas (frontend / backend / BD) | React, Spring Boot y MySQL son tres procesos independientes, cada uno en su propio contenedor Docker |
| Comunicación exclusivamente por API, sin lógica de negocio en el cliente | React solo consume la API REST de Spring Boot; toda regla de negocio (validación de stock, cálculo de costos, máquina de estados de transferencias) vive en el backend |
| Contenedorización con un solo comando | Los tres servicios están orquestados en `docker-compose.yml`; MySQL y el backend ya están configurados y validados (ver estado actual del repositorio), el frontend queda pendiente en la misma épica de infraestructura |

---

## 5. Trade-offs aceptados

Siendo honestos sobre las limitaciones de esta elección, tal como pide el principio rector del PDF ("¿por qué se hizo así?" implica también reconocer qué se sacrificó):

- **Arquitectura monolítica (un solo backend Spring Boot), no microservicios.** Para el alcance de una sola organización con N sucursales compartiendo una base de datos, introducir microservicios agregaría complejidad operativa (orquestación, comunicación entre servicios, consistencia distribuida) sin un beneficio real a esta escala. Se documenta como decisión consciente, no como limitación técnica del stack.
- **MySQL como única fuente de verdad compartida entre sucursales** implica que la disponibilidad de todo el sistema depende de un único motor de base de datos. Es una simplificación aceptada explícitamente para cumplir el requisito de sincronización "near-real-time" sin construir infraestructura de replicación o mensajería (ver `Analisis_Requerimientos.md`, decisión de sincronización), coherente con el alcance de una prueba técnica.
- **React sin un framework "batteries-included"** significa que decisiones como manejo de formularios, llamadas HTTP o gestión de estado global se resuelven con librerías elegidas a criterio propio en vez de venir impuestas — mayor flexibilidad, pero también mayor responsabilidad de mantener consistencia entre pantallas.
