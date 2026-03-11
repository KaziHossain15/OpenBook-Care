"""Disclaimer entities for the chat flow."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4

from .errors import DomainValidationError


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True)
class Disclaimer:
    """Represents the disclaimer presented to the user."""

    disclaimer_id: str
    text: str
    version: str

    def __post_init__(self) -> None:
        if not self.disclaimer_id.strip():
            raise DomainValidationError("Disclaimer ID cannot be empty.")
        if not self.text.strip():
            raise DomainValidationError("Disclaimer text cannot be empty.")
        if not self.version.strip():
            raise DomainValidationError("Disclaimer version cannot be empty.")


@dataclass(frozen=True)
class DisclaimerAcknowledgement:
    """Records that a disclaimer version was acknowledged for a session."""

    session_id: UUID
    disclaimer_version: str
    ack_id: UUID = field(default_factory=uuid4)
    acknowledged_at: datetime = field(default_factory=_utc_now)

    def __post_init__(self) -> None:
        if not self.disclaimer_version.strip():
            raise DomainValidationError("Disclaimer version cannot be empty.")
