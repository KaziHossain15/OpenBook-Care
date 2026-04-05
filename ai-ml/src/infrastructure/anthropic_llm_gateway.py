"""Anthropic gateway adapter that preserves the same contract as the mock gateway."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any

from .llm_gateway import GatewayResult, GatewayResultStatus


class AnthropicLlmGateway:
    """Minimal Anthropic adapter using the Messages HTTP API."""

    API_URL = "https://api.anthropic.com/v1/messages"

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        max_tokens: int = 300,
        timeout_seconds: int = 20,
    ) -> None:
        self._api_key = api_key if api_key is not None else os.getenv("ANTHROPIC_API_KEY", "")
        self._model = (
            model
            if model is not None
            else os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
        )
        self._max_tokens = max_tokens
        self._timeout_seconds = timeout_seconds

    def generate(self, prompt_package: dict[str, Any]) -> GatewayResult:
        if not self._api_key:
            return GatewayResult(
                status=GatewayResultStatus.ERROR,
                content="Anthropic gateway is not configured. Set ANTHROPIC_API_KEY to enable live responses.",
                provider_mode="anthropic",
            )

        user_message = str(prompt_package.get("userMessage", "")).strip()
        if not user_message:
            return GatewayResult(
                status=GatewayResultStatus.ERROR,
                content="Anthropic gateway received an empty user message.",
                provider_mode="anthropic",
            )

        body = self._build_request_body(prompt_package)
        request = urllib.request.Request(
            self.API_URL,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-api-key": self._api_key,
                "anthropic-version": "2023-06-01",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=self._timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            return GatewayResult(
                status=GatewayResultStatus.ERROR,
                content=f"Anthropic request failed with HTTP {exc.code}: {detail[:300]}",
                provider_mode="anthropic",
            )
        except urllib.error.URLError as exc:
            return GatewayResult(
                status=GatewayResultStatus.ERROR,
                content=f"Anthropic request failed: {exc.reason}",
                provider_mode="anthropic",
            )
        except Exception as exc:  # noqa: BLE001
            return GatewayResult(
                status=GatewayResultStatus.ERROR,
                content=f"Anthropic request failed: {exc}",
                provider_mode="anthropic",
            )

        content = self._extract_text(payload)
        if not content:
            return GatewayResult(
                status=GatewayResultStatus.ERROR,
                content="Anthropic returned no text content.",
                provider_mode="anthropic",
            )

        return GatewayResult(
            status=GatewayResultStatus.SUCCESS,
            content=content,
            provider_mode="anthropic",
        )

    def _build_request_body(self, prompt_package: dict[str, Any]) -> dict[str, Any]:
        context = prompt_package.get("context", {})
        context_json = json.dumps(context, ensure_ascii=True)
        system_prompt = (
            "You are the OpenBook Care AI assistant. "
            "Provide educational insurance guidance in simple language. "
            "Do not provide diagnosis, treatment, or emergency medical advice. "
            "Acknowledge uncertainty when data is incomplete."
        )
        user_prompt = (
            f"Context: {context_json}\n"
            f"User question: {prompt_package.get('userMessage', '')}"
        )
        return {
            "model": self._model,
            "max_tokens": self._max_tokens,
            "system": system_prompt,
            "messages": [
                {
                    "role": "user",
                    "content": user_prompt,
                }
            ],
        }

    @staticmethod
    def _extract_text(payload: dict[str, Any]) -> str:
        content_blocks = payload.get("content")
        if not isinstance(content_blocks, list):
            return ""

        text_parts: list[str] = []
        for block in content_blocks:
            if isinstance(block, dict) and block.get("type") == "text":
                text = str(block.get("text", "")).strip()
                if text:
                    text_parts.append(text)
        return "\n".join(text_parts).strip()
