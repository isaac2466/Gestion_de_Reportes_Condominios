from app.schemas.conversation_ai import ReportDraft
from app.services.form_catalog import build_form_fields
from app.models.report import PrioridadEnum

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.services.ai_service import (
    analyze_report,
    validate_report,
)

from app.models.message import (
    MensajeConversacion,
    MessageRole,
    MessageType,
)

from app.models.conversation import (
    ConversacionReporte,
    ConversationStatus,
)

from app.services.conversation_ai_service import analyze_conversation

REQUIRED_DRAFT_FIELDS = (
    "description",
    "location",
)


def merge_draft(
    current_draft: ReportDraft | dict,
    extraction: dict,
) -> ReportDraft:

    draft = ReportDraft.model_validate(current_draft)

    data = draft.model_dump()

    # Solo reemplazamos campos principales si la IA realmente
    # encontró información nueva o una corrección.
    for field in (
        "title",
        "description",
        "location",
    ):
        new_value = extraction.get(field)

        if new_value is not None:
            data[field] = new_value

    # Fusionar contexto sin destruir lo que ya conocíamos.
    current_context = dict(
        data.get("context") or {}
    )

    context_updates = extraction.get("context") or {}

    for key, value in context_updates.items():
        if value is not None:
            current_context[key] = value

    data["context"] = current_context

    return ReportDraft.model_validate(data)


def calculate_missing_fields(
    draft: ReportDraft | dict,
) -> list[str]:

    draft = ReportDraft.model_validate(draft)

    missing_fields = []

    if not draft.description:
        missing_fields.append("description")

    if not draft.location:
        missing_fields.append("location")

    return missing_fields


SAFETY_WARNING_MESSAGE = (
    "La situación descrita puede representar un riesgo. "
    "Mantente alejado del área peligrosa y evita manipular "
    "directamente el objeto o instalación afectada."
)


def build_next_interaction(
    draft: ReportDraft | dict,
    safety_risk: bool = False,
) -> dict | None:

    draft = ReportDraft.model_validate(draft)

    missing_fields = calculate_missing_fields(draft)

    requested_fields = [
        field
        for field in missing_fields
        if field in {
            "description",
            "location",
        }
    ][:2]

    # Las situaciones potencialmente peligrosas tienen prioridad.
    if safety_risk:
        return {
            "action": "safety_warning",
            "message_type": "warning",
            "assistant_message": SAFETY_WARNING_MESSAGE,
            "requested_fields": requested_fields,
            "metadata": {
                "fields": build_form_fields(requested_fields)
                if requested_fields
                else []
            },
        }

    # Si todavía faltan datos obligatorios, mostramos formulario.
    if requested_fields:
        return {
            "action": "request_fields",
            "message_type": "form",
            "assistant_message": (
                "Necesito un poco más de información "
                "para completar el reporte."
            ),
            "requested_fields": requested_fields,
            "metadata": {
                "fields": build_form_fields(requested_fields)
            },
        }

    # None significa:
    # el borrador ya tiene los datos mínimos y puede pasar
    # al análisis final con analyze_report().
    return None


def complete_draft_analysis(
    draft: ReportDraft | dict,
) -> tuple[ReportDraft, bool]:

    draft = ReportDraft.model_validate(draft)

    missing_fields = calculate_missing_fields(draft)

    if missing_fields:
        raise ValueError(
            "No se puede analizar un borrador incompleto. "
            f"Campos faltantes: {missing_fields}"
        )

    # analyze_report necesita título.
    # Si el extractor no logró producir uno, utilizamos uno
    # temporal para realizar el análisis.
    title_for_analysis = (
        draft.title
        or "Reporte vecinal"
    )

    analysis = analyze_report(
        title_for_analysis,
        draft.description,
        draft.location,
    )

    data = draft.model_dump()

    # La IA de análisis no debe ser requisito absoluto.
    # Si Ollama falla, conservamos el borrador.
    if analysis is None:
        if not data["title"]:
            data["title"] = "Reporte vecinal"

        return (
            ReportDraft.model_validate(data),
            False,
        )

    # Por seguridad, soportamos tanto dict como modelo Pydantic.
    if hasattr(analysis, "model_dump"):
        analysis = analysis.model_dump()

    data["category"] = analysis.get("category")
    data["priority"] = analysis.get("priority")
    data["severity"] = analysis.get("severity")
    data["summary"] = analysis.get("summary")
    data["recommendation"] = analysis.get("recommendation")

    # Si el extractor conversacional no produjo título,
    # generamos uno sencillo a partir de la categoría.
    if not data["title"]:
        category = analysis.get("category")

        if category:
            data["title"] = f"Reporte de {category}"
        else:
            data["title"] = "Reporte vecinal"

    return (
        ReportDraft.model_validate(data),
        True,
    )


