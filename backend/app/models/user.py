from sqlalchemy import Column, Integer, String, Enum as SQLEnum
from app.config.database import Base
import enum

class RolHabitante(str, enum.Enum):
    residente = "residente"
    admin = "admin"

class Habitante(Base):
    __tablename__ = "habitantes"

    id_habitante = Column(Integer, primary_key=True, index=True)
    Nombre = Column(String(100), nullable=False)
    Direccion = Column(String(250), nullable=False)
    Email = Column(String(150), unique=True, nullable=False)
    Password_hash = Column(String(255), nullable=False)
    Rol = Column(SQLEnum(RolHabitante), default=RolHabitante.residente)