# Sistema Inteligente de Reportes Vecinales

## Documento de contexto y guía de desarrollo

**Tipo de proyecto:** Aplicación web mobile-first  
**Duración estimada de desarrollo:** 5 días  
**Objetivo:** Construir un prototipo funcional que permita a los habitantes de una colonia registrar problemas o incidencias, adjuntar imágenes y utilizar un modelo local de inteligencia artificial para analizar, clasificar y priorizar los reportes.

---

# 1. Descripción general

El proyecto consiste en una plataforma web orientada principalmente a dispositivos móviles para la gestión de reportes vecinales.

Los usuarios podrán registrar problemas dentro de su colonia, como:

- Fugas de agua.
- Alumbrado público o interno dañado.
- Basura acumulada.
- Baches.
- Árboles caídos.
- Daños en áreas comunes.
- Problemas de mantenimiento.
- Situaciones que puedan representar riesgos.
- Otros problemas comunitarios.

Cada reporte podrá incluir:

- Título.
- Descripción.
- Ubicación escrita.
- Una imagen opcional.
- Fecha de creación.
- Estado del reporte.

Una vez recibido el reporte, el backend utilizará un modelo local ejecutado mediante Ollama para analizar el contenido.

La inteligencia artificial tendrá como objetivo:

1. Identificar la categoría del problema.
2. Determinar una prioridad sugerida.
3. Asignar un nivel de severidad.
4. Generar un resumen breve.
5. Proponer una recomendación general.
6. Opcionalmente analizar la imagen adjunta si se dispone de un modelo multimodal.

La IA funcionará como un sistema de apoyo. La administración podrá revisar el resultado y cambiar el estado del reporte.

---

# 2. Alcance del proyecto

Debido a que el proyecto se desarrollará en aproximadamente cinco días, el alcance debe mantenerse controlado.

El objetivo no será construir una plataforma comercial completa, sino un prototipo funcional y correctamente estructurado que demuestre el flujo principal.

## Funciones que sí se implementarán

- Interfaz mobile-first en React.
- Registro básico de usuarios o usuarios precargados.
- Dos roles: residente y administrador.
- Creación de reportes.
- Carga opcional de imágenes.
- Almacenamiento de datos en MySQL.
- API REST desarrollada con FastAPI.
- Integración con Ollama.
- Análisis de reportes mediante Llama.
- Clasificación automática.
- Asignación de prioridad.
- Resumen generado por IA.
- Recomendación generada por IA.
- Consulta de reportes.
- Vista de detalle.
- Panel administrativo sencillo.
- Cambio del estado de los reportes.
- Historial básico de cambios.
- Ordenamiento de reportes según prioridad.

## Funciones que no serán prioridad

Estas características pueden quedar como futuras mejoras:

- Aplicación móvil nativa.
- Mapas interactivos.
- GPS en tiempo real.
- Notificaciones push.
- Correos electrónicos.
- múltiples colonias.
- Chat entre usuarios.
- Sistema avanzado de permisos.
- Integración directa con servicios municipales.
- Detección avanzada de reportes duplicados.
- Estadísticas predictivas.
- Panel administrativo complejo.
- Moderación automatizada avanzada.
- Análisis histórico con IA.

---

# 3. Tecnologías

## Frontend

- React
- Vite
- JavaScript
- CSS o Tailwind CSS
- React Router

El frontend será mobile-first.

---

## Backend

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic
- PyMySQL o mysql-connector-python
- python-multipart para recepción de archivos

---

## Base de datos

- MySQL

MySQL almacenará la información permanente del sistema.

---

## Inteligencia artificial

- Ollama
- Modelo Llama para análisis de texto
- Modelo multimodal opcional para imágenes

Durante el desarrollo se priorizará primero el análisis de texto.

El análisis visual se incorporará después de que el flujo principal esté funcionando correctamente.

---

# 4. Arquitectura general

La arquitectura será sencilla.

