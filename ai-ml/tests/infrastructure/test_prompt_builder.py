"""Infrastructure tests for prompt context normalization."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2] / "src"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from infrastructure import PromptBuilder  # noqa: E402
from infrastructure.mock_llm_gateway import MockLlmGateway  # noqa: E402


class PromptBuilderTests(unittest.TestCase):
    def test_build_preserves_current_plan_and_simulation_summary(self) -> None:
        builder = PromptBuilder()

        payload = builder.build(
            user_message="What is my annual cost?",
            context={
                "currentPlan": {
                    "name": "BlueCross Gold Plus",
                    "provider": "BlueCross",
                    "planType": "Gold",
                    "premium": 580,
                    "deductible": 500,
                    "oopMax": 3500,
                    "primaryCopay": 15,
                    "specialistCopay": 35,
                    "prescriptionCoverage": "$5/$25/$50",
                },
                "simulationSummary": {
                    "totalAnnualCost": 7320,
                    "monthlyAverage": 610,
                    "estimatedOutOfPocket": 360,
                },
            },
        )

        self.assertEqual(payload["context"]["currentPlan"]["name"], "BlueCross Gold Plus")
        self.assertEqual(payload["context"]["simulationSummary"]["monthlyAverage"], 610)

    def test_mock_gateway_uses_simulation_context_for_cost_question(self) -> None:
        gateway = MockLlmGateway()

        result = gateway.generate(
            {
                "userMessage": "What is my total cost?",
                "context": {
                    "currentPlan": {"name": "BlueCross Gold Plus"},
                    "simulationSummary": {
                        "totalAnnualCost": 7320,
                        "monthlyAverage": 610,
                        "estimatedOutOfPocket": 360,
                    },
                },
            }
        )

        self.assertIn("7320", result.content)
        self.assertIn("610", result.content)


if __name__ == "__main__":
    unittest.main()