def build_summary_interaction(
    draft: ReportDraft | dict,
    analysis_available: bool,
    draft_version: int = 1,
) -> dict:

    draft = ReportDraft.model_validate(draft)

    missing_fields = calculate_missing_fields(draft)

    if missing_fields:
        raise ValueError(
            "No se puede generar un resumen de un borrador incompleto. "
            f"Campos faltantes: {missing_fields}"
        )

    return {
        "action": "ready_for_confirmation",
        "message_type": "summary",
        "assistant_message": (
            "El reporte está listo para revisión. "
            "Verifica la información antes de enviarlo."
        ),
        "metadata": {
            "draft": draft.model_dump(),
            "analysis_available": analysis_available,
            "draft_version": draft_version,
            "actions": [
                {
                    "key": "confirm",
                    "label": "Enviar reporte",
                },
                {
                    "key": "edit",
                    "label": "Corregir información",
                },
                {
                    "key": "cancel",
                    "label": "Cancelar",
                },
            ],
        },
    }


def draft_from_conversation(
    conversation: ConversacionReporte,
) -> ReportDraft:

    priority = conversation.prioridad_borrador

    if priority is not None:
        if hasattr(priority, "value"):
            priority = priority.value

    return ReportDraft(
        title=conversation.titulo_borrador,
        description=conversation.descripcion_borrador,
        location=conversation.locacion_borrador,
        category=conversation.categoria_borrador,
        priority=priority,
        severity=conversation.severidad_borrador,
        summary=conversation.resumen_borrador,
        recommendation=conversation.recomendacion_borrador,
        context=conversation.datos_contexto or {},
    )


def save_draft_to_conversation(
    conversation: ConversacionReporte,
    draft: ReportDraft | dict,
    missing_fields: list[str] | None = None,
    increment_version: bool = True,
) -> ReportDraft:

    draft = ReportDraft.model_validate(draft)

    conversation.titulo_borrador = draft.title
    conversation.descripcion_borrador = draft.description
    conversation.locacion_borrador = draft.location
    conversation.categoria_borrador = draft.category

    if draft.priority is not None:
        conversation.prioridad_borrador = PrioridadEnum(
            draft.priority
        )
    else:
        conversation.prioridad_borrador = None

    conversation.severidad_borrador = draft.severity
    conversation.resumen_borrador = draft.summary
    conversation.recomendacion_borrador = draft.recommendation

    conversation.campos_faltantes = (
        missing_fields
        if missing_fields is not None
        else calculate_missing_fields(draft)
    )

    conversation.datos_contexto = draft.context

    if increment_version:
        conversation.version_borrador = (
            conversation.version_borrador or 1
        ) + 1

    return draft


def clear_analysis_fields(
    draft: ReportDraft | dict,
) -> ReportDraft:

    draft = ReportDraft.model_validate(draft)

    data = draft.model_dump()

    data["category"] = None
    data["priority"] = None
    data["severity"] = None
    data["summary"] = None
    data["recommendation"] = None

    return ReportDraft.model_validate(data)


def get_recent_messages(
    db: Session,
    conversation_id: int,
    limit: int = 8,
    exclude_message_id: int | None = None,
) -> list[dict]:

    query = (
        db.query(MensajeConversacion)
        .filter(
            MensajeConversacion.id_conversacion
            == conversation_id
        )
    )

    if exclude_message_id is not None:
        query = query.filter(
            MensajeConversacion.id != exclude_message_id
        )

    messages = (
        query
        .order_by(MensajeConversacion.id.desc())
        .limit(limit)
        .all()
    )

    messages.reverse()

    result = []

    for message in messages:
        role = message.rol

        if hasattr(role, "value"):
            role = role.value

        result.append(
            {
                "role": role,
                "content": message.contenido,
            }
        )

    return result


