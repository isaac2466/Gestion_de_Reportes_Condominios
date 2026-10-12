# Reporta+ · Frontend conversacional

React y Vite, sin dependencias adicionales para el chat. Conserva cabecera, paleta morada, compositor inferior, historial lateral y administración.

## Ejecutar

Desde la raíz, en una terminal para el backend:

```powershell
cd backend
python -m venv .venv # solo si no existe
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Se requiere MySQL con la base del proyecto y `backend/.env` configurado a partir de `.env.example`. No sobrescribir configuraciones existentes. FastAPI crea tablas faltantes al arrancar; no migra tablas existentes. Ollama es opcional para completar formularios con el respaldo del backend.

En otra terminal, desde la raíz:

```powershell
cd frontend/React
npm ci
npm run dev -- --host 127.0.0.1
```

Abrir http://127.0.0.1:5173 e iniciar sesión. `VITE_API_URL` configura FastAPI; por defecto usa `http://localhost:8000`. El residente se obtiene de la sesión, nunca de un campo editable.

## Archivos y estructura

- `src/App.jsx`: conserva sesión, reportes definitivos, detalle y administración; integra el nuevo espacio del residente.
- `src/components/ConversationWorkspace.jsx`: chat, compositor, historial separado y valores temporales por conversación/formulario.
- `src/components/ConversationMessage.jsx`: renderiza text, question, form, warning, summary, confirmation y error. Los campos y opciones vienen del backend.
- `src/hooks/useConversations.js`: crea, recupera, envía, cancela y restaura la selección por residente. Conserva el ID de operaciones inciertas para reintentos; una operación diferente recibe otro ID.
- `src/utils/conversations.js`: presentación de estados, vigencia de formularios/resúmenes y combinación sin mensajes duplicados. No contiene clasificación ni reglas de completitud.
- `src/services/api.js`: amplía el cliente HTTP existente, traduce errores e incluye capacidades futuras.
- `src/App.css`: estilos de conversación con las variables y composición existentes.
- `tests/conversations.test.mjs` y `tests/conversations.browser.mjs`: versiones, idempotencia y recorridos de interfaz con API simulada.
- `package.json`: incorpora `npm test`, sin agregar dependencias.

El antiguo `ReportForm.jsx` se conserva desacoplado. El residente ya no lo usa ni llama a POST /api/reportes. La integración inicial conservó el backend; el ajuste de domicilio descrito abajo amplía sus servicios conversacionales. No se modificaron los datos existentes, los archivos de entorno ni la administración.

Si no hay historial se invita a iniciar una conversación explícitamente, evitando borradores vacíos en cada recarga o por los efectos dobles de StrictMode. Si existe historial se recupera la selección guardada o la conversación abierta más reciente. Una recarga reconstruye lo persistido en FastAPI; los valores todavía no enviados se conservan mientras dura la sesión de la página, incluso al cambiar de conversación.

## Dependencias de próximas fases

- Fase 9: el backend no expone `/confirm`. `conversationFeatures.confirmation` permanece en false y “Enviar reporte” está desactivado. La función API y el renderer están preparados. Al conectar el contrato definitivo, verificar su respuesta, refrescar los reportes y probar la transacción real antes de habilitarla.
- Fase 10: “Adjuntar” permanece visible y desactivado. No se simulan adjuntos mediante el endpoint tradicional.

`ready_for_confirmation` siempre representa un borrador: nunca aparece en Reportes ni se anuncia como enviado. Se permiten correcciones hasta que el backend cierre la conversación. Cancelar conserva los mensajes y bloquea las entradas.

## Validación

```powershell
npm test
npm run lint
npm run build
```

Prueba de navegador opcional usando una instalación existente de Playwright:

```powershell
$env:PLAYWRIGHT_MODULE = 'C:\ruta\a\node_modules\playwright'
$env:BROWSER_CHANNEL = 'msedge'
node tests/conversations.browser.mjs
```