```text
┌──────────────────────────────┐
│          FRONTEND            │
│       React + Vite           │
│       Mobile First           │
└──────────────┬───────────────┘
               │
               │ HTTP / JSON
               ▼
┌──────────────────────────────┐
│           BACKEND            │
│      FastAPI + Python        │
│                              │
│  API + reglas + servicios    │
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌─────────────┐   ┌─────────────┐
│    MySQL    │   │   Ollama    │
│             │   │             │
│ Datos       │   │ Llama       │
└─────────────┘   └─────────────┘
```

React nunca deberá conectarse directamente con MySQL ni con Ollama.

Toda comunicación pasará por FastAPI.

---

# 5. Responsabilidad de cada parte

## React

React será responsable de:

- Mostrar la interfaz.
- Recibir datos del usuario.
- Permitir seleccionar imágenes.
- Enviar reportes al backend.
- Mostrar reportes.
- Mostrar prioridades.
- Mostrar estados.
- Mostrar resultados de la IA.
- Permitir acciones administrativas.

React no deberá contener reglas importantes de negocio.

---

## FastAPI

FastAPI será el centro de la aplicación.

Será responsable de:

- Recibir peticiones del frontend.
- Validar información.
- Guardar archivos.
- Comunicarse con MySQL.
- Comunicarse con Ollama.
- Procesar respuestas del modelo.
- Crear reportes.
- Actualizar estados.
- Consultar reportes.
- Gestionar usuarios.
- Registrar historial de cambios.

---

## MySQL

MySQL será responsable de almacenar permanentemente:

- Usuarios.
- Reportes.
- Imágenes asociadas.
- Historial de cambios.

La información generada por la IA también se almacenará dentro del reporte para no tener que analizar nuevamente el mismo contenido cada vez que se consulte.

---

## Ollama / Llama

Ollama será responsable de ejecutar localmente el modelo.

Llama analizará:

- Descripción del usuario.
- Título.
- Información adicional.
- Opcionalmente el resultado de un análisis visual.

El modelo devolverá una estructura JSON.

Ejemplo:

```json
{
  "category": "Agua",
  "priority": "High",
  "severity": 4,
  "summary": "Se reporta una posible fuga de agua en un área común.",
  "recommendation": "Revisar la tubería y evaluar si es necesario cerrar temporalmente el suministro."
}
```

---

# 6. Estructura del repositorio

Todo el proyecto estará contenido en un único repositorio.

```text
colonia-reportes/
│
├── frontend/
│   ├── public/
│   │
│   ├── src/
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   └── icons/
│   │   │
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── BottomNav.jsx
│   │   │   ├── ReportCard.jsx
│   │   │   ├── PriorityBadge.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── ImageUploader.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── CreateReport.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── ReportDetail.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Admin.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   │
│   │   ├── config/
│   │   │   ├── database.py
│   │   │   └── settings.py
│   │   │
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── report.py
│   │   │   ├── report_image.py
│   │   │   └── report_update.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   └── report.py
│   │   │
│   │   ├── routes/
│   │   │   ├── users.py
│   │   │   ├── reports.py
│   │   │   └── admin.py
│   │   │
│   │   ├── services/
│   │   │   ├── ai_service.py
│   │   │   ├── report_service.py
│   │   │   └── image_service.py
│   │   │
│   │   └── utils/
│   │       └── file_utils.py
│   │
│   ├── uploads/
│   │   └── reports/
│   │
│   ├── requirements.txt
│   └── .env
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── .gitignore
└── README.md
```

---

# 7. Explicación de las carpetas

## frontend/src/components

Contendrá componentes reutilizables.

### ReportCard.jsx

Representará cada reporte.

Mostrará:

- Título.
- Categoría.
- Ubicación.
- Prioridad.
- Estado.

### PriorityBadge.jsx

Mostrará visualmente:

- Critical
- High
- Medium
- Low

### StatusBadge.jsx

Mostrará:

- Pending
- In Progress
- Resolved
- Rejected

### ImageUploader.jsx

Permitirá:

- Seleccionar una imagen.
- Previsualizarla.
- Enviarla junto al reporte.

---

# 8. Páginas principales

## Home

Página inicial.

Mostrará:

