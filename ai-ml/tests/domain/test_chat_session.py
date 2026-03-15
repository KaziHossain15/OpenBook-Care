"""Domain tests for chat session and disclaimer behavior."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2] / "src"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from domain import (  # noqa: E402
    ChatSession,
    Disclaimer,
    DisclaimerRequiredError,
    EmptyMessageError,
    MessageRole,
    SessionClosedError,
)


class ChatSessionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.session = ChatSession.create()
        self.disclaimer = Disclaimer(
            disclaimer_id="not-medical-advice",
            text="NOT MEDICAL ADVICE. Educational information only.",
            version="v1",
        )

    def test_user_message_requires_disclaimer_acknowledgement(self) -> None:
        with self.assertRaises(DisclaimerRequiredError):
            self.session.add_user_message("What is a deductible?")

    def test_acknowledgement_allows_user_message(self) -> None:
        self.session.acknowledge_disclaimer(self.disclaimer)

        message = self.session.add_user_message("What is a deductible?")

        self.assertTrue(self.session.disclaimer_acknowledged)
        self.assertEqual(message.role, MessageRole.USER)
        self.assertEqual(len(self.session.messages), 1)

    def test_assistant_message_can_be_appended_after_user_message(self) -> None:
        self.session.acknowledge_disclaimer(self.disclaimer)
        self.session.add_user_message("Why is this estimate a range?")

        reply = self.session.add_assistant_message(
            "Because your yearly costs can vary based on how much care you use."
        )

        self.assertEqual(reply.role, MessageRole.ASSISTANT)
        self.assertEqual(len(self.session.messages), 2)

    def test_empty_message_is_rejected(self) -> None:
        self.session.acknowledge_disclaimer(self.disclaimer)

        with self.assertRaises(EmptyMessageError):
            self.session.add_user_message("   ")

    def test_closed_session_rejects_new_messages(self) -> None:
        self.session.acknowledge_disclaimer(self.disclaimer)
        self.session.close()

        with self.assertRaises(SessionClosedError):
            self.session.add_user_message("Can I still send this?")


if __name__ == "__main__":
    unittest.main()
