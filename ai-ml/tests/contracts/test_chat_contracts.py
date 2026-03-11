"""Contract tests for DTO serialization."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2] / "src"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from contracts import (  # noqa: E402
    CreateSessionResponseDTO,
    DisclaimerPayload,
    ErrorResponseDTO,
    ExplainPlanResponseDTO,
    MessageDTO,
    SubmitMessageResponseDTO,
)


class ChatContractTests(unittest.TestCase):
    def test_create_session_response_serializes_nested_disclaimer(self) -> None:
        dto = CreateSessionResponseDTO(
            sessionId="abc",
            status="open",
            disclaimerRequired=True,
            disclaimer=DisclaimerPayload(version="v1", text="Educational only."),
        )

        payload = dto.to_dict()

        self.assertEqual(payload["sessionId"], "abc")
        self.assertEqual(payload["disclaimer"]["version"], "v1")

    def test_submit_message_response_omits_error_code_when_none(self) -> None:
        dto = SubmitMessageResponseDTO(
            sessionId="abc",
            userMessage=MessageDTO(messageId="u1", role="user", content="hi"),
            assistantMessage=MessageDTO(messageId="a1", role="assistant", content="hello"),
            providerMode="mock",
            disclaimerShown=True,
        )

        payload = dto.to_dict()

        self.assertNotIn("errorCode", payload)
        self.assertEqual(payload["assistantMessage"]["role"], "assistant")

    def test_error_response_serializes_cleanly(self) -> None:
        payload = ErrorResponseDTO(
            errorCode="INVALID_REQUEST",
            message="Bad input.",
        ).to_dict()

        self.assertEqual(payload["errorCode"], "INVALID_REQUEST")

    def test_explain_plan_response_serializes_cleanly(self) -> None:
        payload = ExplainPlanResponseDTO(
            explanation="Plan A is ranked highly.",
            uncertaintyNote="Costs may vary.",
        ).to_dict()

        self.assertEqual(payload["uncertaintyNote"], "Costs may vary.")


if __name__ == "__main__":
    unittest.main()
