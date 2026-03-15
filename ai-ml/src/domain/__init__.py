"""Domain layer for the OpenBook Care AI/ML slice."""

from .chat_message import ChatMessage, MessageRole, MessageStatus
from .chat_session import ChatSession, ChatSessionStatus
from .disclaimer import Disclaimer, DisclaimerAcknowledgement
from .errors import (
    DisclaimerRequiredError,
    DomainValidationError,
    EmptyMessageError,
    SessionClosedError,
)

__all__ = [
    "ChatMessage",
    "MessageRole",
    "MessageStatus",
    "ChatSession",
    "ChatSessionStatus",
    "Disclaimer",
    "DisclaimerAcknowledgement",
    "DomainValidationError",
    "SessionClosedError",
    "DisclaimerRequiredError",
    "EmptyMessageError",
]
