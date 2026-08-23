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

---

## 2. Ejemplos concretos de prompts y resultados, por área

### 2.1 Diseño de arquitectura — *Impacto: Alto*

**Prompt (resumido):** *"Analiza el PDF de la prueba técnica y crea un reporte punto por punto de los requerimientos... analiza también mi prototipo de base de datos y dime qué le agregarías y qué le quitarías... hazme preguntas sobre todo lo que tengas dudas."*

**Resultado:** `Analisis_Requerimientos.md` (desglose de las 12 secciones del PDF, RF/RNF, actores, historias de usuario) y la revisión completa del DER (qué mantener, qué agregar — `NOTIFICACIONES`, `AUDITORIA`, `USUARIO_SUCURSAL`, `CLIENTES` — y qué **no** agregar para no sobre-diseñar).

**Cómo se dirigió el resultado:** antes de aceptar cualquier recomendación de esquema o arquitectura, el modelo presentó las decisiones abiertas como preguntas de opción múltiple (sincronización entre sucursales, estrategia de autenticación, modelado del admin general, etc.) en vez de decidir unilateralmente. Ver evaluación crítica (3.2) para un caso donde esa primera recomendación se corrigió después.

### 2.2 Generación de código — *Impacto: Alto*

**Prompt (resumido):** *"Verificar/completar las dependencias base del proyecto OPC-back: Spring Web, Spring Data JPA, Spring Security, MySQL Driver, Validation, Lombok... y hazme preguntas sobre lo que se va a cambiar."*

**Resultado:** dependencia `spring-boot-starter-actuator` agregada al `pom.xml`, `SecurityConfig.java` (bean `Customizer<HttpSecurity>`), configuración de `application.properties` vía variables de entorno, `Dockerfile` multi-stage para el backend, y en el frontend: `httpClient.js` (interceptores axios), `AuthProvider`/`useAuth`, `ProtectedRoute`, `LoginPage`/`DashboardPage`, enrutamiento en `App.jsx`.

### 2.3 Generación de tests — *Impacto: pendiente*

Todavía no se ha generado ninguna prueba automatizada en este proyecto (las épicas de módulos de negocio, donde vive la lógica que más vale la pena testear, no han empezado). Se deja constancia explícita de que esta área **no tiene evidencia real todavía** — se documentará aquí en cuanto se generen los primeros tests.

### 2.4 Documentación técnica — *Impacto: Alto*

Esta área tuvo dos dinámicas distintas dentro del mismo proyecto, y vale la pena distinguirlas en vez de presentarlas como si fueran iguales:

**a) `Justificacion_Stack_Tecnologico.md` — con aporte real del desarrollador.**
El desarrollador proporcionó directamente su propia justificación de por qué eligió cada tecnología (en sus palabras: Java por robusto/orientado a objetos/empresarial; Spring Boot por la organización en capas y la integración con JPA/Hibernate/Security; React por componentes reutilizables y separación de la UI respecto a la lógica de negocio; MySQL por ser relacional y su integración con JPA/Hibernate). Ese texto quedó incorporado tal cual, citado, al inicio de cada sección correspondiente del documento (secciones 1, 2 y 3). El trabajo de la IA fue construir a partir de ahí: comparar contra alternativas descartadas (Node/Django/.NET, Vue/Angular, PostgreSQL/MongoDB) y desarrollar el argumento específico de por qué un modelo relacional es más apropiado que uno documental para este dominio (sección 3.1), que no formaba parte de la explicación original del desarrollador.

**b) `Decisiones_Arquitectura.md` y `README.md` — dirigidos por el backlog.**
Para estos dos, el prompt de origen fue el criterio de aceptación de la tarjeta del backlog correspondiente (ej. *"Producir un registro de decisiones técnicas exigido por la sección 8.2 del PDF..."*), y la IA redactó el contenido completo a partir de ahí, apoyándose en las decisiones de arquitectura ya tomadas en conversaciones previas (autenticación, sincronización entre sucursales, etc.), no en información nueva aportada específicamente para esos documentos.

### 2.5 Revisión de código — *Impacto: Medio-Alto*

Dos hallazgos reales durante este proyecto, encontrados **probando la aplicación de verdad**, no solo leyendo el código:

1. `SecurityConfig.java` inicial fallaba al arrancar (`Can't configure requestMatchers after anyRequest`) porque el bean `Customizer<HttpSecurity>` se reutiliza tanto en la cadena de seguridad principal como en la que Spring Boot 4 genera aparte para Actuator, y ambas intentaban cerrar el registro de autorización. Se detectó al correr `mvnw spring-boot:run` contra una base de datos real, no en una revisión estática.
2. `AuthContext.jsx` original (componente + hook en un mismo archivo) rompía la regla de ESLint `react-refresh/only-export-components`. Se corrigió separando en `AuthContext.js` + `AuthProvider.jsx` + `useAuth.js`.

### 2.6 Consulta de buenas prácticas — *Impacto: Medio*

