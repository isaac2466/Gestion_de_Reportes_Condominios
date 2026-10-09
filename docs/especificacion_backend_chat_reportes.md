# Especificación para convertir la creación de reportes en un chat asistido

## 1. Propósito

Este documento describe los cambios recomendados en el backend para que un residente pueda crear un reporte mediante una conversación natural con una IA.

El resultado esperado es:

1. El usuario describe un problema con sus propias palabras.
2. La IA comprende la información y determina si es suficiente.
3. Si faltan datos, la IA solicita únicamente lo necesario.
4. Cuando el borrador está completo, la IA muestra un resumen estructurado.
5. El usuario puede corregirlo, adjuntar evidencia, cancelar o confirmar.
6. Solo después de la confirmación se crea un registro definitivo en `reportes`.
7. El asistente confirma que el reporte fue recibido y devuelve su folio.

La conversación debe sentirse fluida, pero las decisiones importantes deben seguir siendo deterministas y validadas por FastAPI.

---

## 2. Cambio conceptual principal

Una conversación y un reporte no son la misma entidad.

```text
Conversación en borrador
        ↓
La IA recopila y organiza información
        ↓
Resumen para confirmación
        ↓
El usuario confirma
        ↓
Se crea un único reporte definitivo
```

No se debe crear un reporte nuevo por cada mensaje. El endpoint actual `POST /api/reportes` crea inmediatamente una fila en MySQL, por lo que no debe utilizarse para cada intervención del chat.

### Recomendación

Mantener temporalmente `POST /api/reportes` para compatibilidad, pero agregar un módulo independiente de conversaciones. Cuando el usuario confirme, el nuevo módulo llamará al mismo servicio interno que crea un reporte.

No conviene que una ruta HTTP llame internamente a otra ruta. La lógica actual de creación debe extraerse a una función de servicio reutilizable.

---

## 3. Experiencia funcional deseada

### Caso A: el primer mensaje contiene todo

Usuario:

> Desde ayer hay una fuga grande junto a la entrada norte. El agua ya llega a la banqueta.

Asistente:

> Entendí que hay una fuga de agua desde ayer, junto a la entrada norte, que está afectando la banqueta. Preparé este reporte para que lo revises.

La respuesta incluye:

- título sugerido;
- descripción consolidada;
- ubicación;
- categoría sugerida;
- prioridad y severidad;
- recomendación de seguridad;
- imágenes adjuntas;
- botón **Enviar reporte**;
- botón **Corregir información**;
- botón **Cancelar**.

El reporte todavía no existe en `reportes`. Se crea al pulsar **Enviar reporte**.

### Caso B: faltan datos

Usuario:

> Hay una lámpara dañada.

Asistente:

> ¿En qué parte de la colonia se encuentra y desde cuándo está dañada?

El usuario responde y la IA actualiza el mismo borrador. No se crea un segundo borrador ni un segundo reporte.

### Caso C: el usuario corrige información

Usuario:

> No es en la entrada norte, es junto al parque central.

La IA debe reemplazar la ubicación anterior, mostrar el resumen corregido y volver a solicitar confirmación.

### Caso D: riesgo inmediato

Si el mensaje describe fuego, cables con corriente, olor intenso a gas, violencia u otro riesgo inmediato:

1. La respuesta debe priorizar una advertencia breve y segura.
2. Debe indicar que el usuario se aleje del área y contacte a la autoridad o servicio correspondiente.
3. No debe pedir que manipule objetos peligrosos.
4. Puede solicitar únicamente la ubicación si falta.
5. Debe permitir enviar el reporte con rapidez.

La conversación no debe retrasar una recomendación urgente por intentar completar campos secundarios.

### Caso E: Ollama no está disponible

El usuario debe poder continuar mediante un flujo de respaldo:

- FastAPI conserva los mensajes.
- Se muestra un formulario mínimo con descripción y ubicación.
- El reporte puede enviarse sin clasificación automática.
- Se guarda con prioridad temporal `Medium` y queda pendiente de revisión.

La IA es una ayuda, no una condición para aceptar el reporte.

---

## 4. Estados de una conversación

Se recomienda que el servidor controle los estados permitidos:

| Estado | Significado |
|---|---|
| `collecting` | Se están recopilando datos. |
| `needs_information` | Faltan uno o más campos necesarios. |
| `ready_for_confirmation` | Existe un borrador completo que el usuario debe revisar. |
| `submitting` | Se está creando el reporte. |
| `submitted` | El reporte definitivo ya fue creado. |
| `cancelled` | El usuario canceló la conversación. |
| `expired` | La conversación quedó abandonada demasiado tiempo. |
| `error` | Hubo un problema recuperable. |

