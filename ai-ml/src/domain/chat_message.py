"""Chat message entity."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from uuid import UUID, uuid4

from .errors import EmptyMessageError


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class MessageStatus(str, Enum):
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ChatMessage:
    """Represents one message in a chat session."""

    session_id: UUID
    role: MessageRole
    content: str
    status: MessageStatus = MessageStatus.COMPLETED
    message_id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=_utc_now)

    def __post_init__(self) -> None:
        normalized = self.content.strip()
        if not normalized:
            raise EmptyMessageError("Message content cannot be empty.")
        self.content = normalized
