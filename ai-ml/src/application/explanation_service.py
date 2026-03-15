"""Rule-based explanation service for plan tradeoffs and uncertainty."""

from __future__ import annotations

from typing import Any


class ExplanationService:
    """Generates short explanations for ranking, tradeoffs, and uncertainty."""

    def explain_plan(self, plan: dict[str, Any], *, risk_preference: str | None = None) -> str:
        name = str(plan.get("name") or "This plan")
        rank_reason = self._clean_text(plan.get("rankReason"))
        premium = plan.get("monthlyPremium")
        deductible = plan.get("deductible")
        yearly_min = plan.get("estimatedYearlyCostMin")
        yearly_max = plan.get("estimatedYearlyCostMax")

        parts: list[str] = []

        if rank_reason:
            parts.append(f"{name} is a stronger match because {rank_reason.lower()}.")
        else:
            parts.append(f"{name} is being compared based on cost tradeoffs and overall fit.")

        if premium is not None and deductible is not None:
            parts.append(
                f"It has a monthly premium of ${premium} and a deductible of ${deductible}."
            )

        if yearly_min is not None and yearly_max is not None:
            parts.append(
                f"Its estimated yearly cost range is ${yearly_min} to ${yearly_max}."
            )

        if risk_preference:
            parts.append(
                f"This explanation is framed for a {risk_preference} preference."
            )

        return " ".join(parts)

    def explain_uncertainty(self, plan: dict[str, Any] | None = None) -> str:
        reason = None
        if isinstance(plan, dict):
            reason = self._clean_text(plan.get("uncertaintyReason"))

        if reason:
            return f"The estimate is shown as a range because {reason.lower()}."
        return (
            "The estimate is shown as a range because yearly healthcare costs can change with usage, regional pricing, and incomplete data."
        )

    @staticmethod
    def _clean_text(value: Any) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text or None