Arranca Vite temporalmente en 127.0.0.1:5174 y un navegador aislado, intercepta todos los endpoints /api/ y cierra ambos al terminar. No escribe en MySQL. `TEST_URL` permite usar otro servidor y `SCREENSHOT_DIR` guardar capturas.

Verificados: doble clic, pregunta irrelevante, text/textarea/choice, formulario, fallback, campos nulos, correcciones y versiones antiguas, warning antes de summary, recuperación tras recarga, cancelación, respuesta perdida y reintento sin duplicados, errores 404/409/422/500, reportes separados, renderers futuros, detalle, administración, escritorio, móvil de 390 px, desplazamiento al final y ausencia de excepciones de página.

Estas pruebas verifican el frontend con respuestas acordes al contrato revisado. Falta recorrerlo con una instancia real de FastAPI/MySQL y la configuración de Ollama del entorno; no se levantó ni modificó esa infraestructura en esta tarea.

## Ajuste de domicilio del residente

Python resuelve referencias conservadoras como “en mi casa”, “mi domicilio”, “mi hogar” y “mi vivienda” mediante `Habitante.Direccion`, después del merge y antes de calcular campos faltantes. Guarda la dirección concreta en `locacion_borrador` y el origen en `datos_contexto`, sin columnas nuevas. Los resúmenes muestran “Tu domicilio” y el snapshot real.

La ubicación concreta extraída tiene prioridad. Casas ajenas, referencias como “cerca de mi casa” y negaciones no se sustituyen por la dirección registrada. Al corregir la ubicación se eliminan únicamente `location_source` y `location_label`. Sin dirección se pide ubicación; sin Ollama siguen funcionando los formularios. Si una corrección negativa no puede extraerse, se solicita ubicación en lugar de mantener el domicilio rechazado.

El snapshot no se vuelve a consultar al cambiar el perfil ni al recargar. La dirección resuelta no se añade al listado lateral ni se envía automáticamente como ubicación al extractor o al análisis de Llama. El modelo no puede generar los metadatos de origen. Confirmación continúa desactivada.

Archivos del ajuste: `backend/app/services/conversation_service.py`, `backend/app/services/conversation_ai_service.py`, `backend/tests/test_resident_location.py`, `src/components/ConversationMessage.jsx` y la prueba de navegador existente.

Para ejecutar las 14 pruebas de backend desde `backend/`:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Las pruebas de persistencia usan SQLite aislado y el serializer/handler GET real, sin tocar MySQL. Las llamadas a IA están simuladas; falta verificar la extracción con el modelo Ollama concreto del entorno.

## Historial cancelado y verificación del administrador

Las cancelaciones realizadas en esta página se ocultan del listado tras 30 segundos. El plazo se conserva en localStorage por residente y sigue vigente al recargar; no se borran conversaciones ni mensajes del servidor. Las canceladas antiguas se omiten al cargar el listado. La conversación abierta sigue visible para consultar su contenido hasta cambiar a otra.

“Enviar reporte · próximamente” permanece deshabilitado por la Fase 9, con cursor de acción no disponible en lugar de espera.

El administrador incorpora actualización manual, carga y errores persistentes, protección contra doble envío y detalle sincronizado con la lista actual. Los reportes sin análisis muestran “Sin clasificar”, con filtro propio; las fechas inválidas no rompen la interfaz. La selección respeta los filtros y en móvil abre el detalle mediante desplazamiento y foco. Se conserva la identidad visual y se corrige el aviso de estado para que no se salga de la pantalla.

Verificación de interfaz con respuestas simuladas, sin modificar reportes reales:

```powershell
node tests/admin.browser.mjs
node tests/conversations.browser.mjs
```

Usar la misma configuración PLAYWRIGHT_MODULE/BROWSER_CHANNEL indicada arriba. Se comprobaron filtros combinados, ordenamiento, métricas, imágenes, cuatro estados, error y reintento, doble clic, actualización de detalle, datos nulos, fechas inválidas, listas vacías, escritorio/móvil y el plazo de cancelación (antes/después de 30 segundos y tras recarga). Ambas pruebas usan API simulada; no validan autenticación ni persistencia del backend real.