Transiciones principales:

```text
collecting
   ├──→ needs_information
   │        └──→ collecting
   ├──→ ready_for_confirmation
   │        ├──→ collecting         (el usuario corrige algo)
   │        ├──→ submitting
   │        │        └──→ submitted
   │        └──→ cancelled
   └──→ expired
```

El modelo de IA puede recomendar una acción, pero FastAPI debe validar y aplicar la transición.

---

## 5. Información mínima requerida

El servidor debe definir los campos necesarios, no el prompt por sí solo.

### Obligatorios para crear el reporte

- descripción clara del problema;
- ubicación o referencia suficiente;
- usuario autenticado;
- confirmación explícita del usuario.

### Generables por la IA

- título;
- categoría;
- prioridad;
- severidad;
- resumen;
- recomendación.

### Opcionales

- imágenes;
- fecha aproximada de inicio;
- elementos o personas afectadas;
- referencias adicionales.

No se debe obligar al usuario a proporcionar una imagen. Tampoco se debe preguntar por datos que ya existen en el perfil, salvo que necesiten confirmación.

### Preguntas dinámicas

Las preguntas dependen del tipo de problema. Ejemplos:

- Alumbrado: ubicación y si la zona queda completamente oscura.
- Agua: tamaño aproximado de la fuga y si afecta el paso.
- Seguridad: si el riesgo sigue activo y ubicación exacta.
- Ruido: zona, horario y frecuencia.
- Basura: ubicación y tamaño aproximado de la acumulación.

Se recomienda un máximo de una o dos preguntas por respuesta para evitar que el chat se convierta en un formulario disfrazado.

---

## 6. Nuevas tablas recomendadas

### 6.1 `conversaciones_reporte`

Representa una sesión de chat que puede terminar o no en un reporte.

```sql
CREATE TABLE conversaciones_reporte (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_habitante INT NOT NULL,
    id_reporte INT NULL,

    estado ENUM(
        'collecting',
        'needs_information',
        'ready_for_confirmation',
        'submitting',
        'submitted',
        'cancelled',
        'expired',
        'error'
    ) NOT NULL DEFAULT 'collecting',

    titulo_borrador VARCHAR(150) NULL,
    descripcion_borrador TEXT NULL,
    locacion_borrador VARCHAR(255) NULL,
    categoria_borrador VARCHAR(100) NULL,
    prioridad_borrador ENUM('Low', 'Medium', 'High', 'Critical') NULL,
    severidad_borrador TINYINT NULL,
    resumen_borrador TEXT NULL,
    recomendacion_borrador TEXT NULL,

    campos_faltantes JSON NULL,
    version_borrador INT NOT NULL DEFAULT 1,
    confirmada_en TIMESTAMP NULL,
    expira_en TIMESTAMP NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_habitante)
        REFERENCES habitantes(id_habitante)
        ON DELETE CASCADE,

    FOREIGN KEY (id_reporte)
        REFERENCES reportes(id)
        ON DELETE SET NULL,

    INDEX idx_conversacion_habitante (id_habitante),
    INDEX idx_conversacion_estado (estado)
);
```

### 6.2 `mensajes_conversacion`

Guarda tanto mensajes del usuario como respuestas del asistente.

```sql
CREATE TABLE mensajes_conversacion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_conversacion BIGINT NOT NULL,
    rol ENUM('user', 'assistant', 'system') NOT NULL,
    contenido TEXT NOT NULL,
    tipo ENUM(
        'text',
        'question',
        'summary',
        'confirmation',
        'warning',
        'error'
    ) NOT NULL DEFAULT 'text',
    metadatos JSON NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_conversacion)
        REFERENCES conversaciones_reporte(id)
        ON DELETE CASCADE,

    INDEX idx_mensaje_conversacion_fecha
        (id_conversacion, fecha_creacion)
);
```

### 6.3 `archivos_conversacion`

Las imágenes pueden adjuntarse antes de que exista el reporte.

```sql
CREATE TABLE archivos_conversacion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_conversacion BIGINT NOT NULL,
    id_mensaje BIGINT NULL,
    ruta_archivo VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    tamano_bytes INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_conversacion)
        REFERENCES conversaciones_reporte(id)
        ON DELETE CASCADE,

    FOREIGN KEY (id_mensaje)
        REFERENCES mensajes_conversacion(id)
        ON DELETE SET NULL
);
```

