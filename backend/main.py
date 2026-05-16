"""
FastAPI backend for OpenBook Care.

Endpoints:
  - GET /api/plans?zip=<5-digit-zip>
  - POST /api/chat/session
  - POST /api/chat/{session_id}/acknowledge-disclaimer
  - POST /api/chat/{session_id}/messages

To run:
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


ROOT_DIR = Path(__file__).resolve().parents[1]
AI_ML_SRC = ROOT_DIR / "ai-ml" / "src"
if str(AI_ML_SRC) not in sys.path:
    sys.path.insert(0, str(AI_ML_SRC))

from application import ChatbotController  # noqa: E402
from contracts.error_codes import (  # noqa: E402
    DISCLAIMER_REQUIRED,
    EMPTY_MESSAGE,
    INVALID_REQUEST,
    PROMPT_BUILD_FAILED,
    PROVIDER_UNAVAILABLE,
    SESSION_CLOSED,
    SESSION_NOT_FOUND,
    UNSAFE_REQUEST_BLOCKED,
)
from domain import Disclaimer  # noqa: E402
from infrastructure import (  # noqa: E402
    InMemoryChatSessionStore,
    PromptBuilder,
)
from infrastructure.llm_gateway_factory import build_llm_gateway  # noqa: E402

app = FastAPI(title="OpenBook Care API")


def _cors_kwargs() -> dict[str, Any]:
    """
    Browser clients may call the API from another origin when VITE_API_BASE_URL
    points at this host. Allow localhost dev, optional explicit origins, and by
    default any *.vercel.app preview/production URL.

    Set CORS_ALLOW_ORIGIN_REGEX="" to disable regex matching entirely.
    """
    extras_raw = os.getenv("CORS_ALLOW_ORIGINS", "")
    extras = [o.strip() for o in extras_raw.split(",") if o.strip()]
    allow_origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        *extras,
    ]

    regex_env = os.getenv("CORS_ALLOW_ORIGIN_REGEX")
    if regex_env is None:
        allow_origin_regex = r"https://.*\.vercel\.app"
    else:
        stripped = regex_env.strip()
        allow_origin_regex = stripped or None

    kwargs: dict[str, Any] = {
        "allow_origins": allow_origins,
        "allow_methods": ["GET", "POST"],
        "allow_headers": ["*"],
    }
    if allow_origin_regex:
        kwargs["allow_origin_regex"] = allow_origin_regex
    return kwargs


app.add_middleware(CORSMiddleware, **_cors_kwargs())


def _load_dotenv() -> None:
    for env_path in (ROOT_DIR / ".env", Path(__file__).resolve().parent / ".env"):
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            if not key or key in os.environ:
                continue

            cleaned = value.strip().strip("'").strip('"')
            os.environ[key] = cleaned


_load_dotenv()


def _default_chat_mode() -> str:
    configured = os.getenv("OPENBOOK_CHAT_MODE")
    if configured and configured.strip():
        return configured.strip()
    return "anthropic" if os.getenv("ANTHROPIC_API_KEY") else "mock"


CHATBOT_CONTROLLER = ChatbotController(
    session_store=InMemoryChatSessionStore(),
    gateway=build_llm_gateway(_default_chat_mode()),
    prompt_builder=PromptBuilder(),
    disclaimer=Disclaimer(
        disclaimer_id="not-medical-advice",
        text=(
            "NOT MEDICAL ADVICE. OpenBook Care provides educational guidance about "
            "healthcare costs and insurance. It does not provide diagnosis, "
            "treatment, or emergency medical advice."
        ),
        version="v1",
    ),
)


class AcknowledgeDisclaimerRequest(BaseModel):
    acknowledged: bool = Field(default=True)


class SubmitMessageRequest(BaseModel):
    message: str = Field(min_length=1)
    context: dict[str, Any] = Field(default_factory=dict)


_ERROR_STATUS = {
    INVALID_REQUEST: 400,
    DISCLAIMER_REQUIRED: 403,
    EMPTY_MESSAGE: 400,
    SESSION_NOT_FOUND: 404,
    SESSION_CLOSED: 409,
    PROMPT_BUILD_FAILED: 400,
    PROVIDER_UNAVAILABLE: 503,
    UNSAFE_REQUEST_BLOCKED: 200,
}


def _response_or_error(payload: dict[str, Any]) -> dict[str, Any]:
    error_code = payload.get("errorCode")
    if error_code:
        status_code = _ERROR_STATUS.get(str(error_code), 400)
        if status_code < 400:
            return payload
        raise HTTPException(status_code=status_code, detail=payload)
    return payload

# ── CMS constants ─────────────────────────────────────────────────────────────

# Family Practice Office Visit Costs  (dataset bb4c-dcdf)
_CMS_PCP_RESOURCE_ID = "c31e250c-cc6b-5e78-82d5-7e88bb3c1d3c"

# Internal Medicine Office Visit Costs  (dataset 9735-7176)
_CMS_SPEC_RESOURCE_ID = "aeeaa1c0-c717-549b-8f11-752491183057"

_CMS_API_BASE = "https://data.cms.gov/provider-data/api/1/datastore/query"


# ── CMS helpers ───────────────────────────────────────────────────────────────


async def _fetch_copays(
    client: httpx.AsyncClient, resource_id: str, zip_code: str
) -> dict | None:
    """
    Return the min / mode / max established-patient copays for a ZIP code.
    Returns None if the dataset has no row for that ZIP.
    """
    params = {
        "conditions[0][property]": "zip_code",
        "conditions[0][value]": zip_code,
        "conditions[0][operator]": "=",
        "fields[]": [
            "min_copay_for_established_patient",
            "mode_copay_for_established_patient",
            "max_copay_for_established_patient",
        ],
        "limit": "1",
    }
    resp = await client.get(f"{_CMS_API_BASE}/{resource_id}", params=params)
    resp.raise_for_status()
    results = resp.json().get("results", [])
    if not results:
        return None
    row = results[0]
    return {
        "min": max(5, round(float(row["min_copay_for_established_patient"]))),
        "mode": max(5, round(float(row["mode_copay_for_established_patient"]))),
        "max": max(5, round(float(row["max_copay_for_established_patient"]))),
    }


def _build_plans(zip_code: str, pcp: dict, spec: dict) -> list[dict]:
    """
    Synthesise three cost tiers (Basic / Silver / Gold) from real CMS copay data.

    Tier mapping:
      Basic  → max copay  (highest cost-sharing, lowest premium)
      Silver → mode copay (most typical cost-sharing)
      Gold   → min copay  (lowest cost-sharing, highest premium)
    """
    return [
        {
            "planId": f"{zip_code}-basic",
            "planType": "Basic",
            "name": f"HealthFirst Essential ({zip_code})",
            "provider": "HealthFirst",
            "premium": 295,
            "deductible": 3000,
            "oopMax": 8500,
            "networkSize": "15,000+ providers",
            "copays": {
                "primary": pcp["max"],
                "specialist": spec["max"],
                "rx": "$20/$60/$100",
            },
            "features": [
                "Telehealth",
                "Preventive care",
                "Emergency services",
                "Lab work",
            ],
            "gradient": "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
            "accent": "#6366f1",
            "riskDrivers": ["High deductible", "Moderate network"],
        },
        {
            "planId": f"{zip_code}-silver",
            "planType": "Silver",
            "name": f"United Health Silver ({zip_code})",
            "provider": "UnitedHealth",
            "premium": 425,
            "deductible": 1500,
            "oopMax": 6000,
            "networkSize": "28,000+ providers",
            "copays": {
                "primary": pcp["mode"],
                "specialist": spec["mode"],
                "rx": "$10/$40/$80",
            },
            "features": [
                "Telehealth",
                "Preventive care",
                "Emergency services",
                "Lab work",
                "Mental health",
            ],
            "gradient": "linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)",
            "accent": "#0ea5e9",
            "riskDrivers": ["Moderate premium", "Large network"],
        },
        {
            "planId": f"{zip_code}-gold",
            "planType": "Gold",
            "name": f"BlueCross Gold Plus ({zip_code})",
            "provider": "BlueCross",
            "premium": 580,
            "deductible": 500,
            "oopMax": 3500,
            "networkSize": "40,000+ providers",
            "copays": {
                "primary": pcp["min"],
                "specialist": spec["min"],
                "rx": "$5/$25/$50",
            },
            "features": [
                "Telehealth",
                "Preventive care",
                "Emergency services",
                "Lab work",
                "Mental health",
                "Dental & Vision",
            ],
            "gradient": "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
            "accent": "#f59e0b",
            "riskDrivers": ["High premium", "Low out-of-pocket risk"],
        },
    ]


# ── Route ─────────────────────────────────────────────────────────────────────


@app.get("/api/plans")
async def get_plans(
    zip: str = Query(..., min_length=5, max_length=5, description="5-digit US ZIP code"),
):
    """
    Return three plan tiers with CMS-derived copay data for the given ZIP code.
    """
    zip_code = zip.strip()
    if not zip_code.isdigit():
        raise HTTPException(status_code=400, detail="zip must be a 5-digit US ZIP code")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            pcp, spec = await asyncio.gather(
                _fetch_copays(client, _CMS_PCP_RESOURCE_ID, zip_code),
                _fetch_copays(client, _CMS_SPEC_RESOURCE_ID, zip_code),
            )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"CMS API unavailable: {exc}")

    if pcp is None or spec is None:
        raise HTTPException(
            status_code=404,
            detail=f"No CMS cost data found for ZIP: {zip_code}",
        )

    return _build_plans(zip_code, pcp, spec)


@app.post("/api/chat/session")
async def create_chat_session():
    return CHATBOT_CONTROLLER.create_session()


@app.post("/api/chat/{session_id}/acknowledge-disclaimer")
async def acknowledge_disclaimer(
    session_id: str,
    request: AcknowledgeDisclaimerRequest,
):
    if not request.acknowledged:
        raise HTTPException(
            status_code=400,
            detail={
                "errorCode": INVALID_REQUEST,
                "message": "Disclaimer acknowledgement must be true.",
            },
        )
    return _response_or_error(CHATBOT_CONTROLLER.acknowledge_disclaimer(session_id))


@app.post("/api/chat/{session_id}/messages")
async def submit_chat_message(
    session_id: str,
    request: SubmitMessageRequest,
):
    return _response_or_error(
        CHATBOT_CONTROLLER.submit_message(
            session_id=session_id,
            message=request.message,
            context=request.context,
        )
    )