El backend usa **Spring Boot 4**, una versión más nueva que el conocimiento de entrenamiento del modelo. En vez de asumir que `spring-boot-starter-webmvc` (en vez del `spring-boot-starter-web` más conocido) era un error del `pom.xml` ya existente, se verificó primero contra la documentación oficial — resultó ser la nomenclatura modular correcta de Spring Boot 4, y `spring-boot-starter-web` es lo que en realidad quedó deprecado. Lo mismo se hizo para confirmar el flujo actual de generación de API key/token de Trello (cambió de `trello.com/app-key` al portal de Power-Ups) y para fijar la versión vigente de la imagen Docker de MySQL.

---

## 3. Evaluación crítica

### Qué aportó la IA

- Velocidad real en tareas mecánicas de alto volumen: el backlog completo de Trello (98 tarjetas, 15 épicas) y su conversión a un JSON importable a Trello se generaron y validaron en minutos.
- Cobertura sistemática: el desglose punto por punto de las 12 secciones del PDF difícilmente se hubiera hecho con el mismo nivel de detalle bajo presión de tiempo.
- Verificación activa en vez de solo generación: cuando algo no se pudo confirmar con seguridad (ej. la nomenclatura de Spring Boot 4, la existencia de un conector oficial de Trello), se buscó la fuente antes de actuar, en vez de asumir.
- Disposición a exponer trade-offs en vez de decidir en silencio: cada decisión de arquitectura (auth, sincronización, esquema) se presentó con alternativas descartadas explícitas, siguiendo el principio rector del propio PDF ("¿por qué se hizo así?").

### Qué fue necesario ajustar o corregir manualmente

- **La decisión de autenticación se revirtió** después de que el usuario cuestionara la recomendación inicial ("JWT stateless sin refresh") preguntando si no era más seguro usar refresh token. La IA había presentado esa opción como "recomendada" por simplicidad; el cuestionamiento del usuario la llevó a re-evaluarla y cambiarla a JWT + refresh token persistido (ver ADR-003 en `Decisiones_Arquitectura.md`) — un caso claro de que la primera recomendación de la IA no era la mejor decisión, y de que el criterio humano la mejoró.
- **Dos bugs reales** (sección 2.5) que solo aparecieron al ejecutar la aplicación de verdad, no al leer el código generado — la IA los encontró, pero solo porque se insistió en probar en runtime en vez de asumir que "compila" significa "funciona".
- **Uso indebido de la herramienta de planificación**: en un punto la IA entró en modo de planificación formal (exploración con subagentes, archivo de plan, aprobación) para una tarjeta del backlog que ya tenía criterios de aceptación claros — el usuario lo marcó como fricción innecesaria ("haz solo lo que te pedí, usa auto mode"). Se corrigió para las tareas siguientes.
- **Un `ScheduleWakeup` de loop autónomo activado por error**: al esperar la respuesta de un subagente, la IA programó sin necesidad un mecanismo de reintento periódico pensado para otro tipo de flujo, generando un ciclo de ejecución en segundo plano que el propio agente tuvo que detectar y detener.
- **Contraseñas y nombres de base de datos hardcodeados heredados de una plantilla anterior** (`parque_cafe`, `root`/`admin` en `application.properties`) se detectaron y reemplazaron por variables de entorno.

### Dónde no fue útil / limitaciones

- **No hay verificación visual real del frontend.** Esta sesión corre como *background job*, sin el conector de Chrome disponible — la IA fue explícita en que no podía confirmar el comportamiento del enrutamiento en un navegador real, y le pidió al usuario que lo probara él mismo en su máquina (lo hizo, y confirmó que el comportamiento era el esperado).
- **El "test de instalación por alguien externo"** (criterio de aceptación de la tarjeta del README) no pudo hacerse con una persona real ajena al proyecto — se simuló siguiendo el README al pie de la letra sobre el *working tree* actual, con la limitación honesta de que, como nada estaba comiteado todavía, no era un clon real del repositorio.
- **Conocimiento desactualizado de versiones específicas** (Spring Boot 4, versionado de MySQL) requirió verificación externa en cada ocasión — sin esa verificación, la IA habría podido "corregir" código que en realidad era correcto.

---

## 4. Estimación del porcentaje de código/documentación generado con asistencia de IA

| Área | % asistido por IA | Nota |
|---|---|---|
| Backend (`OPC-back`) | ~90% | Todo el código escrito hasta ahora (config, `SecurityConfig`) fue redactado por la IA; el andamiaje inicial del proyecto (Spring Initializr) ya existía antes de esta serie de sesiones |
| Frontend (`OPC-front`) | ~90% | Toda la capa de enrutamiento, auth y cliente HTTP es generada por IA; el scaffold base de Vite/React también venía de antes |
| Infraestructura (Docker Compose, Dockerfiles, `.env.example`) | ~95% | Prácticamente en su totalidad generada por IA, con verificación de arranque real en cada cambio |
| Documentación de ingeniería (`requirements/*.md`) | ~85% | Redactada por IA a partir de indicaciones y criterios de aceptación puntuales del usuario; el contenido técnico de fondo (qué justificar, qué decidir) surge de la interacción, no de un volcado unilateral |

En todas las áreas, el porcentaje **no** implica ausencia de dirección humana: cada decisión de arquitectura significativa (autenticación, sincronización entre sucursales, modelado del DER, flujo de ramas de Git) fue presentada como pregunta explícita antes de implementarse, y al menos una de ellas (autenticación) se revirtió por cuestionamiento directo del usuario.
