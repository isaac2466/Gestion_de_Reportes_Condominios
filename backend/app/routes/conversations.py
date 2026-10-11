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
)


router = APIRouter(
    prefix="/api/conversations",
    tags=["Conversations"],
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
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
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
            ConversacionReporte.id == conversation_id
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

    # Si React repite accidentalmente una solicitud con
    # el mismo client_message_id, devolvemos el mensaje
    # existente en lugar de crear un duplicado.
    if data.client_message_id:
        existing_message = (
            db.query(MensajeConversacion)
            .filter(
                MensajeConversacion.id_conversacion
                == conversation_id,
                MensajeConversacion.client_message_id
                == data.client_message_id,
            )
            .first()
        )

        if existing_message:
            response.status_code = status.HTTP_200_OK

            return message_to_response(
                existing_message
            )

    try:
        message = MensajeConversacion(
            id_conversacion=conversation_id,
            rol=MessageRole.user,
            tipo=MessageType.text,
            contenido=data.content,
            client_message_id=data.client_message_id,
        )

        db.add(message)

        # La conversación tuvo actividad nueva.
        conversation.fecha_actualizacion = func.now()

        db.commit()
        db.refresh(message)

    except Exception:
        db.rollback()
        raise

    return message_to_response(message)


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