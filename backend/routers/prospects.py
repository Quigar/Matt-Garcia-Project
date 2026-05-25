from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from typing import Optional
import models
from database import get_db
from services.ai_service import score_lead

router = APIRouter(prefix="/api/prospects", tags=["prospects"])


class ProspectCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    product_focus: Optional[str] = None
    captive_or_independent: Optional[str] = None
    imo_fmo_affiliation: Optional[str] = None
    carrier_appointments: Optional[int] = None
    annual_life_premium: Optional[float] = None
    avg_case_size: Optional[float] = None
    has_admin_support: Optional[bool] = False
    production_tier: Optional[str] = None
    pain_points: Optional[str] = None
    current_tech_stack: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None


class ProspectUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    product_focus: Optional[str] = None
    captive_or_independent: Optional[str] = None
    imo_fmo_affiliation: Optional[str] = None
    carrier_appointments: Optional[int] = None
    annual_life_premium: Optional[float] = None
    avg_case_size: Optional[float] = None
    has_admin_support: Optional[bool] = None
    production_tier: Optional[str] = None
    pain_points: Optional[str] = None
    current_tech_stack: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    opt_out: Optional[bool] = None


@router.get("")
def list_prospects(
    status: Optional[str] = None,
    search: Optional[str] = None,
    product_focus: Optional[str] = None,
    production_tier: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(models.Prospect)

    if status:
        query = query.filter(models.Prospect.status == status)
    if product_focus:
        query = query.filter(models.Prospect.product_focus == product_focus)
    if production_tier:
        query = query.filter(models.Prospect.production_tier == production_tier)
    if search:
        query = query.filter(
            or_(
                models.Prospect.first_name.ilike(f"%{search}%"),
                models.Prospect.last_name.ilike(f"%{search}%"),
                models.Prospect.company.ilike(f"%{search}%"),
                models.Prospect.email.ilike(f"%{search}%"),
                models.Prospect.imo_fmo_affiliation.ilike(f"%{search}%"),
            )
        )

    total = query.count()
    prospects = query.order_by(models.Prospect.lead_score.desc()).offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": [_serialize_prospect(p) for p in prospects],
    }


@router.post("", status_code=201)
async def create_prospect(data: ProspectCreate, db: Session = Depends(get_db)):
    if data.email:
        existing = db.query(models.Prospect).filter(models.Prospect.email == data.email).first()
        if existing:
            raise HTTPException(status_code=409, detail="Prospect with this email already exists")

    payload = data.model_dump()

    # Auto-set production tier from annual premium if not provided
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

    # Estimate consulting deal value based on production tier
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

    return _serialize_prospect(prospect)


@router.get("/{prospect_id}")
def get_prospect(prospect_id: int, db: Session = Depends(get_db)):
    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    return _serialize_prospect(prospect)


@router.patch("/{prospect_id}")
async def update_prospect(prospect_id: int, data: ProspectUpdate, db: Session = Depends(get_db)):
    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    for field, value in update_data.items():
        setattr(prospect, field, value)

    prospect.lead_score = await score_lead({
        "annual_life_premium": prospect.annual_life_premium,
        "product_focus": prospect.product_focus,
        "captive_or_independent": prospect.captive_or_independent,
        "has_admin_support": prospect.has_admin_support,
        "carrier_appointments": prospect.carrier_appointments,
        "current_tech_stack": prospect.current_tech_stack,
    })

    db.commit()
    db.refresh(prospect)
    return _serialize_prospect(prospect)


@router.delete("/{prospect_id}", status_code=204)
def delete_prospect(prospect_id: int, db: Session = Depends(get_db)):
    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    db.delete(prospect)
    db.commit()


PRODUCT_LABELS = {
    "final_expense": "Final Expense",
    "term": "Term Life",
    "whole_life": "Whole Life",
    "iul_vul": "IUL / VUL",
    "annuities": "Annuities",
    "mixed": "Mixed",
}

TIER_LABELS = {
    "emerging": "Emerging (<$100K)",
    "growing": "Growing ($100K–$500K)",
    "established": "Established ($500K–$1M)",
    "top_producer": "Top Producer ($1M+)",
}


def _serialize_prospect(p: models.Prospect) -> dict:
    return {
        "id": p.id,
        "first_name": p.first_name,
        "last_name": p.last_name,
        "full_name": f"{p.first_name} {p.last_name}",
        "email": p.email,
        "phone": p.phone,
        "company": p.company,
        "title": p.title,
        "product_focus": p.product_focus,
        "product_focus_label": PRODUCT_LABELS.get(p.product_focus or "", p.product_focus or "—"),
        "captive_or_independent": p.captive_or_independent,
        "imo_fmo_affiliation": p.imo_fmo_affiliation,
        "carrier_appointments": p.carrier_appointments,
        "annual_life_premium": p.annual_life_premium,
        "avg_case_size": p.avg_case_size,
        "has_admin_support": p.has_admin_support,
        "production_tier": p.production_tier,
        "production_tier_label": TIER_LABELS.get(p.production_tier or "", p.production_tier or "—"),
        "pain_points": p.pain_points,
        "current_tech_stack": p.current_tech_stack,
        "status": p.status.value if p.status else None,
        "lead_score": p.lead_score,
        "source": p.source,
        "notes": p.notes,
        "opt_out": p.opt_out,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }
