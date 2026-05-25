from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import models
from database import get_db

router = APIRouter(prefix="/api/leads", tags=["consumer-leads"])

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")

PRODUCT_LABELS = {
    "term": "Term Life",
    "whole_life": "Whole Life",
    "final_expense": "Final Expense",
    "iul": "IUL / VUL",
    "annuity": "Annuity",
}

HEALTH_LABELS = {
    "excellent": "Excellent",
    "good": "Good",
    "fair": "Fair",
    "poor": "Poor",
}

SOURCE_LABELS = {
    "web_form": "Web Form",
    "facebook": "Facebook",
    "purchased": "Purchased",
    "webhook": "Webhook",
    "referral": "Referral",
    "manual": "Manual",
}


class ConsumerLeadCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    product_type: Optional[str] = None
    coverage_amount: Optional[float] = None
    monthly_budget: Optional[float] = None
    health_class: Optional[str] = None
    tobacco_user: Optional[bool] = False
    source: Optional[str] = "manual"
    source_campaign: Optional[str] = None
    notes: Optional[str] = None


class ConsumerLeadUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to_prospect_id: Optional[int] = None
    product_type: Optional[str] = None
    coverage_amount: Optional[float] = None
    monthly_budget: Optional[float] = None
    health_class: Optional[str] = None
    notes: Optional[str] = None


