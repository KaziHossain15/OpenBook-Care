"""Infrastructure tests for gateway selection and Claude fallback behavior."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2] / "src"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from infrastructure import (  # noqa: E402
    AnthropicLlmGateway,
    GatewayResultStatus,
    MockLlmGateway,
    build_llm_gateway,
)


class GatewayFactoryTests(unittest.TestCase):
    def test_factory_returns_mock_by_default(self) -> None:
        gateway = build_llm_gateway()

        self.assertIsInstance(gateway, MockLlmGateway)

    def test_factory_returns_anthropic_when_requested(self) -> None:
        gateway = build_llm_gateway("anthropic")

        self.assertIsInstance(gateway, AnthropicLlmGateway)

    def test_anthropic_gateway_without_api_key_returns_normalized_error(self) -> None:
        gateway = AnthropicLlmGateway(api_key="")

        result = gateway.generate({"userMessage": "What is a deductible?", "context": {}})

        self.assertEqual(result.status, GatewayResultStatus.ERROR)
        self.assertEqual(result.provider_mode, "anthropic")
        self.assertIn("anthropic_api_key", result.content.lower())


if __name__ == "__main__":
    unittest.main()
