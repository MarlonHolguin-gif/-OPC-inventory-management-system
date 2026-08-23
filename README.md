# Sistema de Inventario Multi-Sucursal — OptiPlant Consultores

Prueba técnica: sistema de gestión de inventario para una organización con múltiples sucursales, con visibilidad compartida de stock, compras, ventas y transferencias entre sucursales.

**Stack:** Java 21 + Spring Boot (backend) · React + Vite (frontend) · MySQL (base de datos) · Docker Compose (orquestación).
Justificación completa de estas decisiones: [`requirements/Justificacion_Stack_Tecnologico.md`](requirements/Justificacion_Stack_Tecnologico.md).

## Estructura del repositorio

```
-OPC-inventory-management-system/
├── docker-compose.yml            # Orquesta los servicios: mysql, backend (frontend pendiente)
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
│       │   ├── java/mh/opc_back/         # Código fuente (controllers, services, repositories, entities, config)
│       │   └── resources/
│       │       └── application.properties # Config de la app (BD, JWT, puerto — vía variables de entorno)
│       └── test/
│           └── java/mh/opc_back/         # Pruebas unitarias/integración
│
└── OPC-front/                    # ───── FRONTEND — React + Vite ─────
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
- El `Dockerfile` en la raíz del repositorio es un archivo vacío sin uso — cada subproyecto define el suyo propio (`OPC-back/Dockerfile`, y próximamente `OPC-front/Dockerfile`).

## Documentación de ingeniería

| Documento | Contenido |
|---|---|
| [`requirements/Prueba Tecnica Inventario.pdf`](<requirements/Prueba Tecnica Inventario.pdf>) | Enunciado original de OptiPlant Consultores |
| [`requirements/Prototipo_DB.pdf`](requirements/Prototipo_DB.pdf) | DER inicial propuesto (prototipo de base de datos) |
| [`requirements/Analisis_Requerimientos.md`](requirements/Analisis_Requerimientos.md) | Requerimientos funcionales/no funcionales, actores, historias de usuario, y revisión completa del DER frente al prototipo |
| [`requirements/Justificacion_Stack_Tecnologico.md`](requirements/Justificacion_Stack_Tecnologico.md) | Por qué Java/Spring Boot, React y MySQL para este problema (incluye por qué relacional y no NoSQL) |
| [`requirements/Decisiones_Arquitectura.md`](requirements/Decisiones_Arquitectura.md) | Registro de decisiones de arquitectura (ADR): lenguaje de backend, motor de BD, autenticación, sincronización entre sucursales, patrones de diseño |
| [`requirements/IA_EVIDENCIA.md`](requirements/IA_EVIDENCIA.md) | Evidencia de uso de IA durante el desarrollo: herramientas, prompts reales, evaluación crítica y estimación de % de código asistido (documento vivo, se actualiza con el proyecto) |

Pendiente (se completa incrementalmente conforme avanza el backlog, no todo al final):
- **Diagramas de ingeniería obligatorios** (casos de uso, actividades, arquitectura, entidad-relación) — épica *Documentación de Ingeniería* del backlog.

## Cómo levantar el proyecto

**Prerrequisitos:** Docker Desktop en ejecución, y Node.js 20+ (solo para correr el frontend, que todavía no está dockerizado).

1. Clona el repositorio y ubícate en la raíz.
2. Copia las variables de entorno y ajústalas si hace falta:
   ```bash
   cp .env.example .env
   ```
3. Levanta la base de datos y el backend:
   ```bash
   docker compose up -d
   ```
   Esto construye la imagen del backend y espera a que MySQL esté saludable antes de arrancarlo (puede tardar uno o dos minutos la primera vez, mientras Docker descarga la imagen de MySQL y compila el backend).
4. Verifica que el backend está arriba:
   ```bash
   curl http://localhost:8080/actuator/health
   # {"status":"UP"}
   ```
5. Corre el frontend (en otra terminal; todavía se ejecuta manualmente, no vía Docker):
   ```bash
   cd OPC-front
   cp .env.example .env
   npm install
   npm run dev
   ```
   Abre `http://localhost:5173`.

**Estado actual (para no confundir un límite conocido con un error):** el frontend ya tiene el enrutamiento completo (`/login` pública, `/dashboard` privada), pero el backend todavía no expone el endpoint de autenticación — el formulario de login no va a autenticar de verdad hasta que se implemente la épica de Autenticación. Esto es esperado en el estado actual del proyecto, no un bug.

Para bajar todo: `docker compose down` (agrega `-v` si además quieres borrar los datos de MySQL).
