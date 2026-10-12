from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.config.database import get_db
from app.models.user import Habitante
from app.models.conversation import (
    ConversacionReporte,
    ConversationStatus,
)
from app.models.message import (
    MensajeConversacion,
    MessageRole,
    MessageType,
)
from app.schemas.conversation import (
    ConversationCreate,
    ConversationCreatedResponse,
    ConversationMessageCreate,
    MessageResponse,
    DraftResponse,
    ConversationResponse,
    ConversationListItem,
    ConversationCancelledResponse,
    ConversationTurnResponse,
)

from app.services.conversation_service import (
    process_conversation_message,
)


router = APIRouter(
    prefix="/api/conversations",
    tags=["Conversations"],
)


def get_turn_assistant_messages(
    db: Session,
    user_message: MensajeConversacion,
) -> list[MensajeConversacion]:

    next_user_message = (
        db.query(MensajeConversacion)
        .filter(
            MensajeConversacion.id_conversacion
            == user_message.id_conversacion,
            MensajeConversacion.rol
            == MessageRole.user,
            MensajeConversacion.id
            > user_message.id,
        )
        .order_by(MensajeConversacion.id.asc())
        .first()
    )

    query = (
        db.query(MensajeConversacion)
        .filter(
            MensajeConversacion.id_conversacion
            == user_message.id_conversacion,
            MensajeConversacion.rol
            == MessageRole.assistant,
            MensajeConversacion.id
            > user_message.id,
        )
    )

    if next_user_message:
        query = query.filter(
            MensajeConversacion.id
            < next_user_message.id
        )

    return (
        query
        .order_by(MensajeConversacion.id.asc())
        .all()
    )


def message_to_response(
    message: MensajeConversacion,
) -> MessageResponse:
    return MessageResponse(
        id=message.id,
        id_conversacion=message.id_conversacion,
        role=message.rol,
        type=message.tipo,
        content=message.contenido,
        metadata=message.metadatos,
        client_message_id=message.client_message_id,
        created_at=message.fecha_creacion,
    )


def conversation_to_response(
    conversation: ConversacionReporte,
) -> ConversationResponse:

    draft = DraftResponse(
        title=conversation.titulo_borrador,
        description=conversation.descripcion_borrador,
        location=conversation.locacion_borrador,
        category=conversation.categoria_borrador,
        priority=conversation.prioridad_borrador,
        severity=conversation.severidad_borrador,
        summary=conversation.resumen_borrador,
        recommendation=conversation.recomendacion_borrador,
        context=conversation.datos_contexto or {},
        missing_fields=conversation.campos_faltantes or [],
        version=conversation.version_borrador,
    )

    messages = [
        message_to_response(message)
        for message in conversation.mensajes
    ]

    return ConversationResponse(
        conversation_id=conversation.id,
        resident_id=conversation.id_habitante,
        report_id=conversation.id_reporte,
        status=conversation.estado,
        draft=draft,
        messages=messages,
        created_at=conversation.fecha_creacion,
        updated_at=conversation.fecha_actualizacion,
    )


@router.get(
    "",
    response_model=list[ConversationListItem],
)
def list_conversations(
    id_habitante: int,
    db: Session = Depends(get_db),
):
    habitante = (
        db.query(Habitante)
        .filter(
            Habitante.id_habitante == id_habitante
        )
        .first()
    )

    if not habitante:
        raise HTTPException(
            status_code=404,
            detail="El habitante especificado no existe.",
        )

    conversations = (
        db.query(ConversacionReporte)
        .filter(
            ConversacionReporte.id_habitante == id_habitante
        )
        .order_by(
            ConversacionReporte.fecha_actualizacion.desc()
        )
        .all()
    )

    result = []

    for conversation in conversations:
        last_message = (
            db.query(MensajeConversacion)
            .filter(
                MensajeConversacion.id_conversacion
                == conversation.id
            )
            .order_by(
                MensajeConversacion.id.desc()
            )
            .first()
        )

        result.append(
            ConversationListItem(
                conversation_id=conversation.id,
                status=conversation.estado,
                report_id=conversation.id_reporte,
                title=conversation.titulo_borrador,
                last_message=(
                    last_message.contenido
                    if last_message
                    else None
                ),
                updated_at=conversation.fecha_actualizacion,
            )
        )

    return result


@router.get(
    "/{conversation_id}",
    response_model=ConversationResponse,
)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    conversation = (
        db.query(ConversacionReporte)
        .filter(
            ConversacionReporte.id == conversation_id
        )
        .first()
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversación no encontrada.",
        )

    return conversation_to_response(conversation)