Al confirmar, los archivos válidos se vinculan al nuevo reporte mediante `imagenes_reportes`. No es necesario duplicar el archivo físico.

---

## 7. Modelos SQLAlchemy sugeridos

Crear archivos separados:

```text
backend/app/models/conversation.py
backend/app/models/message.py
backend/app/models/conversation_file.py
```

Relaciones principales:

```text
Habitante 1 ─── N ConversacionReporte
ConversacionReporte 1 ─── N MensajeConversacion
ConversacionReporte 1 ─── N ArchivoConversacion
ConversacionReporte 0..1 ─── 1 Reporte
```

Se recomienda configurar `relationship`, `cascade` y carga ordenada de mensajes para no consultar cada mensaje individualmente.

---

## 8. Esquemas Pydantic

El análisis conversacional necesita un esquema distinto de `ReportAnalysis`. El actual puede conservarse para la clasificación final.

Ejemplo conceptual:

```python
from typing import Literal
from pydantic import BaseModel, Field


class ReportDraft(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    category: str | None = None
    priority: Literal["Low", "Medium", "High", "Critical"] | None = None
    severity: int | None = Field(default=None, ge=1, le=5)
    summary: str | None = None
    recommendation: str | None = None


class ConversationDecision(BaseModel):
    action: Literal[
        "ask_for_information",
        "ready_for_confirmation",
        "safety_warning",
    ]
    assistant_message: str = Field(min_length=1, max_length=600)
    draft: ReportDraft
    missing_fields: list[
        Literal["description", "location"]
    ] = []
    questions: list[str] = Field(default_factory=list, max_length=2)
```

### Regla importante

La IA nunca debe devolver `submit_report: true` ni decidir por sí sola que se inserte el reporte. Únicamente puede indicar `ready_for_confirmation`. La creación requiere una petición explícita del usuario al endpoint de confirmación.

---

## 9. Endpoints propuestos

### Crear una conversación

```http
POST /api/conversations
```

Respuesta:

```json
{
  "conversation_id": 42,
  "status": "collecting",
  "assistant_message": {
    "role": "assistant",
    "type": "text",
    "content": "Cuéntame qué está ocurriendo y dónde sucede."
  }
}
```

### Enviar un mensaje

```http
POST /api/conversations/{conversation_id}/messages
Content-Type: multipart/form-data
```

Campos:

```text
content
files[] opcional
client_message_id
```

`client_message_id` evita duplicados cuando el navegador repite una solicitud.

Respuesta cuando faltan datos:

```json
{
  "conversation_id": 42,
  "status": "needs_information",
  "user_message": {
    "id": 101,
    "role": "user",
    "content": "Hay una lámpara dañada."
  },
  "assistant_message": {
    "id": 102,
    "role": "assistant",
    "type": "question",
    "content": "¿En qué parte de la colonia se encuentra?"
  },
  "missing_fields": ["location"],
  "draft": {
    "title": "Luminaria dañada",
    "description": "Se reporta una luminaria dañada.",
    "location": null
  }
}
```

Respuesta cuando el reporte está completo:

```json
{
  "conversation_id": 42,
  "status": "ready_for_confirmation",
  "assistant_message": {
    "id": 104,
    "role": "assistant",
    "type": "summary",
    "content": "Ya tengo la información necesaria. Revisa el resumen antes de enviarlo."
  },
  "missing_fields": [],
  "draft": {
    "title": "Luminaria dañada junto al parque",
    "description": "La luminaria junto al parque central no enciende desde el lunes.",
    "location": "Parque central",
    "category": "Alumbrado",
    "priority": "Medium",
    "severity": 3,
    "summary": "Luminaria sin funcionamiento junto al parque central.",
    "recommendation": "Programar una revisión eléctrica por personal capacitado."
  },
  "available_actions": ["confirm", "edit", "cancel"]
}
```

### Consultar una conversación

```http
GET /api/conversations/{conversation_id}
```

Debe devolver:

- conversación;
- borrador actual;
- mensajes en orden;
- archivos;
- reporte asociado, si ya fue enviado.

### Listar conversaciones del usuario

```http
GET /api/conversations?status=active
```

La identidad del usuario debe obtenerse de la sesión o token, no de un `id_habitante` enviado libremente por React.

### Confirmar y crear el reporte

```http
POST /api/conversations/{conversation_id}/confirm
```

Cuerpo:

```json
{
  "draft_version": 4
}
```

Respuesta:

