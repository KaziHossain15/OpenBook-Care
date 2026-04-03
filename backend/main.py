"""
FastAPI backend for OpenBook Care.

Endpoint: GET /api/plans?zip=<5-digit-zip>
  - Calls two CMS specialty cost datasets via the public DKAN datastore API
    (no API key required).
  - Returns a JSON array shaped to match the Plan interface in ComparePlans.tsx.
  - Returns HTTP 503 if the CMS API is unreachable so the frontend can fall
    back to its hardcoded plans.

Datasets (distribution UUIDs retrieved 2026-04-03):
  bb4c-dcdf  Family Practice Office Visit Costs
    → distribution: c31e250c-cc6b-5e78-82d5-7e88bb3c1d3c
    https://data.cms.gov/provider-data/dataset/bb4c-dcdf

  9735-7176  Internal Medicine Office Visit Costs
    → distribution: aeeaa1c0-c717-549b-8f11-752491183057
    https://data.cms.gov/provider-data/dataset/9735-7176

  If CMS rotates a UUID, re-fetch with:
    curl "https://data.cms.gov/provider-data/api/1/metastore/schemas/dataset/items/<dataset-id>?show-reference-ids=true"
  and update _CMS_PCP_RESOURCE_ID / _CMS_SPEC_RESOURCE_ID below.

To run:
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
"""

import asyncio

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="OpenBook Care API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

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