@router.post(
    "",
    response_model=ConversationCreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(
    data: ConversationCreate,
    db: Session = Depends(get_db),
):
    habitante = (
        db.query(Habitante)
        .filter(
            Habitante.id_habitante == data.id_habitante
        )
        .first()
    )

    if not habitante:
        raise HTTPException(
            status_code=404,
            detail="El habitante especificado no existe.",
        )

    try:
        conversation = ConversacionReporte(
            id_habitante=data.id_habitante,
            estado=ConversationStatus.collecting,
            campos_faltantes=[],
            version_borrador=1,
        )

        db.add(conversation)

        db.flush()

        initial_message = MensajeConversacion(
            id_conversacion=conversation.id,
            rol=MessageRole.assistant,
            tipo=MessageType.text,
            contenido="Cuéntame qué problema deseas reportar.",
        )

        db.add(initial_message)

        db.commit()

        db.refresh(conversation)
        db.refresh(initial_message)

    except Exception:
        db.rollback()
        raise

    return ConversationCreatedResponse(
        conversation_id=conversation.id,
        status=conversation.estado,
        assistant_message=message_to_response(
            initial_message
        ),
    )


@router.post(
    "/{conversation_id}/messages",
    response_model=ConversationTurnResponse,
    status_code=201,
)
def create_conversation_message(
    conversation_id: int,
    data: ConversationMessageCreate,
    response: Response,
    db: Session = Depends(get_db),
):
    conversation = (
        db.query(ConversacionReporte)
        .filter(
            ConversacionReporte.id
            == conversation_id
        )
        .first()
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversación no encontrada.",
        )

    if conversation.estado in {
        ConversationStatus.submitted,
        ConversationStatus.cancelled,
    }:
        raise HTTPException(
            status_code=409,
            detail=(
                "La conversación ya no acepta nuevos mensajes."
            ),
        )

    # --------------------------------------------
    # IDEMPOTENCIA
    # --------------------------------------------

    if data.client_message_id:
        existing = (
            db.query(MensajeConversacion)
            .filter(
                MensajeConversacion.id_conversacion
                == conversation_id,
                MensajeConversacion.client_message_id
                == data.client_message_id,
            )
            .first()
        )

        if existing:
            existing_form_data = (
                (existing.metadatos or {}).get("form_data")
            )

            incoming_form_data = (
                data.form_data.model_dump(exclude_none=True)
                if data.form_data
                else None
            )

            if (
                existing.contenido != data.content
                or existing_form_data != incoming_form_data
            ):
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "El client_message_id ya fue utilizado "
                        "con un contenido diferente."
                    ),
                )

            response.status_code = 200

            assistant_messages = get_turn_assistant_messages(
                db,
                existing,
            )

            snapshot = conversation_to_response(
                conversation
            )

            return ConversationTurnResponse(
                conversation_id=conversation.id,
                status=conversation.estado,
                draft=snapshot.draft,
                missing_fields=(
                    conversation.campos_faltantes or []
                ),
                analysis_available=(
                    any(
                        (
                            message.metadatos or {}
                        ).get("analysis_available") is True
                        for message in assistant_messages
                    )
                ),
                user_message=message_to_response(
                    existing
                ),
                assistant_messages=[
                    message_to_response(message)
                    for message in assistant_messages
                ],
            )

    # --------------------------------------------
    # GUARDAR MENSAJE DEL USUARIO
    # --------------------------------------------

    form_data = (
        data.form_data.model_dump(
            exclude_none=True
        )
        if data.form_data
        else None
    )

    user_message = MensajeConversacion(
        id_conversacion=conversation.id,
        rol=MessageRole.user,
        tipo=MessageType.text,
        contenido=data.content,
        metadatos=(
            {"form_data": form_data}
            if form_data
            else None
        ),
        client_message_id=data.client_message_id,
    )

    db.add(user_message)

    # IMPORTANTE:
    # flush obtiene el ID pero todavía NO confirma
    # la transacción.
    db.flush()

    # --------------------------------------------
    # ORQUESTADOR
    # --------------------------------------------

    result = process_conversation_message(
        db=db,
        conversation=conversation,
        user_message=data.content,
        exclude_message_id=user_message.id,
        form_data=form_data,
    )

    db.refresh(user_message)
    db.refresh(conversation)

    assistant_ids = [
        message["id"]
        for message in result["assistant_messages"]
    ]

    assistant_objects = []

    if assistant_ids:
        assistant_objects = (
            db.query(MensajeConversacion)
            .filter(
                MensajeConversacion.id.in_(
                    assistant_ids
                )
            )
            .order_by(
                MensajeConversacion.id.asc()
            )
            .all()
        )

    snapshot = conversation_to_response(
        conversation
    )

    return ConversationTurnResponse(
        conversation_id=conversation.id,
        status=conversation.estado,
        draft=snapshot.draft,
        missing_fields=result[
            "missing_fields"
        ],
        analysis_available=result[
            "analysis_available"
        ],
        user_message=message_to_response(
            user_message
        ),
        assistant_messages=[
            message_to_response(message)
            for message in assistant_objects
        ],
    )


@router.post(
    "/{conversation_id}/cancel",
    response_model=ConversationCancelledResponse,
)
def cancel_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    conversation = (
        db.query(ConversacionReporte)
        .filter(
            ConversacionReporte.id == conversation_id
        )
        .first()
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversación no encontrada.",
        )

    if conversation.estado == ConversationStatus.submitted:
        raise HTTPException(
            status_code=409,
            detail=(
                "Una conversación ya enviada no puede cancelarse."
            ),
        )

    # Si ya estaba cancelada, simplemente devolvemos
    # el mismo estado. No hace falta generar error.
    if conversation.estado == ConversationStatus.cancelled:
        return ConversationCancelledResponse(
            conversation_id=conversation.id,
            status=conversation.estado,
            message="La conversación ya estaba cancelada.",
        )

    try:
        conversation.estado = ConversationStatus.cancelled
        conversation.fecha_actualizacion = func.now()

        db.commit()
        db.refresh(conversation)

    except Exception:
        db.rollback()
        raise

    return ConversationCancelledResponse(
        conversation_id=conversation.id,
        status=conversation.estado,
        message="Conversación cancelada correctamente.",
    )