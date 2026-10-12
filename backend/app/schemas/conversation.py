from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.conversation import ConversationStatus
from app.models.message import MessageRole, MessageType
from app.models.report import PrioridadEnum


class ConversationCreate(BaseModel):
    id_habitante: int


class ConversationFormData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str | None = Field(
        default=None,
        min_length=1,
        max_length=4000,
    )

    location: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )

    since_when: str | None = None
    risk_active: bool | str | None = None
    affects_passage: bool | str | None = None
    frequency: str | None = None
    time_window: str | None = None
    approximate_size: str | None = None
    affected_area: str | None = None
    additional_details: str | None = None


class ConversationMessageCreate(BaseModel):
    content: str = Field(
        min_length=1,
        max_length=4000,
    )

    client_message_id: str | None = Field(
        default=None,
        max_length=100,
    )

    form_data: ConversationFormData | None = None


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_conversacion: int

    role: MessageRole
    type: MessageType

    content: str
    metadata: dict[str, Any] | None = None

    client_message_id: str | None = None

    created_at: datetime

class DraftResponse(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None

    category: str | None = None
    priority: PrioridadEnum | None = None
    severity: int | None = None

    summary: str | None = None
    recommendation: str | None = None

    missing_fields: list[str] = Field(
        default_factory=list
    )

    context: dict[str, Any] = Field(
        default_factory=dict
    )

    version: int = 1

class ConversationResponse(BaseModel):
    conversation_id: int
    resident_id: int

    report_id: int | None = None

    status: ConversationStatus

    draft: DraftResponse

    messages: list[MessageResponse] = Field(
        default_factory=list
    )

    created_at: datetime
    updated_at: datetime

class ConversationCreatedResponse(BaseModel):
    conversation_id: int
    status: ConversationStatus
    assistant_message: MessageResponse


class ConversationCancelledResponse(BaseModel):
    conversation_id: int
    status: ConversationStatus
    message: str


class ConversationListItem(BaseModel):
    conversation_id: int
    status: ConversationStatus

    report_id: int | None = None

    title: str | None = None
    last_message: str | None = None

    updated_at: datetime


class ConversationTurnResponse(BaseModel):
    conversation_id: int
    status: ConversationStatus
    draft: DraftResponse
    missing_fields: list[str] = Field(default_factory=list)
    analysis_available: bool | None = None

    user_message: MessageResponse
    assistant_messages: list[MessageResponse] = Field(
        default_factory=list
    )