@router.get("")
def list_leads(
    status: Optional[str] = None,
    product_type: Optional[str] = None,
    state: Optional[str] = None,
    assigned: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    from sqlalchemy import or_
    query = db.query(models.ConsumerLead)

    if status:
        query = query.filter(models.ConsumerLead.status == status)
    if product_type:
        query = query.filter(models.ConsumerLead.product_type == product_type)
    if state:
        query = query.filter(models.ConsumerLead.state == state)
    if assigned is not None:
        if assigned:
            query = query.filter(models.ConsumerLead.assigned_to_prospect_id.isnot(None))
        else:
            query = query.filter(models.ConsumerLead.assigned_to_prospect_id.is_(None))
    if search:
        query = query.filter(
            or_(
                models.ConsumerLead.first_name.ilike(f"%{search}%"),
                models.ConsumerLead.last_name.ilike(f"%{search}%"),
                models.ConsumerLead.email.ilike(f"%{search}%"),
                models.ConsumerLead.phone.ilike(f"%{search}%"),
                models.ConsumerLead.state.ilike(f"%{search}%"),
            )
        )

    total = query.count()
    leads = query.order_by(models.ConsumerLead.created_at.desc()).offset(skip).limit(limit).all()

    return {"total": total, "items": [_serialize(l) for l in leads]}


@router.get("/metrics")
def lead_metrics(db: Session = Depends(get_db)):
    total = db.query(models.ConsumerLead).count()
    new = db.query(models.ConsumerLead).filter(models.ConsumerLead.status == "new").count()
    assigned = db.query(models.ConsumerLead).filter(
        models.ConsumerLead.assigned_to_prospect_id.isnot(None)
    ).count()
    converted = db.query(models.ConsumerLead).filter(models.ConsumerLead.status == "converted").count()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_new = db.query(models.ConsumerLead).filter(
        models.ConsumerLead.created_at >= today_start
    ).count()

    by_product = {}
    for pt in ["term", "whole_life", "final_expense", "iul", "annuity"]:
        by_product[pt] = db.query(models.ConsumerLead).filter(
            models.ConsumerLead.product_type == pt
        ).count()

    by_source = {}
    rows = (
        db.query(models.ConsumerLead.source, sqlfunc.count(models.ConsumerLead.id))
        .group_by(models.ConsumerLead.source)
        .all()
    )
    for src, cnt in rows:
        by_source[src or "unknown"] = cnt

    return {
        "total": total,
        "new": new,
        "assigned": assigned,
        "converted": converted,
        "today_new": today_new,
        "conversion_rate": round(converted / total * 100, 1) if total else 0,
        "by_product": by_product,
        "by_source": by_source,
    }


@router.post("", status_code=201)
def create_lead(data: ConsumerLeadCreate, db: Session = Depends(get_db)):
    payload = data.model_dump()
    payload["quality_score"] = _score(payload)
    lead = models.ConsumerLead(**payload)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return _serialize(lead)


@router.get("/{lead_id}")
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(models.ConsumerLead).filter(models.ConsumerLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return _serialize(lead)


@router.patch("/{lead_id}")
def update_lead(lead_id: int, data: ConsumerLeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(models.ConsumerLead).filter(models.ConsumerLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}

    if update_data.get("assigned_to_prospect_id"):
        agent = db.query(models.Prospect).filter(
            models.Prospect.id == update_data["assigned_to_prospect_id"]
        ).first()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        lead.assigned_at = datetime.now(timezone.utc)
        if lead.status == models.ConsumerLeadStatus.new:
            lead.status = models.ConsumerLeadStatus.assigned

    for field, value in update_data.items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)
    return _serialize(lead)


@router.delete("/{lead_id}", status_code=204)
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(models.ConsumerLead).filter(models.ConsumerLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()


@router.post("/intake", status_code=201)
def public_consumer_intake(data: ConsumerLeadCreate, db: Session = Depends(get_db)):
    """Public-facing consumer quote-request form."""
    payload = data.model_dump()
    payload["source"] = "web_form"
    payload["quality_score"] = _score(payload)
    lead = models.ConsumerLead(**payload)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return {"status": "received", "reference": f"CLT-{lead.id:04d}"}


@router.post("/webhook", status_code=201)
async def webhook_consumer_intake(
    request: Request,
    db: Session = Depends(get_db),
    x_webhook_secret: Optional[str] = Header(None),
):
    """Accepts leads from Facebook Lead Ads, Zapier, purchased lead vendors, etc."""
    if WEBHOOK_SECRET and x_webhook_secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    raw = await request.json()
    payload = _normalize_webhook(raw)
    payload["source"] = payload.get("source") or "webhook"
    payload["quality_score"] = _score(payload)

    valid_fields = {c.name for c in models.ConsumerLead.__table__.columns}
    clean = {k: v for k, v in payload.items() if k in valid_fields and v is not None}

    if not clean.get("first_name"):
        raise HTTPException(status_code=422, detail="first_name required")

    lead = models.ConsumerLead(**clean)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return {"status": "created", "lead_id": lead.id, "reference": f"CLT-{lead.id:04d}"}


# ── helpers ────────────────────────────────────────────────────────────────────

def _score(lead: dict) -> int:
    score = 50

    age = lead.get("age") or 0
    if 30 <= age <= 55:
        score += 20
    elif 25 <= age <= 65:
        score += 10

    if lead.get("product_type") in ("iul", "whole_life", "annuity"):
        score += 15
    elif lead.get("product_type") == "term":
        score += 8

    hc = lead.get("health_class") or ""
    if hc == "excellent":
        score += 10
    elif hc == "good":
        score += 5

    budget = lead.get("monthly_budget") or 0
    if budget >= 300:
        score += 10
    elif budget >= 150:
        score += 5

    coverage = lead.get("coverage_amount") or 0
    if coverage >= 500_000:
        score += 10
    elif coverage >= 250_000:
        score += 5

    if lead.get("tobacco_user"):
        score -= 10

    return max(0, min(100, score))


def _normalize_webhook(raw: dict) -> dict:
    normalized = {}

    for full_key in ("full_name", "name"):
        if full_key in raw and "first_name" not in raw:
            parts = str(raw[full_key]).strip().split(" ", 1)
            normalized["first_name"] = parts[0]
            normalized["last_name"] = parts[1] if len(parts) > 1 else ""
            break

    ALIASES = {
        "fname": "first_name",
        "lname": "last_name",
        "phone_number": "phone",
        "mobile": "phone",
        "email_address": "email",
        "coverage": "coverage_amount",
        "face_amount": "coverage_amount",
        "face_value": "coverage_amount",
        "budget": "monthly_budget",
        "monthly_premium": "monthly_budget",
        "product": "product_type",
        "insurance_type": "product_type",
        "health": "health_class",
        "health_status": "health_class",
        "smoker": "tobacco_user",
        "tobacco": "tobacco_user",
        "campaign": "source_campaign",
        "utm_campaign": "source_campaign",
    }

    for key, value in raw.items():
        canonical = ALIASES.get(key.lower(), key.lower())
        if canonical not in normalized:
            normalized[canonical] = value

    return normalized


def _serialize(l: models.ConsumerLead) -> dict:
    agent = None
    if l.assigned_agent:
        agent = {
            "id": l.assigned_agent.id,
            "full_name": f"{l.assigned_agent.first_name} {l.assigned_agent.last_name}",
            "email": l.assigned_agent.email,
        }
    return {
        "id": l.id,
        "first_name": l.first_name,
        "last_name": l.last_name,
        "full_name": f"{l.first_name} {l.last_name}",
        "email": l.email,
        "phone": l.phone,
        "age": l.age,
        "state": l.state,
        "zip_code": l.zip_code,
        "product_type": l.product_type,
        "product_type_label": PRODUCT_LABELS.get(l.product_type or "", l.product_type or "—"),
        "coverage_amount": l.coverage_amount,
        "monthly_budget": l.monthly_budget,
        "health_class": l.health_class,
        "health_class_label": HEALTH_LABELS.get(l.health_class or "", l.health_class or "—"),
        "tobacco_user": l.tobacco_user,
        "source": l.source,
        "source_label": SOURCE_LABELS.get(l.source or "", l.source or "—"),
        "source_campaign": l.source_campaign,
        "status": l.status.value if l.status else "new",
        "assigned_to_prospect_id": l.assigned_to_prospect_id,
        "assigned_agent": agent,
        "assigned_at": l.assigned_at.isoformat() if l.assigned_at else None,
        "quality_score": l.quality_score,
        "notes": l.notes,
        "created_at": l.created_at.isoformat() if l.created_at else None,
        "updated_at": l.updated_at.isoformat() if l.updated_at else None,
    }
