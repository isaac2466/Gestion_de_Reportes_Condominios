from typing import Literal

from pydantic import BaseModel, Field, model_validator

Category = Literal[
    "Agua",
    "Alumbrado",
    "Basura",
    "Vialidad",
    "Áreas comunes",
    "Seguridad",
    "Ruido",
    "Mantenimiento",
    "Otros",
]

Priority = Literal[
    "Low",
    "Medium",
    "High",
    "Critical",
]


class ReportEligibility(BaseModel):
    decision: Literal[
        "valid",
        "needs_information",
        "not_reportable",
    ]

    reason: str = Field(
        min_length=1,
        max_length=300,
    )


class ReportAnalysis(BaseModel):
    category: Category

    priority: Priority

    severity: int = Field(
        ge=1,
        le=5,
    )

    summary: str = Field(
        min_length=1,
        max_length=300,
    )

    recommendation: str = Field(
        min_length=1,
        max_length=500,
    )

    @model_validator(mode="after")
    def validate_priority(self):
        expected_priority = {
            1: "Low",
            2: "Low",
            3: "Medium",
            4: "High",
            5: "Critical",
        }

        expected = expected_priority[self.severity]

        if self.priority != expected:
            raise ValueError(
                f"Prioridad inconsistente. "
                f"Severidad {self.severity} requiere prioridad {expected}."
            )

        return self