- Bienvenida.
- Botón para crear reporte.
- Reportes recientes.
- Reportes importantes.

---

## CreateReport

Formulario principal.

Campos:

- Título.
- Descripción.
- Ubicación.
- Imagen opcional.

El usuario NO seleccionará inicialmente la prioridad.

La prioridad será sugerida por IA.

---

## Reports

Lista de reportes del usuario.

Filtros sencillos:

- Todos.
- Pending.
- In Progress.
- Resolved.

---

## ReportDetail

Mostrará:

- Título.
- Descripción.
- Imagen.
- Categoría.
- Prioridad.
- Severidad.
- Estado.
- Resumen de IA.
- Recomendación.
- Fecha de creación.
- Historial.

---

## Admin

Permitirá al administrador:

- Consultar todos los reportes.
- Ordenarlos por prioridad.
- Abrir detalles.
- Cambiar el estado.
- Consultar el análisis de IA.

---

# 9. Navegación móvil

La aplicación estará diseñada principalmente para teléfonos.

Una barra inferior puede tener:

```text
Inicio      Reportar      Reportes      Perfil
  🏠           +             📋           👤
```

Para administrador:

```text
Inicio      Reportes      Admin
  🏠            📋          ⚙
```

---

# 10. Flujo principal del sistema

## Paso 1. Usuario crea reporte

El usuario abre:

```text
CreateReport
```

Captura:

```text
Título:
Fuga de agua

Descripción:
Hay mucha agua saliendo de una tubería frente al parque.

Ubicación:
Parque principal
```

Opcionalmente agrega una fotografía.

---

## Paso 2. React envía la información

React realiza una petición:

```text
POST /api/reports
```

Si existe imagen, se utilizará `multipart/form-data`.

---

## Paso 3. FastAPI recibe el reporte

FastAPI:

1. Valida los campos.
2. Guarda la imagen si existe.
3. Envía el texto al servicio de IA.
4. Espera el análisis.
5. Procesa el JSON devuelto.
6. Guarda el reporte en MySQL.
7. Guarda la ruta de la imagen.
8. Registra la creación en el historial.
9. Devuelve el reporte al frontend.

---

# 11. Flujo de IA

El servicio:

```text
backend/app/services/ai_service.py
```

será el único responsable de comunicarse con Ollama.

Flujo:

```text
Reporte
   ↓
ai_service.py
   ↓
Ollama
   ↓
Llama
   ↓
JSON
   ↓
FastAPI
```

---

# 12. Prompt base

Ejemplo conceptual:

```text
Eres un sistema encargado de analizar reportes vecinales.

Analiza el siguiente problema:

Título:
{title}

Descripción:
{description}

Ubicación:
{location}

Determina:

- category
- priority
- severity
- summary
- recommendation

Las prioridades permitidas son:

Critical
High
Medium
Low

La severidad debe ser un número entre 1 y 5.

Devuelve únicamente JSON válido.
```

---

# 13. Uso de imágenes

La primera versión puede funcionar solamente con análisis de texto.

Después se puede agregar análisis visual.

Flujo:

```text
Usuario
   ↓
Imagen
   ↓
FastAPI
   ↓
Modelo multimodal
   ↓
Descripción de lo observado
   ↓
Llama
   ↓
Clasificación final
```

Ejemplo:

```text
Descripción del usuario:
"Esto está afuera del parque."

Análisis visual:
"La imagen muestra una luminaria inclinada y aparentemente dañada."

Datos enviados al análisis final:
Usuario reporta un problema frente al parque.
La imagen muestra una luminaria dañada.

Determina categoría y prioridad.
```

La imagen original se guarda en:

```text
backend/uploads/reports/
```

La base de datos solamente guardará su ruta.

---

# 14. Base de datos

La primera versión utilizará cuatro tablas principales:

1. `users`
2. `reports`
3. `report_images`
4. `report_updates`

Relaciones:

```text
users
  │
  │ 1
  │
  └─────────────── N
                 reports
                    │
                    │ 1
              ┌─────┴─────┐
              │           │
              N           N
       report_images  report_updates
```

