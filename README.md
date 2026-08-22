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
│   ├── Prueba Tecnica Inventario.pdf     # Enunciado original de OptiPlant Consultores
│   ├── Prototipo_DB.pdf                  # DER inicial propuesto (prototipo de base de datos)
│   ├── Analisis_Requerimientos.md        # Desglose punto por punto del enunciado + revisión del DER
│   └── Justificacion_Stack_Tecnologico.md# Por qué Spring Boot + React + MySQL para este problema
│
├── screenshots/                  # Capturas de pantalla para documentación (UI, diagramas renderizados)
│
├── OPC-back/                     # ───── BACKEND — Java 21 + Spring Boot ─────
│   ├── Dockerfile                # Build multi-stage (Maven → JRE)
│   ├── pom.xml                   # Dependencias: Web, Data JPA, Security, Validation, MySQL driver, Lombok
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
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── eslint.config.js
    ├── public/                   # Assets estáticos (favicon, icons)
    └── src/
        ├── App.jsx                # Componente raíz
        ├── main.jsx                # Punto de entrada de la SPA
        ├── App.css / index.css
        └── assets/                # Imágenes y recursos estáticos del proyecto
```

### Notas sobre la estructura

- **`OPC-back/`** y **`OPC-front/`** son proyectos independientes, cada uno con su propio gestor de dependencias (Maven / npm) y su propio `Dockerfile` — se construyen y despliegan como contenedores separados, comunicándose únicamente por la API REST del backend.
- **`database/`** concentra el modelado de datos por fuera del código de aplicación, para que el DER y los scripts SQL puedan revisarse y versionarse independientemente de la implementación en Java.
- **`requirements/`** es la documentación de ingeniería (no código): ahí vive tanto el enunciado original como todo el análisis derivado de él. Es intencional que estos documentos estén versionados en el repositorio — la prueba técnica exige entregar la documentación de ingeniería junto con el código (ver sección 10 de `Prueba Tecnica Inventario.pdf`).
- El `Dockerfile` en la raíz del repositorio es un archivo vacío sin uso — cada subproyecto define el suyo propio (`OPC-back/Dockerfile`, y próximamente `OPC-front/Dockerfile`).

## Cómo levantar el proyecto

```bash
cp .env.example .env   # ajustar credenciales/puertos si es necesario
docker compose up
```

Esto levanta MySQL y el backend. El servicio de frontend en Docker Compose está pendiente (ver backlog de tareas de la épica *Infraestructura Docker*).
