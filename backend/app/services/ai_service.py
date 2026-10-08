from ollama import chat

MODEL_NAME = "llama3.2:3b"

def test_ai_connection() -> str:
    response = chat(
        model=MODEL_NAME,
        messages=[
            {
                "role": "system",
                "content": (
                    "Eres el modulo de inteligencia artificial "
                    "de un sistema de resportes viales."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Responde unicamente con la palabra funcionando."
                ),
            },
        ],
    )

    return response.message.content

def analyze_report(
    title: str,
    description: str,
    location: str | None = None,
) -> str:
    system_prompt = """
Eres un sistema de inteligencia artificial encargado de analizar
reportes de problemas dentro de colonias y condominios.

Tu objetivo es clasificar cada reporte de manera consistente según
el riesgo real, el impacto y la urgencia del problema.

CATEGORÍAS PERMITIDAS:

- Agua
- Alumbrado
- Basura
- Vialidad
- Áreas comunes
- Seguridad
- Ruido
- Mantenimiento
- Otros

REGLAS PARA ELEGIR CATEGORÍA:

- Si existe riesgo directo para la integridad de las personas,
  la categoría Seguridad tiene prioridad sobre las demás categorías.

- Un cable eléctrico caído, chispas, incendio, riesgo de electrocución
  o situaciones similares deben clasificarse como Seguridad.

- Vialidad se utiliza para problemas relacionados principalmente con
  calles, circulación, baches, bloqueos o infraestructura vial.

- Áreas comunes se utiliza para problemas relacionados con parques,
  bancas, jardines y espacios compartidos.

- Mantenimiento puede utilizarse para reparaciones menores o desgaste
  que no represente un riesgo importante.

PRIORIDADES PERMITIDAS:

Low:
Problemas menores, estéticos o de mantenimiento que no representan
un riesgo y no afectan considerablemente el funcionamiento del lugar.

Medium:
Problemas que afectan el funcionamiento, comodidad o seguridad de
manera moderada, pero que no representan un peligro inmediato.

High:
Problemas importantes que requieren atención pronta, provocan una
afectación considerable o podrían empeorar si no se atienden.

Critical:
Problemas que representan un riesgo grave o inmediato para personas,
propiedades o infraestructura.

SEVERIDAD:

1 = problema mínimo o únicamente estético
2 = problema menor
3 = problema moderado
4 = problema importante
5 = riesgo grave o inmediato

DEBES MANTENER CONSISTENCIA ENTRE SEVERIDAD Y PRIORIDAD:

Severidad 1 o 2 → Low
Severidad 3 → Medium
Severidad 4 → High
Severidad 5 → Critical

EJEMPLOS DE REFERENCIA:

Cable eléctrico caído y produciendo chispas:
Categoría: Seguridad
Prioridad: Critical
Severidad: 5

Banca con pintura desgastada:
Categoría: Áreas comunes
Prioridad: Low
Severidad: 1

Luminaria apagada en un acceso principal:
Categoría: Alumbrado
Prioridad: Medium
Severidad: 3

Debes determinar:

1. Categoría
2. Prioridad
3. Severidad
4. Resumen breve
5. Recomendación

No inventes información que no aparezca en el reporte.
Evalúa primero el riesgo para las personas antes que la ubicación
física donde ocurre el problema.
"""

    user_prompt = f"""
TÍTULO:
{title}

DESCRIPCIÓN:
{description}

UBICACIÓN:
{location or "No proporcionada"}

Analiza este reporte.
"""

    response = chat(
        model=MODEL_NAME,
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        options={
            "temperature": 0.1
        },
    )

    return response.message.content