---

# 15. Tabla users

Representa a las personas que pueden entrar al sistema.

Campos:

| Campo | Tipo | Descripción |
|---|---|---|
| id | INT | Identificador |
| name | VARCHAR | Nombre |
| email | VARCHAR | Correo |
| password_hash | VARCHAR | Contraseña cifrada |
| role | ENUM | resident/admin |
| created_at | TIMESTAMP | Fecha de creación |

SQL:

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('resident', 'admin') NOT NULL DEFAULT 'resident',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# 16. Tabla reports

Será la tabla principal.

Campos:

| Campo | Descripción |
|---|---|
| id | Identificador |
| user_id | Usuario que creó el reporte |
| title | Título |
| description | Descripción original |
| location | Ubicación escrita |
| category | Categoría asignada |
| priority | Prioridad |
| severity | Severidad |
| ai_summary | Resumen generado |
| ai_recommendation | Recomendación |
| ai_confidence | Confianza opcional |
| status | Estado |
| created_at | Fecha |
| updated_at | Última modificación |

SQL:

```sql
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255),

    category VARCHAR(100),

    priority ENUM(
        'Low',
        'Medium',
        'High',
        'Critical'
    ) DEFAULT 'Medium',

    severity TINYINT DEFAULT 1,

    ai_summary TEXT,
    ai_recommendation TEXT,
    ai_confidence DECIMAL(5,2),

    status ENUM(
        'Pending',
        'In Progress',
        'Resolved',
        'Rejected'
    ) DEFAULT 'Pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
```

---

# 17. Tabla report_images

Aunque inicialmente un reporte podría tener una sola imagen, conviene utilizar una tabla separada.

Esto permite agregar varias imágenes posteriormente sin modificar `reports`.

Campos:

| Campo | Descripción |
|---|---|
| id | Identificador |
| report_id | Reporte |
| image_path | Ruta |
| created_at | Fecha |

SQL:

```sql
CREATE TABLE report_images (
    id INT AUTO_INCREMENT PRIMARY KEY,

    report_id INT NOT NULL,

    image_path VARCHAR(500) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (report_id)
        REFERENCES reports(id)
        ON DELETE CASCADE
);
```

---

# 18. Tabla report_updates

Guardará el historial de cambios de cada reporte.

Ejemplo:

```text
Reporte creado
↓
Pending

Administrador comienza atención
↓
In Progress

Problema solucionado
↓
Resolved
```

Campos:

| Campo | Descripción |
|---|---|
| id | Identificador |
| report_id | Reporte |
| user_id | Usuario que hizo el cambio |
| previous_status | Estado anterior |
| new_status | Estado nuevo |
| comment | Comentario |
| created_at | Fecha |

SQL:

```sql
CREATE TABLE report_updates (
    id INT AUTO_INCREMENT PRIMARY KEY,

    report_id INT NOT NULL,

    user_id INT,

    previous_status ENUM(
        'Pending',
        'In Progress',
        'Resolved',
        'Rejected'
    ),

    new_status ENUM(
        'Pending',
        'In Progress',
        'Resolved',
        'Rejected'
    ) NOT NULL,

    comment VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (report_id)
        REFERENCES reports(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);
```

---

# 19. SQL completo inicial

El archivo:

```text
database/schema.sql
```

puede contener:

```sql
CREATE DATABASE IF NOT EXISTS colonia_reportes;

USE colonia_reportes;


CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('resident', 'admin') NOT NULL DEFAULT 'resident',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255),

    category VARCHAR(100),

    priority ENUM(
        'Low',
        'Medium',
        'High',
        'Critical'
    ) DEFAULT 'Medium',

    severity TINYINT DEFAULT 1,

    ai_summary TEXT,
    ai_recommendation TEXT,
    ai_confidence DECIMAL(5,2),

    status ENUM(
        'Pending',
        'In Progress',
        'Resolved',
        'Rejected'
    ) DEFAULT 'Pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


CREATE TABLE report_images (
    id INT AUTO_INCREMENT PRIMARY KEY,

    report_id INT NOT NULL,

    image_path VARCHAR(500) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (report_id)
        REFERENCES reports(id)
        ON DELETE CASCADE
);


CREATE TABLE report_updates (
    id INT AUTO_INCREMENT PRIMARY KEY,

    report_id INT NOT NULL,

    user_id INT,

    previous_status ENUM(
        'Pending',
        'In Progress',
        'Resolved',
        'Rejected'
    ),

    new_status ENUM(
        'Pending',
        'In Progress',
        'Resolved',
        'Rejected'
    ) NOT NULL,

    comment VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (report_id)
        REFERENCES reports(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);
```

