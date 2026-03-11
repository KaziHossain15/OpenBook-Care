"""Application tests for explanation service behavior."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2] / "src"
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from application import ExplanationService  # noqa: E402


class ExplanationServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = ExplanationService()

    def test_explain_plan_uses_rank_reason_and_numeric_fields(self) -> None:
        explanation = self.service.explain_plan(
            {
                "name": "Example PPO",
                "rankReason": "Lower expected yearly cost for low-risk users",
                "monthlyPremium": 420,
                "deductible": 1500,
                "estimatedYearlyCostMin": 6200,
                "estimatedYearlyCostMax": 9800,
            },
            risk_preference="low-risk",
        )

        self.assertIn("example ppo", explanation.lower())
        self.assertIn("lower expected yearly cost", explanation.lower())
        self.assertIn("$420", explanation)
        self.assertIn("$6200 to $9800", explanation)

    def test_explain_uncertainty_uses_specific_reason_when_available(self) -> None:
        note = self.service.explain_uncertainty(
            {"uncertaintyReason": "utilization and regional pricing can vary"}
        )

        self.assertIn("utilization and regional pricing can vary", note.lower())


if __name__ == "__main__":
    unittest.main()
