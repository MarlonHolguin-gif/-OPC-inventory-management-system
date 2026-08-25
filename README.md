# Sistema de Inventario Multi-Sucursal — OptiPlant Consultores

Prueba técnica: sistema de gestión de inventario para una organización con múltiples sucursales, con visibilidad compartida de stock, compras, ventas y transferencias entre sucursales.

**Stack:** Java 21 + Spring Boot (backend) · React + Vite (frontend) · MySQL (base de datos) · Docker Compose (orquestación).
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
│       │   ├── java/opcback/              # Código fuente (paquete por módulo: auth, branches, products, inventory...)
│       │   └── resources/
│       │       └── application.properties # Config de la app (BD, JWT, puerto — vía variables de entorno)
│       └── test/
│           └── java/opcback/              # Pruebas unitarias/integración
│
└── OPC-front/                    # ───── FRONTEND — React + Vite ─────
    ├── Dockerfile                # Build multi-stage (Node → nginx), recibe VITE_API_BASE_URL como build arg
    ├── nginx.conf                # Config de nginx con fallback SPA (rutas de React Router)
    ├── .env.example              # Plantilla: URL base de la API (VITE_API_BASE_URL)
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── eslint.config.js
    ├── public/                   # Assets estáticos (favicon, icons)
    └── src/
        ├── App.jsx                # Enrutamiento (React Router): rutas públicas/privadas
        ├── main.jsx                # Punto de entrada de la SPA
        ├── api/httpClient.js       # Cliente HTTP centralizado (axios) — adjunta el JWT automáticamente
        ├── context/                # AuthProvider (estado de sesión)
        ├── hooks/useAuth.js        # Hook de acceso al contexto de autenticación
        ├── routes/ProtectedRoute.jsx # Guarda de rutas privadas
        └── pages/                  # LoginPage, DashboardPage
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

**Estado actual (para no confundir un límite conocido con un error):** el frontend ya tiene el enrutamiento completo (`/login` pública, `/dashboard` privada), pero el backend todavía no expone el endpoint de autenticación — el formulario de login no va a autenticar de verdad hasta que se implemente la épica de Autenticación. Esto es esperado en el estado actual del proyecto, no un bug.

Para bajar todo: `docker compose down` (agrega `-v` si además quieres borrar los datos de MySQL).

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
