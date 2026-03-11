"""Gateway abstractions and shared result types for LLM providers."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Protocol


class GatewayResultStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    BLOCKED = "blocked"


@dataclass(frozen=True)
class GatewayResult:
    """Normalized provider result shared across mock and real gateways."""

    status: GatewayResultStatus
    content: str
    provider_mode: str


class LlmGateway(Protocol):
    """Stable provider interface used by the application layer."""

    def generate(self, prompt_package: dict[str, Any]) -> GatewayResult:
        """Return a normalized provider result for a prompt package."""
