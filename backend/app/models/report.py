from sqlalchemy import Column, Integer, String, Text, Numeric, SmallInteger, Enum as SQLEnum, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from app.config.database import Base
import enum

class PrioridadEnum(str, enum.Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"
    Critical = "Critical"

class EstadoEnum(str, enum.Enum):
    Pendiente = "Pendiente"
    En_Progreso = "En Progreso"
    Resuelto = "Resuelto"
    Rechazado = "Rechazado"

class Reporte(Base):
    __tablename__ = "reportes"

    id = Column(Integer, primary_key=True, index=True)
    id_habitante = Column(Integer, ForeignKey("habitantes.id_habitante", ondelete="CASCADE"), nullable=False)
    titulo = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=False)
    locacion = Column(String(255), nullable=True)
    categoria = Column(String(100), nullable=True)
    prioridad = Column(SQLEnum(PrioridadEnum), default=PrioridadEnum.Medium)
    severidad = Column(SmallInteger, default=1)
    resumen_ia = Column(Text, nullable=True)
    recomendacion_ia = Column(Text, nullable=True)
    confianza_ia = Column(Numeric(5, 2), nullable=True)
    estado = Column(SQLEnum(EstadoEnum), default=EstadoEnum.Pendiente)
    fecha_creacion = Column(TIMESTAMP, server_default=func.now())
    fecha_actualizacion = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())