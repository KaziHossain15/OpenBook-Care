import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app  # noqa: E402


class ChatRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_unsafe_medical_question_returns_chat_payload(self) -> None:
        session_response = self.client.post("/api/chat/session")
        self.assertEqual(session_response.status_code, 200)
        session_id = session_response.json()["sessionId"]

        ack_response = self.client.post(
            f"/api/chat/{session_id}/acknowledge-disclaimer",
            json={"acknowledged": True},
        )
        self.assertEqual(ack_response.status_code, 200)

        message_response = self.client.post(
            f"/api/chat/{session_id}/messages",
            json={
                "message": "I have chest pain and a fever. What disease do I have?",
                "context": {},
            },
        )

        self.assertEqual(message_response.status_code, 200)
        payload = message_response.json()
        self.assertEqual(payload["errorCode"], "UNSAFE_REQUEST_BLOCKED")
        self.assertEqual(payload["providerMode"], "safety-filter")
        self.assertEqual(payload["userMessage"]["role"], "user")
        self.assertEqual(payload["assistantMessage"]["role"], "assistant")
        self.assertNotIn("detail", payload)


if __name__ == "__main__":
    unittest.main()
