# Gestión de Reportes de Condominios

Aplicación web para registrar incidencias vecinales, analizarlas con Ollama y dar seguimiento a su estado desde perfiles de residente y administrador.

## Estructura

- `backend/`: API FastAPI, persistencia en MySQL y análisis de reportes con Ollama.
- `frontend/React/`: cliente React + Vite.
- `database/Colonia.sql`: esquema inicial de la base de datos.
- `docs/`: contexto funcional del proyecto.

## Requisitos

- Python 3.11 o superior.
- Node.js 20.19 o superior.
- MySQL 8.
- Ollama con el modelo configurado (por defecto `llama3.2:3b`).

## Puesta en marcha

1. Ejecuta `database/Colonia.sql` en MySQL.
2. Copia `backend/.env.example` como `backend/.env` y ajusta las credenciales.
3. Instala y levanta la API desde `backend/`:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```

4. Copia `frontend/React/.env.example` como `frontend/React/.env` si necesitas cambiar la URL de la API.
5. Instala y levanta el cliente desde `frontend/React/`:

   ```powershell
   npm install
   npm run dev
   ```

La interfaz queda disponible en `http://localhost:5173` y la documentación de la API en `http://localhost:8000/docs`.

## Roles

El registro público crea residentes. Para habilitar el panel administrativo, cambia el rol de un usuario desde MySQL:

```sql
UPDATE habitantes SET Rol = 'admin' WHERE Email = 'administrador@ejemplo.com';
```

Al volver a iniciar sesión, ese usuario verá todos los reportes y podrá actualizar su estado.

## Verificación del frontend

```powershell
cd frontend/React
npm run lint
npm run build
```