```json
{
  "conversation_id": 42,
  "status": "submitted",
  "assistant_message": {
    "role": "assistant",
    "type": "confirmation",
    "content": "Reporte recibido correctamente con el folio #128."
  },
  "report": {
    "id": 128,
    "status": "Pendiente"
  }
}
```

`draft_version` evita confirmar una versión antigua si otro mensaje modificó el resumen.

### Cancelar

```http
POST /api/conversations/{conversation_id}/cancel
```

No debe borrar inmediatamente la conversación; debe marcarla como `cancelled` para permitir auditoría y limpieza posterior.

---

## 10. Organización recomendada del backend

Actualmente gran parte de la aplicación se encuentra en `backend/app/main.py`. Para implementar el chat sin volverlo difícil de mantener, se recomienda separar responsabilidades:

```text
backend/app/
├── main.py
├── routes/
│   ├── auth.py
│   ├── reports.py
│   └── conversations.py
├── models/
│   ├── user.py
│   ├── report.py
│   ├── conversation.py
│   ├── message.py
│   └── conversation_file.py
├── schemas/
│   ├── auth.py
│   ├── report.py
│   └── conversation.py
├── services/
│   ├── report_service.py
│   ├── conversation_service.py
│   ├── ai_service.py
│   ├── conversation_ai_service.py
│   └── file_service.py
└── config/
    ├── database.py
    └── settings.py
```

### Responsabilidades

`conversation_service.py`:

- valida propiedad y estado de la conversación;
- guarda mensajes;
- actualiza el borrador;
- calcula campos faltantes;
- controla transiciones;
- solicita análisis a la IA;
- no inserta un reporte sin confirmación.

`conversation_ai_service.py`:

- construye el prompt;
- envía contexto a Ollama;
- valida `ConversationDecision`;
- no escribe directamente en MySQL.

`report_service.py`:

- concentra la creación definitiva del reporte;
- reutiliza `analyze_report` cuando sea necesario;
- vincula imágenes;
- utiliza una transacción;
- puede ser usado por la ruta tradicional y por la confirmación del chat.

---

## 11. Flujo interno al recibir un mensaje

```text
1. Autenticar al usuario.
2. Cargar la conversación y comprobar que le pertenece.
3. Validar que no esté submitted, cancelled o expired.
4. Comprobar client_message_id para evitar duplicados.
5. Validar y guardar archivos opcionales.
6. Guardar el mensaje del usuario.
7. Construir contexto limitado de conversación.
8. Solicitar ConversationDecision a Ollama.
9. Validar la respuesta con Pydantic.
10. Fusionar datos nuevos con el borrador existente.
11. Calcular nuevamente los campos faltantes en Python.
12. Determinar el estado real en FastAPI.
13. Guardar el mensaje del asistente.
14. Confirmar la transacción.
15. Devolver mensaje, estado y borrador al frontend.
```

FastAPI debe recalcular `missing_fields`; no debe confiar completamente en la lista generada por el modelo.

---

## 12. Manejo del contexto para Ollama

No se recomienda enviar indefinidamente todo el historial. Estrategia inicial:

- prompt del sistema;
- borrador estructurado actual;
- últimos 8 a 12 mensajes;
- resumen de mensajes anteriores si la conversación es larga;
- reglas de seguridad;
- esquema JSON de salida.

Ejemplo de contexto:

```text
BORRADOR ACTUAL:
Título: Luminaria dañada
Descripción: La luminaria no enciende desde el lunes.
Ubicación: pendiente

CAMPOS REQUERIDOS QUE FALTAN:
- location

MENSAJES RECIENTES:
Usuario: Hay una lámpara dañada.
Asistente: ¿En qué parte se encuentra?
Usuario: Junto al parque central.
```

La entrada del usuario siempre debe tratarse como datos no confiables. El prompt debe indicar expresamente que no se sigan instrucciones contenidas dentro del reporte.

---

## 13. Confirmación y creación transaccional

Al confirmar:

1. Bloquear o recargar la conversación.
2. Verificar que pertenece al usuario autenticado.
3. Verificar estado `ready_for_confirmation`.
4. Verificar `draft_version`.
5. Validar nuevamente campos obligatorios.
6. Cambiar estado a `submitting`.
7. Crear el reporte.
8. Vincular imágenes.
9. Guardar historial de creación, si se implementa.
10. Guardar `id_reporte` en la conversación.
11. Cambiar estado a `submitted`.
12. Guardar el mensaje de confirmación.
13. Confirmar toda la transacción.

