from typing import Literal

from pydantic import BaseModel, Field


ConversationAction = Literal[
    "continue",
    "request_fields",
    "ready_for_confirmation",
    "safety_warning",
    "not_reportable",
]


AllowedFieldKey = Literal[
    "description",
    "location",
    "since_when",
    "risk_active",
    "affects_passage",
    "frequency",
    "time_window",
    "approximate_size",
    "affected_area",
    "additional_details",
]


ContextValue = str | bool | int | float | None


class ReportDraft(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None

    category: str | None = None
    priority: Literal[
        "Low",
        "Medium",
        "High",
        "Critical",
    ] | None = None

    severity: int | None = Field(
        default=None,
        ge=1,
        le=5,
    )

    summary: str | None = None
    recommendation: str | None = None

    context: dict[str, ContextValue] = Field(
        default_factory=dict
    )


class DraftUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None

    context: dict[str, ContextValue] = Field(
        default_factory=dict
    )


class ConversationExtraction(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None

    context: dict[str, ContextValue] = Field(
        default_factory=dict
    )

    safety_risk: bool = False


class ConversationDecision(BaseModel):
    action: ConversationAction

    assistant_message: str = Field(
        min_length=1,
        max_length=600,
    )

    draft_updates: DraftUpdate = Field(
        default_factory=DraftUpdate
    )

    requested_fields: list[AllowedFieldKey] = Field(
        default_factory=list,
        max_length=2,
    )