---

# 20. Datos de prueba

El archivo:

```text
database/seed.sql
```

puede insertar usuarios de prueba.

Ejemplo:

```sql
USE colonia_reportes;

INSERT INTO users
(name, email, password_hash, role)
VALUES
(
    'Usuario Demo',
    'usuario@demo.com',
    'HASH_DE_PRUEBA',
    'resident'
),
(
    'Administrador',
    'admin@demo.com',
    'HASH_DE_PRUEBA',
    'admin'
);
```

---

# 21. Conexión FastAPI con MySQL

Archivo:

```text
backend/app/config/database.py
```

Responsabilidad:

- Crear el engine de SQLAlchemy.
- Crear las sesiones.
- Proporcionar acceso a la base de datos.

Ejemplo conceptual:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = (
    "mysql+pymysql://root:password@localhost/colonia_reportes"
)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)
```

En el proyecto real la contraseña no debe escribirse directamente.

Se utilizará `.env`.

Ejemplo:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=colonia_reportes
DB_USER=root
DB_PASSWORD=password
```

---

# 22. Endpoints principales

## Usuarios

```text
POST /api/users
POST /api/login
GET  /api/users/{id}
```

Para un prototipo de cinco días, el sistema de autenticación puede mantenerse sencillo.

---

## Reportes

```text
GET    /api/reports
POST   /api/reports
GET    /api/reports/{id}
PUT    /api/reports/{id}
DELETE /api/reports/{id}
```

No necesariamente todos deben implementarse.

Los esenciales son:

```text
GET  /api/reports
POST /api/reports
GET  /api/reports/{id}
```

---

## Reportes de un usuario

```text
GET /api/users/{user_id}/reports
```

---

## Administración

```text
GET /api/admin/reports
PATCH /api/admin/reports/{id}/status
```

---

# 23. Ejemplo de creación de reporte

React envía:

```text
POST /api/reports
```

Contenido:

```text
title
description
location
image
```

FastAPI procesa:

```text
1. Recibe datos
2. Guarda imagen
3. Analiza con IA
4. Inserta reports
5. Inserta report_images
6. Inserta report_updates
7. Regresa resultado
```

Respuesta:

```json
{
  "id": 15,
  "title": "Fuga de agua",
  "category": "Agua",
  "priority": "High",
  "severity": 4,
  "status": "Pending",
  "ai_summary": "Posible fuga de agua en una zona común.",
  "ai_recommendation": "Revisar la tubería."
}
```

---

# 24. Ordenamiento por prioridad

Para administración, los reportes deberán aparecer primero según gravedad.

Orden:

```text
Critical
High
Medium
Low
```

SQL:

```sql
SELECT *
FROM reports
ORDER BY
    CASE priority
        WHEN 'Critical' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        WHEN 'Low' THEN 4
    END,
    created_at ASC;
```

Esto también permite que los reportes antiguos tengan precedencia cuando comparten la misma prioridad.

---

# 25. Flujo administrativo

```text
Administrador
      ↓
Panel Admin
      ↓
Consulta reportes
      ↓
Ordenados por prioridad
      ↓
Selecciona reporte
      ↓
Revisa descripción
      ↓
Revisa análisis de IA
      ↓
Cambia estado
      ↓
FastAPI actualiza MySQL
      ↓
Se crea report_update
      ↓
Usuario ve nuevo estado
```

---

# 26. Estados permitidos

Para el prototipo:

