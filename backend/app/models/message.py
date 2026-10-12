import enum

from sqlalchemy import (
    Column,
    BigInteger,
    String,
    Text,
    ForeignKey,
    TIMESTAMP,
    JSON,
    Enum as SQLEnum,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.config.database import Base


class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class MessageType(str, enum.Enum):
    text = "text"
    question = "question"
    form = "form"
    summary = "summary"
    warning = "warning"
    confirmation = "confirmation"
    error = "error"


class MensajeConversacion(Base):
    __tablename__ = "mensajes_conversacion"

    __table_args__ = (
        UniqueConstraint(
            "id_conversacion",
            "client_message_id",
            name="uq_conversation_client_message",
        ),
    )

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    id_conversacion = Column(
        BigInteger,
        ForeignKey(
            "conversaciones_reporte.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    rol = Column(
        SQLEnum(MessageRole),
        nullable=False,
    )

    tipo = Column(
        SQLEnum(MessageType),
        nullable=False,
        default=MessageType.text,
    )

    contenido = Column(
        Text,
        nullable=False,
    )

    metadatos = Column(
        JSON,
        nullable=True,
    )

    client_message_id = Column(
        String(100),
        nullable=True,
    )

    fecha_creacion = Column(
        TIMESTAMP,
        server_default=func.now(),
    )

    conversacion = relationship(
        "ConversacionReporte",
        back_populates="mensajes",
    )