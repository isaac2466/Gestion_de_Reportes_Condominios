import enum

from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Text,
    SmallInteger,
    ForeignKey,
    TIMESTAMP,
    JSON,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.config.database import Base
from app.models.report import PrioridadEnum


class ConversationStatus(str, enum.Enum):
    collecting = "collecting"
    needs_information = "needs_information"
    ready_for_confirmation = "ready_for_confirmation"
    submitted = "submitted"
    cancelled = "cancelled"


class ConversacionReporte(Base):
    __tablename__ = "conversaciones_reporte"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    id_habitante = Column(
        Integer,
        ForeignKey(
            "habitantes.id_habitante",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    id_reporte = Column(
        Integer,
        ForeignKey(
            "reportes.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    estado = Column(
        SQLEnum(ConversationStatus),
        nullable=False,
        default=ConversationStatus.collecting,
    )

    titulo_borrador = Column(
        String(150),
        nullable=True,
    )

    descripcion_borrador = Column(
        Text,
        nullable=True,
    )

    locacion_borrador = Column(
        String(255),
        nullable=True,
    )

    categoria_borrador = Column(
        String(100),
        nullable=True,
    )

    prioridad_borrador = Column(
        SQLEnum(PrioridadEnum),
        nullable=True,
    )

    severidad_borrador = Column(
        SmallInteger,
        nullable=True,
    )

    resumen_borrador = Column(
        Text,
        nullable=True,
    )

    recomendacion_borrador = Column(
        Text,
        nullable=True,
    )

    campos_faltantes = Column(
        JSON,
        nullable=True,
    )

    version_borrador = Column(
        Integer,
        nullable=False,
        default=1,
    )

    fecha_creacion = Column(
        TIMESTAMP,
        server_default=func.now(),
    )

    fecha_actualizacion = Column(
        TIMESTAMP,
        server_default=func.now(),
        onupdate=func.now(),
    )

    mensajes = relationship(
        "MensajeConversacion",
        back_populates="conversacion",
        cascade="all, delete-orphan",
        order_by="MensajeConversacion.fecha_creacion",
    )