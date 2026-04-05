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
                content=self._comparison_response(context),
                provider_mode="mock",
            )

        if any(
            hint in question
            for hint in ("my cost", "total cost", "monthly average", "annual cost", "out-of-pocket")
        ):
            return GatewayResult(
                status=GatewayResultStatus.SUCCESS,
                content=self._cost_summary_response(context),
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

    @staticmethod
    def _comparison_response(context: dict[str, Any]) -> str:
        current_plan = context.get("currentPlan") if isinstance(context, dict) else None
        simulation = context.get("simulationSummary") if isinstance(context, dict) else None
        if isinstance(current_plan, dict):
            name = current_plan.get("name") or "This plan"
            premium = current_plan.get("premium")
            deductible = current_plan.get("deductible")
            if premium is not None and deductible is not None:
                return (
                    f"{name} trades a monthly premium of ${premium} against a deductible of "
                    f"${deductible}. A lower premium usually means you take on more cost before "
                    "coverage becomes generous."
                )
        if isinstance(simulation, dict) and simulation.get("totalAnnualCost") is not None:
            return (
                "The main difference is usually the tradeoff between monthly premium, deductible, "
                f"and expected yearly total cost. Your current simulation estimates about "
                f"${simulation['totalAnnualCost']} for the year."
            )
        return (
            "The main difference is usually the tradeoff between monthly premium, deductible, and worst-case yearly risk."
        )

    @staticmethod
    def _cost_summary_response(context: dict[str, Any]) -> str:
        simulation = context.get("simulationSummary") if isinstance(context, dict) else None
        current_plan = context.get("currentPlan") if isinstance(context, dict) else None

        if isinstance(simulation, dict):
            annual = simulation.get("totalAnnualCost")
            monthly = simulation.get("monthlyAverage")
            oop = simulation.get("estimatedOutOfPocket")
            plan_name = None
            if isinstance(current_plan, dict):
                plan_name = current_plan.get("name")

            if annual is not None and monthly is not None and oop is not None:
                plan_label = f" with {plan_name}" if plan_name else ""
                return (
                    f"Based on your current simulation{plan_label}, your estimated annual cost is "
                    f"${annual}, with about ${monthly} per month on average and roughly ${oop} in "
                    "out-of-pocket costs."
                )

        return (
            "Your total estimated cost combines premiums with expected out-of-pocket spending based on the usage you entered."
        )
