"""Application controller for chat-related use cases."""

from __future__ import annotations

from typing import Any

from contracts.chat_contracts import (
    AcknowledgeDisclaimerResponseDTO,
    CreateSessionResponseDTO,
    DisclaimerPayload,
    ErrorResponseDTO,
    ExplainPlanResponseDTO,
    MessageDTO,
    SubmitMessageResponseDTO,
)
from contracts.error_codes import (
    DISCLAIMER_REQUIRED,
    EMPTY_MESSAGE,
    INVALID_REQUEST,
    PROMPT_BUILD_FAILED,
    PROVIDER_UNAVAILABLE,
    SESSION_CLOSED,
    SESSION_NOT_FOUND,
    UNSAFE_REQUEST_BLOCKED,
)
from domain import (
    ChatSession,
    Disclaimer,
    DisclaimerRequiredError,
    EmptyMessageError,
    SessionClosedError,
)
from infrastructure.chat_session_store import InMemoryChatSessionStore
from infrastructure.llm_gateway import GatewayResultStatus, LlmGateway
from infrastructure.prompt_builder import PromptBuilder
from .explanation_service import ExplanationService


class ChatbotController:
    """Coordinates chat session creation, disclaimer acknowledgement, and messages."""

    _UNSAFE_HINTS = (
        "chest pain",
        "trouble breathing",
        "diagnose",
        "diagnosis",
        "treatment",
        "what should i take",
        "emergency",
        "stroke",
        "heart attack",
    )

    def __init__(
        self,
        *,
        session_store: InMemoryChatSessionStore,
        gateway: LlmGateway,
        prompt_builder: PromptBuilder,
        disclaimer: Disclaimer,
        explanation_service: ExplanationService | None = None,
    ) -> None:
        self._session_store = session_store
        self._gateway = gateway
        self._prompt_builder = prompt_builder
        self._disclaimer = disclaimer
        self._explanation_service = explanation_service or ExplanationService()

    def create_session(self) -> dict[str, Any]:
        session = ChatSession.create()
        self._session_store.save(session)
        return CreateSessionResponseDTO(
            sessionId=str(session.session_id),
            status=session.status.value,
            disclaimerRequired=True,
            disclaimer=DisclaimerPayload(
                version=self._disclaimer.version,
                text=self._disclaimer.text,
            ),
        ).to_dict()

    def acknowledge_disclaimer(self, session_id: str) -> dict[str, Any]:
        session = self._get_session_or_error(session_id)
        if isinstance(session, dict):
            return session

        try:
            acknowledgement = session.acknowledge_disclaimer(self._disclaimer)
        except SessionClosedError as exc:
            return self._error(SESSION_CLOSED, str(exc))

        self._session_store.save(session)
        return AcknowledgeDisclaimerResponseDTO(
            sessionId=str(session.session_id),
            acknowledged=True,
            acknowledgedAt=acknowledgement.acknowledged_at.isoformat(),
        ).to_dict()

    def explain_plan(
        self,
        *,
        plan: dict[str, Any],
        risk_preference: str | None = None,
    ) -> dict[str, Any]:
        if not isinstance(plan, dict) or not plan:
            return self._error(INVALID_REQUEST, "Plan payload is required.")

        return ExplainPlanResponseDTO(
            explanation=self._explanation_service.explain_plan(
                plan,
                risk_preference=risk_preference,
            ),
            uncertaintyNote=self._explanation_service.explain_uncertainty(plan),
        ).to_dict()

    def submit_message(
        self,
        *,
        session_id: str,
        message: str,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        session = self._get_session_or_error(session_id)
        if isinstance(session, dict):
            return session

        try:
            user_message = session.add_user_message(message)
        except DisclaimerRequiredError as exc:
            return self._error(DISCLAIMER_REQUIRED, str(exc))
        except EmptyMessageError as exc:
            return self._error(EMPTY_MESSAGE, str(exc))
        except SessionClosedError as exc:
            return self._error(SESSION_CLOSED, str(exc))

        if self._is_unsafe_request(message):
            assistant_message = session.add_assistant_message(
                "I cannot provide diagnosis or urgent medical advice. "
                "Please contact a qualified professional or emergency services if this may be urgent."
            )
            self._session_store.save(session)
            return SubmitMessageResponseDTO(
                sessionId=str(session.session_id),
                userMessage=self._serialize_message(user_message),
                assistantMessage=self._serialize_message(assistant_message),
                providerMode="safety-filter",
                errorCode=UNSAFE_REQUEST_BLOCKED,
                disclaimerShown=True,
            ).to_dict()

        try:
            prompt_package = self._prompt_builder.build(
                user_message=message,
                context=context or {},
            )
        except ValueError as exc:
            return self._error(PROMPT_BUILD_FAILED, str(exc))
        gateway_result = self._gateway.generate(prompt_package)

        if gateway_result.status is GatewayResultStatus.BLOCKED:
            session.add_assistant_message(gateway_result.content)
            self._session_store.save(session)
            return SubmitMessageResponseDTO(
                sessionId=str(session.session_id),
                userMessage=self._serialize_message(user_message),
                assistantMessage=self._serialize_message(session.messages[-1]),
                providerMode=gateway_result.provider_mode,
                errorCode=UNSAFE_REQUEST_BLOCKED,
                disclaimerShown=True,
            ).to_dict()

        if gateway_result.status is GatewayResultStatus.ERROR:
            return self._error(PROVIDER_UNAVAILABLE, gateway_result.content)

        assistant_message = session.add_assistant_message(gateway_result.content)
        self._session_store.save(session)
        return SubmitMessageResponseDTO(
            sessionId=str(session.session_id),
            userMessage=self._serialize_message(user_message),
            assistantMessage=self._serialize_message(assistant_message),
            providerMode=gateway_result.provider_mode,
            disclaimerShown=True,
        ).to_dict()

    def _get_session_or_error(self, session_id: str) -> ChatSession | dict[str, str]:
        if not session_id or not session_id.strip():
            return self._error(INVALID_REQUEST, "Session ID is required.")

        session = self._session_store.get(session_id)
        if session is None:
            return self._error(SESSION_NOT_FOUND, "Session not found.")
        return session

    @staticmethod
    def _serialize_message(message: Any) -> MessageDTO:
        return MessageDTO(
            messageId=str(message.message_id),
            role=message.role.value,
            content=message.content,
        )

    @staticmethod
    def _error(code: str, message: str) -> dict[str, str]:
        return ErrorResponseDTO(
            errorCode=code,
            message=message,
        ).to_dict()

    @classmethod
    def _is_unsafe_request(cls, message: str) -> bool:
        normalized = str(message).strip().lower()
        return any(hint in normalized for hint in cls._UNSAFE_HINTS)