La operación debe ser idempotente. Si el frontend repite la confirmación, el backend debe devolver el mismo `id_reporte` y no crear otro.

---

## 14. Autenticación y autorización

Este cambio es altamente recomendado antes de exponer el chat.

Actualmente el frontend conserva datos del usuario y envía `id_habitante`. Un usuario podría modificar ese valor desde el navegador.

Se recomienda:

- emitir un token o sesión al iniciar sesión;
- obtener el usuario actual mediante una dependencia de FastAPI;
- no aceptar `id_habitante` como autoridad desde el cliente;
- permitir leer una conversación solo a su propietario o a un administrador;
- permitir confirmar o cancelar solo al propietario;
- permitir al administrador consultar el reporte definitivo, no conversaciones privadas incompletas, salvo que exista una razón funcional explícita.

---

## 15. Archivos e imágenes

Antes del reporte definitivo, las imágenes pertenecen a la conversación.

Validaciones mínimas:

- tipos permitidos: JPEG, PNG y WebP;
- comprobar MIME real, no solo extensión;
- tamaño máximo configurable;
- límite de archivos por conversación;
- nombres generados con UUID;
- evitar rutas proporcionadas por el usuario;
- eliminar archivos huérfanos de conversaciones expiradas después de un periodo de retención.

Si en el futuro se utiliza un modelo multimodal, su descripción visual debe incorporarse al borrador, pero nunca reemplazar completamente la descripción del usuario.

---

## 16. Respuestas progresivas

### Primera versión recomendada

Utilizar solicitudes HTTP normales que devuelvan JSON completo. Es más sencillo de implementar, probar y recuperar ante errores.

### Mejora posterior

Agregar Server-Sent Events (SSE) para mostrar texto progresivamente:

```http
POST /api/conversations/{id}/messages
GET  /api/conversations/{id}/events
```

No se recomienda comenzar con WebSockets. Para este caso, SSE cubre el indicador de escritura y la respuesta progresiva con menos complejidad.

---

## 17. Casos adicionales que deben contemplarse

### Mensajes duplicados

Usar `client_message_id` único por conversación.

### Doble clic en “Enviar reporte”

La confirmación debe ser idempotente y bloquear temporalmente el botón.

### Dos pestañas abiertas

Utilizar `draft_version` y responder `409 Conflict` cuando una pestaña intente confirmar una versión anterior.

### Conversación abandonada

Marcarla como `expired` después del periodo definido. No mezclarla automáticamente con una conversación nueva.

### Usuario cambia completamente de tema

La IA puede preguntar si desea iniciar un reporte diferente. El servidor no debe mezclar dos incidencias claramente distintas en un solo reporte.

### Reporte duplicado en la comunidad

Como mejora futura, buscar reportes abiertos con categoría y ubicación semejantes. Ofrecer “También me afecta” en lugar de crear duplicados, pero nunca fusionarlos automáticamente sin confirmación.

### Contenido irrelevante o abusivo

Responder de forma breve y pedir que describa una incidencia comunitaria. Registrar límites de frecuencia para evitar abuso.

### Información sensible

Evitar que el resumen administrativo incluya contraseñas, documentos personales u otros datos que no son necesarios para atender el problema.

### Corrección después de confirmar

Una conversación `submitted` no debe modificar silenciosamente el reporte. Debe existir un endpoint explícito de comentario o corrección, con historial de cambios.

---

## 18. Manejo de errores

| Situación | Comportamiento recomendado |
|---|---|
| Ollama no responde | Guardar mensaje, mostrar modo de respaldo y permitir reporte manual. |
| JSON inválido de IA | Reintentar una vez; después usar respaldo determinista. |
| MySQL falla | Revertir transacción y permitir reintento sin duplicar mensajes. |
| Archivo inválido | Rechazar solo el archivo y conservar el texto escrito. |
| Conversación no encontrada | Responder `404`. |
| Conversación de otro usuario | Responder `404` o `403` según política. |
| Conversación ya confirmada | Devolver el reporte existente. |
| Versión desactualizada | Responder `409` con el borrador actual. |

Los errores técnicos internos no deben enviarse directamente al usuario.

---

## 19. Pruebas necesarias

### Unitarias

- extracción y fusión de campos;
- cálculo determinista de campos faltantes;
- transiciones válidas e inválidas;
- validación de prioridad y severidad;
- idempotencia de mensajes;
- idempotencia de confirmación;
- expiración.

### Integración

