"""Deterministic mock gateway for local chat behavior."""

from __future__ import annotations

from typing import Any

from .llm_gateway import GatewayResult, GatewayResultStatus


class MockLlmGateway:
    """Returns stable category-based draft responses."""

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

    def generate(self, prompt_package: dict[str, Any]) -> GatewayResult:
        question = str(prompt_package.get("userMessage", "")).strip().lower()
        context = prompt_package.get("context", {})

        if not question:
            return GatewayResult(
                status=GatewayResultStatus.ERROR,
                content="The mock provider could not process an empty question.",
                provider_mode="mock",
            )

        if any(hint in question for hint in self._UNSAFE_HINTS):
            return GatewayResult(
                status=GatewayResultStatus.BLOCKED,
                content=(
                    "I cannot provide diagnosis or urgent medical advice. "
                    "Please contact a qualified professional or emergency services if this may be urgent."
                ),
                provider_mode="mock",
            )

        if "deductible" in question:
            return GatewayResult(
                status=GatewayResultStatus.SUCCESS,
                content=(
                    "A deductible is the amount you usually pay before your plan starts sharing more of the cost."
                ),
                provider_mode="mock",
            )

        if "why" in question and "rank" in question:
            return GatewayResult(
                status=GatewayResultStatus.SUCCESS,
                content=self._ranking_response(context),
                provider_mode="mock",
            )

        if "range" in question or "uncertainty" in question:
            return GatewayResult(
                status=GatewayResultStatus.SUCCESS,
                content=(
                    "The estimate is a range because yearly healthcare costs can change with usage, region, and incomplete pricing data."
                ),
                provider_mode="mock",
            )

        if "compare" in question or "difference" in question:
            return GatewayResult(
                status=GatewayResultStatus.SUCCESS,
                content=(
                    "The main difference is usually the tradeoff between monthly premium, deductible, and worst-case yearly risk."
                ),
                provider_mode="mock",
            )

        return GatewayResult(
            status=GatewayResultStatus.SUCCESS,
            content=(
                "This assistant can explain insurance terms, plan tradeoffs, ranking reasons, and uncertainty in simple language."
            ),
            provider_mode="mock",
        )

    @staticmethod
    def _ranking_response(context: dict[str, Any]) -> str:
        plans = context.get("selectedPlans") if isinstance(context, dict) else None
        if isinstance(plans, list) and plans:
            first_plan = plans[0]
            reason = first_plan.get("rankReason")
            name = first_plan.get("name", "This plan")
            if reason:
                return f"{name} is currently ranked highly because {reason.lower()}."
        return (
            "A higher-ranked plan usually balances expected yearly cost, downside risk, and your stated preferences better."
        )
