"""DTO-style request and response contracts for the AI/ML slice."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class DisclaimerPayload:
    version: str
    text: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass(frozen=True)
class MessageDTO:
    messageId: str
    role: str
    content: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass(frozen=True)
class ErrorResponseDTO:
    errorCode: str
    message: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass(frozen=True)
class CreateSessionRequestDTO:
    pass


@dataclass(frozen=True)
class CreateSessionResponseDTO:
    sessionId: str
    status: str
    disclaimerRequired: bool
    disclaimer: DisclaimerPayload

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["disclaimer"] = self.disclaimer.to_dict()
        return payload


@dataclass(frozen=True)
class AcknowledgeDisclaimerRequestDTO:
    sessionId: str


@dataclass(frozen=True)
class AcknowledgeDisclaimerResponseDTO:
    sessionId: str
    acknowledged: bool
    acknowledgedAt: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SubmitMessageRequestDTO:
    sessionId: str
    message: str
    context: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SubmitMessageResponseDTO:
    sessionId: str
    userMessage: MessageDTO
    assistantMessage: MessageDTO
    providerMode: str
    disclaimerShown: bool
    errorCode: str | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["userMessage"] = self.userMessage.to_dict()
        payload["assistantMessage"] = self.assistantMessage.to_dict()
        if self.errorCode is None:
            payload.pop("errorCode")
        return payload


@dataclass(frozen=True)
class ExplainPlanRequestDTO:
    plan: dict[str, Any]
    riskPreference: str | None = None


@dataclass(frozen=True)
class ExplainPlanResponseDTO:
    explanation: str
    uncertaintyNote: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)
