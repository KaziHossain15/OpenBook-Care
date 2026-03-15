"""Factory helpers for selecting LLM providers without changing controller code."""

from __future__ import annotations

from .anthropic_llm_gateway import AnthropicLlmGateway
from .llm_gateway import LlmGateway
from .mock_llm_gateway import MockLlmGateway


def build_llm_gateway(mode: str = "mock") -> LlmGateway:
    normalized = (mode or "mock").strip().lower()
    if normalized == "anthropic":
        return AnthropicLlmGateway()
    return MockLlmGateway()