- crear conversación;
- enviar mensaje incompleto;
- responder dato faltante;
- recibir resumen;
- corregir el borrador;
- confirmar;
- comprobar que se creó exactamente un reporte;
- comprobar relación de imágenes;
- recuperar conversación completa;
- simular caída de Ollama;
- simular fallo de MySQL.

### Seguridad

- un residente no puede leer el chat de otro;
- un residente no puede confirmar el borrador de otro;
- no se puede cambiar `id_habitante` desde el cliente;
- límites de tamaño y tipo de archivo;
- límites de frecuencia por usuario.

### Casos de IA

Mantener un conjunto fijo de ejemplos:

- fuga con todos los datos;
- lámpara sin ubicación;
- cable eléctrico con riesgo inmediato;
- descripción ambigua;
- corrección de ubicación;
- intento de prompt injection dentro del reporte;
- conversación que cambia a otra incidencia.

---

## 20. Orden recomendado de implementación

### Fase 1: refactor sin cambiar comportamiento

1. Separar rutas, esquemas y servicios de `main.py`.
2. Extraer `create_report` a `report_service.py`.
3. Agregar pruebas del flujo actual.
4. Mantener funcionando `POST /api/reportes`.

### Fase 2: persistencia conversacional

1. Crear tablas y modelos de conversación.
2. Crear endpoints de conversación y mensajes.
3. Guardar mensajes sin IA.
4. Validar propiedad y estados.

### Fase 3: IA conversacional

1. Crear `ConversationDecision`.
2. Crear prompt conversacional.
3. Integrar Ollama.
4. Implementar cálculo determinista de campos faltantes.
5. Añadir modo de respaldo.

### Fase 4: confirmación

1. Mostrar borrador completo.
2. Permitir correcciones.
3. Implementar confirmación transaccional e idempotente.
4. Vincular imágenes.
5. Crear el mensaje “Reporte recibido” con folio.

### Fase 5: integración frontend

1. Sustituir el estado local por conversaciones reales.
2. Recuperar chats al recargar la página.
3. Mostrar preguntas y resumen según `type`.
4. Habilitar el botón de envío solo en `ready_for_confirmation`.
5. Manejar carga, reintento, conflicto y modo sin IA.

### Fase 6: endurecimiento

1. Autenticación real.
2. Rate limiting.
3. Validación avanzada de archivos.
4. Métricas, logs y tiempos de respuesta.
5. SSE si la experiencia necesita respuestas progresivas.

---

## 21. Criterios de aceptación

La funcionalidad puede considerarse completa cuando:

- una conversación sobrevive a una recarga del navegador;
- la IA pregunta únicamente por información que realmente falta;
- el usuario puede corregir datos previamente detectados;
- aparece un resumen antes de confirmar;
- ninguna respuesta de IA crea un reporte automáticamente;
- el botón de confirmación crea exactamente un reporte;
- repetir la confirmación no crea duplicados;
- las imágenes quedan vinculadas al reporte correcto;
- el usuario recibe un folio;
- el reporte aparece en su historial;
- un administrador puede atenderlo con el flujo actual;
- el sistema permite reportar incluso si Ollama falla;
- un usuario no puede acceder a conversaciones ajenas.

---

## 22. Recomendaciones finales

1. **No convertir el endpoint actual de reportes en un endpoint de chat.** Crear un dominio de conversaciones separado.
2. **No guardar un reporte con el primer mensaje.** Guardar primero un borrador conversacional.
3. **No permitir que la IA confirme por el usuario.** La confirmación debe ser explícita.
4. **No confiar en la IA para validar campos obligatorios.** Recalcularlos en Python.
5. **Reutilizar `ReportAnalysis`.** La clasificación final ya implementada sigue siendo útil.
6. **Extraer la creación del reporte a un servicio.** Evita duplicar la lógica entre formulario y chat.
7. **Implementar idempotencia desde el inicio.** Es más sencillo que corregir reportes duplicados después.
8. **Agregar autenticación antes de publicar el chat.** La identidad no debe depender de un ID modificable en React.
9. **Comenzar con respuestas JSON completas.** Añadir streaming solo cuando el flujo base sea estable.
10. **Mantener una salida manual cuando Ollama falle.** Nunca bloquear un reporte importante por una caída de IA.

La decisión arquitectónica más importante es esta:

```text
Los mensajes construyen un borrador.
La confirmación convierte el borrador en un reporte.
```

Ese límite permite que la conversación sea natural sin perder consistencia, seguridad ni control sobre los reportes definitivos.