```text
Pending
In Progress
Resolved
Rejected
```

Flujo normal:

```text
Pending
   ↓
In Progress
   ↓
Resolved
```

Rejected se utilizará solamente cuando el reporte no corresponda a un problema válido.

---

# 27. Prioridades

```text
Critical
High
Medium
Low
```

Ejemplos:

## Critical

- Riesgo inmediato.
- Cable eléctrico expuesto.
- Estructura peligrosa.
- Situación que pueda causar daño.

## High

- Fuga importante.
- Alumbrado completamente inhabilitado en una zona relevante.
- Árbol bloqueando paso.
- Daño significativo.

## Medium

- Problema que requiere atención pero no representa riesgo inmediato.

## Low

- Mantenimiento menor.
- Problemas estéticos.
- Solicitudes no urgentes.

---

# 28. Regla importante sobre la IA

La IA no deberá controlar completamente las decisiones.

La prioridad generada es una recomendación.

El administrador deberá tener la posibilidad de modificar:

- Categoría.
- Prioridad.
- Estado.

Esto evita depender completamente del modelo.

---

# 29. Manejo de errores de IA

El sistema debe continuar funcionando aunque Ollama falle.

Si el modelo no responde:

```text
category = "Sin clasificar"
priority = "Medium"
severity = 1
ai_summary = NULL
ai_recommendation = NULL
```

El reporte deberá guardarse de todas maneras.

Esto evita que una falla del modelo impida que el usuario registre un problema.

---

# 30. Flujo en caso de error

```text
Usuario envía reporte
        ↓
FastAPI
        ↓
Ollama falla
        ↓
FastAPI captura excepción
        ↓
Guarda reporte
        ↓
Prioridad temporal = Medium
        ↓
Usuario recibe confirmación
```

La IA es una herramienta adicional, no debe ser una dependencia obligatoria para crear reportes.

---

# 31. Seguridad mínima

Aunque sea un prototipo:

- No guardar contraseñas en texto plano.
- Utilizar hashes.
- No guardar secretos en Git.
- Utilizar `.env`.
- Validar extensiones de imágenes.
- Limitar tamaño de archivos.
- No permitir nombres de archivo proporcionados directamente por el usuario.
- Generar nombres únicos.
- Validar información con Pydantic.
- No permitir que React se conecte directamente a MySQL.

---

# 32. Archivo .gitignore

Ejemplo:

```text
# React
frontend/node_modules/
frontend/dist/

# Python
backend/.venv/
backend/__pycache__/
*.pyc

# Variables privadas
backend/.env

# Archivos cargados
backend/uploads/

# IDE
.vscode/
.idea/

# Sistema
.DS_Store
Thumbs.db
```

---

# 33. Plan de trabajo de cinco días

## Día 1 — Estructura

Objetivos:

- Crear repositorio.
- Crear React.
- Crear FastAPI.
- Crear MySQL.
- Crear tablas.
- Configurar conexión React → FastAPI.
- Configurar FastAPI → MySQL.

Resultado:

```text
React
 ↓
FastAPI
 ↓
MySQL
```

funcionando.

---

## Día 2 — Reportes

Objetivos:

- Crear modelo Report.
- Crear endpoints.
- Crear formulario.
- Guardar reportes.
- Mostrar reportes.
- Crear detalle.

Resultado:

CRUD básico funcionando.

---

## Día 3 — Diseño mobile-first

Objetivos:

- Inicio.
- Crear reporte.
- Mis reportes.
- Detalle.
- Navegación.
- Componentes reutilizables.
- Diseño responsive.

Resultado:

Aplicación visualmente completa.

---

## Día 4 — Inteligencia artificial

Objetivos:

- Instalar/configurar Ollama.
- Seleccionar modelo.
- Crear ai_service.py.
- Crear prompt.
- Obtener JSON.
- Guardar análisis en MySQL.
- Mostrar categoría y prioridad.

Resultado:

```text
Reporte
 ↓
Llama
 ↓
Clasificación
 ↓
MySQL
```

funcionando.

---

## Día 5 — Imágenes y administración