def create_assistant_message(
    db: Session,
    conversation: ConversacionReporte,
    message_type: str,
    content: str,
    metadata: dict | None = None,
) -> MensajeConversacion:

    message = MensajeConversacion(
        id_conversacion=conversation.id,
        rol=MessageRole.assistant,
        tipo=MessageType(message_type),
        contenido=content,
        metadatos=metadata,
    )

    db.add(message)

    return message


def process_conversation_message(
    db: Session,
    conversation: ConversacionReporte,
    user_message: str,
    exclude_message_id: int | None = None,
    form_data: dict | None = None,
) -> dict:

    try:
        # 1. Recuperar el borrador actual.
        current_draft = draft_from_conversation(
            conversation
        )

        # 2. Recuperar contexto reciente.
        recent_messages = get_recent_messages(
            db,
            conversation.id,
            exclude_message_id=exclude_message_id,
        )

        # ==================================================
        # DATOS ESTRUCTURADOS DE UN FORMULARIO
        # ==================================================

        if form_data:
            extraction = extraction_from_form_data(
                form_data
            )

            extraction_available = False

        else:
            extraction = None
            extraction_available = False

        # ==================================================
        # VALIDACIÓN SEMÁNTICA DEL INICIO DEL REPORTE
        # ==================================================

        if (
            not form_data
            and not current_draft.description
        ):

            semantic_validation = validate_report(
                "Reporte vecinal",
                user_message,
                None,
            )

            if (
                semantic_validation is not None
                and semantic_validation["decision"] != "valid"
            ):
                interaction = build_semantic_validation_interaction(
                    semantic_validation
                )

                # No modificamos el borrador.
                missing_fields = calculate_missing_fields(
                    current_draft
                )

                conversation.estado = (
                    ConversationStatus.collecting
                )

                conversation.fecha_actualizacion = func.now()

                metadata = dict(
                    interaction["metadata"]
                )

                metadata["action"] = interaction[
                    "action"
                ]

                metadata["draft_version"] = (
                    conversation.version_borrador
                )

                assistant_message = create_assistant_message(
                    db=db,
                    conversation=conversation,
                    message_type=interaction[
                        "message_type"
                    ],
                    content=interaction[
                        "assistant_message"
                    ],
                    metadata=metadata,
                )

                db.commit()

                db.refresh(assistant_message)
                db.refresh(conversation)

                return {
                    "status": conversation.estado.value,
                    "draft": current_draft.model_dump(),
                    "missing_fields": missing_fields,
                    "analysis_available": False,
                    "assistant_messages": [
                        {
                            "id": assistant_message.id,
                            "type": assistant_message.tipo.value,
                            "content": assistant_message.contenido,
                            "metadata": assistant_message.metadatos,
                        }
                    ],
                }       

        # 3. Intentar extraer información con Llama.
        if not form_data:
            extraction = analyze_conversation(
                current_draft,
                recent_messages,
                user_message,
            )

            extraction_available = (
                extraction is not None
            )

        safety_risk = False

        if extraction is not None:
            safety_risk = bool(
                extraction.get(
                    "safety_risk",
                    False,
                )
            )

            updated_draft = merge_draft(
                current_draft,
                extraction,
            )

        else:
            # Si Ollama falla no destruimos el borrador.
            updated_draft = current_draft

        # 4. Detectar si realmente cambió información.
        draft_changed = (
            updated_draft.model_dump()
            != current_draft.model_dump()
        )

        # Si cambió información proporcionada por el usuario,
        # cualquier análisis anterior queda obsoleto.
        if draft_changed:
            updated_draft = clear_analysis_fields(
                updated_draft
            )

        # 5. Determinar qué información obligatoria falta.
        missing_fields = calculate_missing_fields(
            updated_draft
        )

        assistant_messages = []

        # ==================================================
        # TODAVÍA FALTAN DATOS
        # ==================================================

        if missing_fields:
            interaction = build_next_interaction(
                updated_draft,
                safety_risk=safety_risk,
            )

            save_draft_to_conversation(
                conversation,
                updated_draft,
                missing_fields,
                increment_version=draft_changed,
            )

            conversation.estado = (
                ConversationStatus.needs_information
            )

            conversation.fecha_actualizacion = func.now()

            metadata = dict(
                interaction.get("metadata") or {}
            )

            metadata["action"] = interaction["action"]
            metadata["requested_fields"] = (
                interaction.get(
                    "requested_fields",
                    [],
                )
            )

            metadata["draft_version"] = (
                conversation.version_borrador
            )

            metadata["ai_extraction_available"] = (
                extraction_available
            )

            assistant_message = create_assistant_message(
                db=db,
                conversation=conversation,
                message_type=interaction[
                    "message_type"
                ],
                content=interaction[
                    "assistant_message"
                ],
                metadata=metadata,
            )

            assistant_messages.append(
                assistant_message
            )

            db.commit()

            for message in assistant_messages:
                db.refresh(message)

            db.refresh(conversation)

            return {
                "status": conversation.estado.value,
                "draft": updated_draft.model_dump(),
                "missing_fields": missing_fields,
                "analysis_available": False,
                "assistant_messages": [
                    {
                        "id": message.id,
                        "type": message.tipo.value,
                        "content": message.contenido,
                        "metadata": message.metadatos,
                    }
                    for message in assistant_messages
                ],
            }

        # ==================================================
        # BORRADOR COMPLETO
        # ==================================================

        final_draft, analysis_available = (
            complete_draft_analysis(
                updated_draft
            )
        )

        save_draft_to_conversation(
            conversation,
            final_draft,
            [],
            increment_version=draft_changed,
        )

        conversation.estado = (
            ConversationStatus.ready_for_confirmation
        )

        conversation.fecha_actualizacion = func.now()

        # Si había un riesgo, primero persistimos
        # una advertencia independiente.
        if safety_risk:
            warning = build_next_interaction(
                final_draft,
                safety_risk=True,
            )

            warning_metadata = dict(
                warning.get("metadata") or {}
            )

            warning_metadata["action"] = (
                warning["action"]
            )

            warning_metadata["draft_version"] = (
                conversation.version_borrador
            )

            warning_message = create_assistant_message(
                db=db,
                conversation=conversation,
                message_type=warning[
                    "message_type"
                ],
                content=warning[
                    "assistant_message"
                ],
                metadata=warning_metadata,
            )

            assistant_messages.append(
                warning_message
            )

        # 6. Crear tarjeta/resumen para confirmación.
        summary = build_summary_interaction(
            final_draft,
            analysis_available,
            conversation.version_borrador,
        )

        summary_message = create_assistant_message(
            db=db,
            conversation=conversation,
            message_type=summary[
                "message_type"
            ],
            content=summary[
                "assistant_message"
            ],
            metadata=summary["metadata"],
        )

        assistant_messages.append(
            summary_message
        )

        db.commit()

        for message in assistant_messages:
            db.refresh(message)

        db.refresh(conversation)

        return {
            "status": conversation.estado.value,
            "draft": final_draft.model_dump(),
            "missing_fields": [],
            "analysis_available": analysis_available,
            "assistant_messages": [
                {
                    "id": message.id,
                    "type": message.tipo.value,
                    "content": message.contenido,
                    "metadata": message.metadatos,
                }
                for message in assistant_messages
            ],
        }

    except Exception:
        db.rollback()
        raise


def build_semantic_validation_interaction(
    validation: dict,
) -> dict:

    decision = validation.get(
        "decision",
        "not_reportable",
    )

    message = validation.get(
        "user_message"
    )

    if not message:
        if decision == "needs_information":
            message = (
                "Necesito que describas con un poco más de detalle "
                "el problema que deseas reportar."
            )
        else:
            message = (
                "Cuéntame un problema de la colonia o condominio "
                "que quieras reportar."
            )

    return {
        "action": decision,
        "message_type": "question",
        "assistant_message": message,
        "metadata": {
            "validation_status": decision,
            "reason": validation.get("reason"),
        },
    }


CONTEXT_FORM_FIELDS = {
    "since_when",
    "risk_active",
    "affects_passage",
    "frequency",
    "time_window",
    "approximate_size",
    "affected_area",
    "additional_details",
}


def extraction_from_form_data(
    form_data: dict,
) -> dict:

    context = {}

    for key in CONTEXT_FORM_FIELDS:
        value = form_data.get(key)

        if value is not None:
            context[key] = value

    return {
        "title": None,
        "description": form_data.get("description"),
        "location": form_data.get("location"),
        "context": context,
        "safety_risk": False,
    }