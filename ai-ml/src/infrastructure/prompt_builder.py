"""Prompt package creation for chat requests."""

from __future__ import annotations

from typing import Any


class PromptBuilder:
    """Builds a compact prompt package from message text and normalized context."""

    MAX_SELECTED_PLANS = 3
    MAX_TEXT_LENGTH = 500

    def build(self, *, user_message: str, context: dict[str, Any]) -> dict[str, Any]:
        normalized_message = str(user_message).strip()
        if not normalized_message:
            raise ValueError("Prompt builder requires a non-empty user message.")

        if context is None:
            safe_context = {}
        elif not isinstance(context, dict):
            raise ValueError("Context must be a dictionary when provided.")
        else:
            safe_context = self._normalize_context(context)

        return {
            "userMessage": normalized_message,
            "context": safe_context,
        }

    def _normalize_context(self, context: dict[str, Any]) -> dict[str, Any]:
        selected_plans = context.get("selectedPlans")
        normalized_plans = []
        if isinstance(selected_plans, list):
            for raw_plan in selected_plans[: self.MAX_SELECTED_PLANS]:
                if isinstance(raw_plan, dict):
                    normalized_plans.append(
                        {
                            "name": self._clip(raw_plan.get("name")),
                            "rankReason": self._clip(raw_plan.get("rankReason")),
                            "uncertaintyReason": self._clip(raw_plan.get("uncertaintyReason")),
                            "estimatedYearlyCostMin": raw_plan.get("estimatedYearlyCostMin"),
                            "estimatedYearlyCostMax": raw_plan.get("estimatedYearlyCostMax"),
                        }
                    )

        user_inputs = context.get("userInputs")
        normalized_inputs = user_inputs if isinstance(user_inputs, dict) else {}

        return {
            "userInputs": normalized_inputs,
            "selectedPlans": normalized_plans,
            "currentView": self._clip(context.get("currentView")),
            "source": self._clip(context.get("source")) or "frontend",
        }

    def _clip(self, value: Any) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        if not text:
            return None
        return text[: self.MAX_TEXT_LENGTH]