Objetivos:

- Carga de imágenes.
- Guardar rutas.
- Mostrar imágenes.
- Panel administrativo.
- Cambio de estado.
- Historial.
- Corrección de errores.
- Preparación del demo.

Si queda tiempo:

- Probar modelo multimodal.
- Analizar fotografía.

---

# 34. Orden correcto de implementación

No comenzar directamente por IA.

Orden recomendado:

```text
1. Proyecto
2. MySQL
3. FastAPI
4. React
5. CRUD de reportes
6. Diseño
7. Ollama
8. Imágenes
9. Admin
10. Pruebas
```

La aplicación debe poder funcionar aunque la IA todavía no esté integrada.

---

# 35. MVP final esperado

Al finalizar los cinco días se espera demostrar:

```text
Usuario
  ↓
Crea reporte
  ↓
Adjunta imagen opcional
  ↓
FastAPI recibe
  ↓
Llama analiza texto
  ↓
Genera categoría y prioridad
  ↓
MySQL guarda información
  ↓
Reporte aparece en la aplicación
  ↓
Administrador revisa
  ↓
Cambia estado
  ↓
Usuario consulta progreso
```

---

# 36. Ejemplo completo de uso

Un vecino encuentra una fuga.

Abre la aplicación.

Presiona:

```text
+ Reportar problema
```

Escribe:

```text
Título:
Fuga frente al parque

Descripción:
Hay bastante agua saliendo de una tubería y ya está llegando a la banqueta.

Ubicación:
Parque central
```

Adjunta fotografía.

FastAPI recibe la información.

Llama analiza:

```json
{
  "category": "Agua",
  "priority": "High",
  "severity": 4,
  "summary": "Posible fuga significativa de agua cerca de una zona peatonal.",
  "recommendation": "Solicitar revisión de la tubería lo antes posible."
}
```

MySQL guarda:

```text
Reporte #15

Category:
Agua

Priority:
High

Status:
Pending
```

El administrador abre el panel.

Encuentra:

```text
🟠 HIGH

Fuga frente al parque
Pending
```

La revisa y cambia:

```text
Pending
→
In Progress
```

Se crea un registro en `report_updates`.

Después:

```text
In Progress
→
Resolved
```

El usuario puede consultar todo el proceso.

---

# 37. Visión futura

Si el proyecto continuara después del prototipo, podrían agregarse:

- múltiples colonias;
- mapas;
- coordenadas;
- GPS;
- geolocalización;
- detección de duplicados;
- embeddings;
- búsquedas semánticas;
- notificaciones;
- comentarios;
- votos de "también me afecta";
- estadísticas;
- responsables de mantenimiento;
- fechas límite;
- SLA;
- análisis histórico;
- identificación de zonas problemáticas;
- integración municipal.

Estas funciones no forman parte del alcance principal de cinco días.

---

# 38. Principios que deben mantenerse

Durante el desarrollo se seguirán estas reglas:

1. Mantener el proyecto sencillo.
2. No agregar tecnologías innecesarias.
3. React solo maneja interfaz.
4. FastAPI concentra la lógica.
5. MySQL almacena los datos.
6. Ollama ejecuta los modelos.
7. La IA ayuda, pero no controla completamente el sistema.
8. El reporte debe guardarse aunque la IA falle.
9. Mobile-first será prioridad visual.
10. Primero se termina el flujo funcional y después se agregan mejoras.

---

# 39. Resumen técnico

```text
Frontend
React + Vite
        ↓
REST API
        ↓
Backend
FastAPI + Python
        ↓
┌───────────────────────┐
│                       │
▼                       ▼
MySQL                 Ollama
                         ↓
                       Llama
```

Tablas:

```text
users
reports
report_images
report_updates
```

Flujo principal:

```text
Crear reporte
     ↓
Analizar con IA
     ↓
Guardar
     ↓
Mostrar
     ↓
Administrar
     ↓
Actualizar estado
     ↓
Consultar progreso
```

Este documento debe utilizarse como contexto principal durante el desarrollo del prototipo.
