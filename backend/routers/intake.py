from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os
import models
from database import get_db
from services.ai_service import score_lead

router = APIRouter(prefix="/api/intake", tags=["intake"])

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")


class AgentIntakeForm(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    product_focus: Optional[str] = None
    captive_or_independent: Optional[str] = None
    imo_fmo_affiliation: Optional[str] = None
    carrier_appointments: Optional[int] = None
    annual_life_premium: Optional[float] = None
    has_admin_support: Optional[bool] = False
    pain_points: Optional[str] = None
    current_tech_stack: Optional[str] = None


@router.post("/agent", status_code=201)
async def agent_intake_form(data: AgentIntakeForm, db: Session = Depends(get_db)):
    if data.email:
        existing = db.query(models.Prospect).filter(models.Prospect.email == data.email).first()
        if existing:
            raise HTTPException(status_code=409, detail="An agent with this email is already in our system.")

    payload = data.model_dump()
    payload["source"] = "inbound_form"

    if not payload.get("production_tier") and payload.get("annual_life_premium"):
        p = payload["annual_life_premium"]
        if p >= 1_000_000:
            payload["production_tier"] = "top_producer"
        elif p >= 500_000:
            payload["production_tier"] = "established"
        elif p >= 100_000:
            payload["production_tier"] = "growing"
        else:
            payload["production_tier"] = "emerging"

    prospect = models.Prospect(**payload)
    prospect.lead_score = await score_lead(payload)
    db.add(prospect)
    db.commit()
    db.refresh(prospect)

    tier_deal_values = {
        "top_producer": 12000,
        "established": 8400,
        "growing": 4800,
        "emerging": 3600,
    }
    deal_val = tier_deal_values.get(prospect.production_tier or "growing", 4800)
    pipeline = models.PipelineEntry(
        prospect_id=prospect.id,
        stage=models.PipelineStage.lead,
        deal_value=deal_val,
        probability=0.05,
    )
    db.add(pipeline)
    db.commit()

    return {"status": "received", "reference": f"AGT-{prospect.id:04d}"}


@router.post("/webhook", status_code=201)
async def webhook_agent_intake(
    request: Request,
    db: Session = Depends(get_db),
    x_webhook_secret: Optional[str] = Header(None),
):
    if WEBHOOK_SECRET and x_webhook_secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    raw = await request.json()
    payload = _normalize_webhook_payload(raw)

    if not payload.get("email") and not payload.get("phone"):
        raise HTTPException(status_code=422, detail="email or phone required")

    if payload.get("email"):
        existing = db.query(models.Prospect).filter(models.Prospect.email == payload["email"]).first()
        if existing:
            return {"status": "duplicate", "prospect_id": existing.id}

    payload["source"] = payload.get("source") or "webhook"

    if not payload.get("production_tier") and payload.get("annual_life_premium"):
        p = payload["annual_life_premium"]
        if p >= 1_000_000:
            payload["production_tier"] = "top_producer"
        elif p >= 500_000:
            payload["production_tier"] = "established"
        elif p >= 100_000:
            payload["production_tier"] = "growing"
        else:
            payload["production_tier"] = "emerging"

    valid_fields = {c.name for c in models.Prospect.__table__.columns}
    clean = {k: v for k, v in payload.items() if k in valid_fields and v is not None}

    if not clean.get("first_name") or not clean.get("last_name"):
        raise HTTPException(status_code=422, detail="first_name and last_name required")

    prospect = models.Prospect(**clean)
    prospect.lead_score = await score_lead(clean)
    db.add(prospect)
    db.commit()
    db.refresh(prospect)

    tier_deal_values = {
        "top_producer": 12000,
        "established": 8400,
        "growing": 4800,
        "emerging": 3600,
    }
    deal_val = tier_deal_values.get(prospect.production_tier or "growing", 4800)
    pipeline = models.PipelineEntry(
        prospect_id=prospect.id,
        stage=models.PipelineStage.lead,
        deal_value=deal_val,
        probability=0.05,
    )
    db.add(pipeline)
    db.commit()

    return {"status": "created", "prospect_id": prospect.id, "reference": f"AGT-{prospect.id:04d}"}


def _normalize_webhook_payload(raw: dict) -> dict:
    normalized = {}

    if "full_name" in raw and "first_name" not in raw:
        parts = str(raw["full_name"]).strip().split(" ", 1)
        normalized["first_name"] = parts[0]
        normalized["last_name"] = parts[1] if len(parts) > 1 else ""

    ALIASES = {
        "fname": "first_name",
        "lname": "last_name",
        "surname": "last_name",
        "phone_number": "phone",
        "mobile": "phone",
        "cell": "phone",
        "email_address": "email",
        "company_name": "company",
        "organization": "company",
        "job_title": "title",
        "position": "title",
        "imo": "imo_fmo_affiliation",
        "fmo": "imo_fmo_affiliation",
        "annual_premium": "annual_life_premium",
        "annual_production": "annual_life_premium",
        "pain_point": "pain_points",
        "challenges": "pain_points",
        "tech_stack": "current_tech_stack",
        "software": "current_tech_stack",
    }

    for key, value in raw.items():
        canonical = ALIASES.get(key.lower(), key.lower())
        if canonical not in normalized:
            normalized[canonical] = value

    return normalized
