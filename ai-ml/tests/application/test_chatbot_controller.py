"""Application tests for the chatbot controller draft flow."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2] / "src"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from application import ChatbotController  # noqa: E402
from contracts import (  # noqa: E402
    DISCLAIMER_REQUIRED,
    INVALID_REQUEST,
    PROMPT_BUILD_FAILED,
    UNSAFE_REQUEST_BLOCKED,
)
from domain import Disclaimer  # noqa: E402
from infrastructure import (  # noqa: E402
    InMemoryChatSessionStore,
    MockLlmGateway,
    PromptBuilder,
)


class ChatbotControllerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.controller = ChatbotController(
            session_store=InMemoryChatSessionStore(),
            gateway=MockLlmGateway(),
            prompt_builder=PromptBuilder(),
            disclaimer=Disclaimer(
                disclaimer_id="not-medical-advice",
                text="NOT MEDICAL ADVICE. Educational information only.",
                version="v1",
            ),
        )

    def test_create_session_returns_disclaimer_payload(self) -> None:
        response = self.controller.create_session()

        self.assertEqual(response["status"], "open")
        self.assertTrue(response["disclaimerRequired"])
        self.assertEqual(response["disclaimer"]["version"], "v1")

    def test_submit_message_requires_disclaimer_acknowledgement(self) -> None:
        session = self.controller.create_session()

        response = self.controller.submit_message(
            session_id=session["sessionId"],
            message="What is a deductible?",
        )

        self.assertEqual(response["errorCode"], DISCLAIMER_REQUIRED)

    def test_submit_message_returns_mock_response_after_ack(self) -> None:
        session = self.controller.create_session()
        self.controller.acknowledge_disclaimer(session["sessionId"])

        response = self.controller.submit_message(
            session_id=session["sessionId"],
            message="What is a deductible?",
        )

        self.assertEqual(response["providerMode"], "mock")
        self.assertEqual(response["assistantMessage"]["role"], "assistant")
        self.assertIn("deductible", response["assistantMessage"]["content"].lower())

    def test_unsafe_message_returns_blocked_error_code_and_response(self) -> None:
        session = self.controller.create_session()
        self.controller.acknowledge_disclaimer(session["sessionId"])

        response = self.controller.submit_message(
            session_id=session["sessionId"],
            message="I have chest pain, what treatment should I take?",
        )

        self.assertEqual(response["errorCode"], UNSAFE_REQUEST_BLOCKED)
        self.assertIn("cannot provide diagnosis", response["assistantMessage"]["content"].lower())

    def test_explain_plan_returns_rule_based_explanation(self) -> None:
        response = self.controller.explain_plan(
            plan={
                "name": "Example PPO",
                "rankReason": "Lower expected yearly cost for low-risk users",
                "uncertaintyReason": "utilization may vary by year",
                "monthlyPremium": 420,
                "deductible": 1500,
                "estimatedYearlyCostMin": 6200,
                "estimatedYearlyCostMax": 9800,
            },
            risk_preference="low-risk",
        )

        self.assertIn("example ppo", response["explanation"].lower())
        self.assertIn("utilization may vary by year", response["uncertaintyNote"].lower())

    def test_explain_plan_rejects_empty_plan_payload(self) -> None:
        response = self.controller.explain_plan(plan={})

        self.assertEqual(response["errorCode"], INVALID_REQUEST)

    def test_invalid_context_type_returns_prompt_build_failed(self) -> None:
        session = self.controller.create_session()
        self.controller.acknowledge_disclaimer(session["sessionId"])

        response = self.controller.submit_message(
            session_id=session["sessionId"],
            message="Why is this ranked first?",
            context="not-a-dict",
        )

        self.assertEqual(response["errorCode"], PROMPT_BUILD_FAILED)


if __name__ == "__main__":
    unittest.main()
