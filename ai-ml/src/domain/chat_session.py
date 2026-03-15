"""Chat session aggregate root."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Iterable
from uuid import UUID, uuid4

from .chat_message import ChatMessage, MessageRole, MessageStatus
from .disclaimer import Disclaimer, DisclaimerAcknowledgement
from .errors import DisclaimerRequiredError, SessionClosedError


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ChatSessionStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"


@dataclass
class ChatSession:
    """Owns conversation state and message creation rules."""

    status: ChatSessionStatus = ChatSessionStatus.OPEN
    session_id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=_utc_now)
    last_activity_at: datetime = field(default_factory=_utc_now)
    disclaimer_acknowledgement: DisclaimerAcknowledgement | None = None
    messages: list[ChatMessage] = field(default_factory=list)

    @classmethod
    def create(cls) -> "ChatSession":
        return cls()

    @property
    def disclaimer_acknowledged(self) -> bool:
        return self.disclaimer_acknowledgement is not None

    def acknowledge_disclaimer(
        self,
        disclaimer: Disclaimer,
        acknowledged_at: datetime | None = None,
    ) -> DisclaimerAcknowledgement:
        self._ensure_open()
        acknowledgement = DisclaimerAcknowledgement(
            session_id=self.session_id,
            disclaimer_version=disclaimer.version,
            acknowledged_at=acknowledged_at or _utc_now(),
        )
        self.disclaimer_acknowledgement = acknowledgement
        self.last_activity_at = acknowledgement.acknowledged_at
        return acknowledgement

    def add_user_message(
        self,
        content: str,
        created_at: datetime | None = None,
    ) -> ChatMessage:
        self._ensure_open()
        if not self.disclaimer_acknowledged:
            raise DisclaimerRequiredError(
                "Disclaimer acknowledgement is required before the first user message."
            )
        return self._append_message(
            role=MessageRole.USER,
            content=content,
            created_at=created_at,
        )

    def add_assistant_message(
        self,
        content: str,
        created_at: datetime | None = None,
        status: MessageStatus = MessageStatus.COMPLETED,
    ) -> ChatMessage:
        self._ensure_open()
        return self._append_message(
            role=MessageRole.ASSISTANT,
            content=content,
            created_at=created_at,
            status=status,
        )

    def add_system_message(
        self,
        content: str,
        created_at: datetime | None = None,
    ) -> ChatMessage:
        self._ensure_open()
        return self._append_message(
            role=MessageRole.SYSTEM,
            content=content,
            created_at=created_at,
        )

    def close(self) -> None:
        self.status = ChatSessionStatus.CLOSED
        self.last_activity_at = _utc_now()

    def message_history(self) -> Iterable[ChatMessage]:
        return tuple(self.messages)

    def _append_message(
        self,
        *,
        role: MessageRole,
        content: str,
        created_at: datetime | None,
        status: MessageStatus = MessageStatus.COMPLETED,
    ) -> ChatMessage:
        message = ChatMessage(
            session_id=self.session_id,
            role=role,
            content=content,
            created_at=created_at or _utc_now(),
            status=status,
        )
        self.messages.append(message)
        self.last_activity_at = message.created_at
        return message

    def _ensure_open(self) -> None:
        if self.status is ChatSessionStatus.CLOSED:
            raise SessionClosedError("Closed sessions cannot accept new messages.")
