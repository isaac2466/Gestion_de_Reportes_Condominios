from typing import Any

from app.schemas.conversation_ai import AllowedFieldKey


FORM_FIELD_CATALOG: dict[AllowedFieldKey, dict[str, Any]] = {
    "location": {
        "type": "text",
        "label": "¿Dónde ocurre el problema?",
        "placeholder": "Ej. Parque central, entrada norte...",
    },

    "since_when": {
        "type": "text",
        "label": "¿Desde cuándo ocurre?",
        "placeholder": "Ej. Desde ayer, hace dos horas...",
    },

    "risk_active": {
        "type": "choice",
        "label": "¿El riesgo continúa actualmente?",
        "options": [
            "Sí",
            "No",
            "No estoy seguro",
        ],
    },

    "affects_passage": {
        "type": "choice",
        "label": "¿El problema está afectando el paso?",
        "options": [
            "Sí",
            "No",
            "Parcialmente",
        ],
    },

    "frequency": {
        "type": "choice",
        "label": "¿Con qué frecuencia ocurre?",
        "options": [
            "Una sola vez",
            "Ocasionalmente",
            "Frecuentemente",
            "Constantemente",
        ],
    },

    "time_window": {
        "type": "text",
        "label": "¿En qué horario suele ocurrir?",
        "placeholder": "Ej. Por las noches, entre 10 PM y 1 AM...",
    },

    "approximate_size": {
        "type": "choice",
        "label": "¿Qué tan grande es aproximadamente?",
        "options": [
            "Pequeño",
            "Mediano",
            "Grande",
            "No estoy seguro",
        ],
    },

    "affected_area": {
        "type": "text",
        "label": "¿Qué área o zona está siendo afectada?",
        "placeholder": "Ej. Banqueta, calle, jardín, estacionamiento...",
    },

    "additional_details": {
        "type": "textarea",
        "label": "¿Hay algún detalle adicional que debamos conocer?",
        "placeholder": "Agrega cualquier información relevante...",
    },

    "description": {
        "type": "textarea",
        "label": "¿Qué problema está ocurriendo?",
        "placeholder": "Describe brevemente qué está pasando...",
    },
}

def build_form_fields(
    requested_fields: list[AllowedFieldKey],
) -> list[dict[str, Any]]:

    fields = []

    for field_key in requested_fields:
        config = FORM_FIELD_CATALOG[field_key]

        fields.append(
            {
                "key": field_key,
                **config,
            }
        )

    return fields