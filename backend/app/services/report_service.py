from typing import Any

from sqlalchemy.orm import Session

from app.models.report import (
    EstadoEnum,
    PrioridadEnum,
    Reporte,
)


def create_report_record(
    db: Session,
    *,
    id_habitante: int,
    titulo: str | None,
    descripcion: str,
    locacion: str,
    categoria: str | None = None,
    prioridad: PrioridadEnum | str | None = None,
    severidad: int | None = None,
    resumen_ia: str | None = None,
    recomendacion_ia: str | None = None,
    datos_contexto: dict[str, Any] | None = None,
) -> Reporte:
    """
    Crea un Reporte dentro de la transacción actual.

    Importante:
    - Hace add() y flush().
    - NO hace commit().
    - El caller decide si confirma o revierte la transacción.
    """

    safe_title = (titulo or "").strip() or "Reporte vecinal"
    safe_description = (descripcion or "").strip()
    safe_location = (locacion or "").strip()

    if not safe_description:
        raise ValueError("La descripción del reporte es obligatoria.")

    if not safe_location:
        raise ValueError("La ubicación del reporte es obligatoria.")

    if prioridad is None:
        normalized_priority = PrioridadEnum.Medium
    elif isinstance(prioridad, PrioridadEnum):
        normalized_priority = prioridad
    else:
        normalized_priority = PrioridadEnum(prioridad)

    normalized_severity = severidad if severidad is not None else 1

    if not 1 <= normalized_severity <= 5:
        raise ValueError("La severidad debe estar entre 1 y 5.")

    reporte = Reporte(
        id_habitante=id_habitante,
        titulo=safe_title,
        descripcion=safe_description,
        locacion=safe_location,
        categoria=categoria,
        prioridad=normalized_priority,
        severidad=normalized_severity,
        resumen_ia=resumen_ia,
        recomendacion_ia=recomendacion_ia,
        confianza_ia=None,
        datos_contexto=dict(datos_contexto or {}),
        estado=EstadoEnum.Pendiente,
    )

    db.add(reporte)

    # Necesitamos el ID del reporte sin confirmar todavía la transacción.
    db.flush()

    return reporte