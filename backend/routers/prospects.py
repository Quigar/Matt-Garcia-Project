from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
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
    agency_size: Optional[str] = None
    lines_of_business: Optional[str] = None
    current_tech_stack: Optional[str] = None
    annual_premium_volume: Optional[float] = None
    num_producers: Optional[int] = None
    has_ops_team: Optional[bool] = False
    source: Optional[str] = None
    notes: Optional[str] = None


class ProspectUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    agency_size: Optional[str] = None
    lines_of_business: Optional[str] = None
    current_tech_stack: Optional[str] = None
    annual_premium_volume: Optional[float] = None
    num_producers: Optional[int] = None
    has_ops_team: Optional[bool] = None
    status: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    opt_out: Optional[bool] = None


@router.get("")
def list_prospects(
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(models.Prospect)

    if status:
        query = query.filter(models.Prospect.status == status)

    if search:
        query = query.filter(
            or_(
                models.Prospect.first_name.ilike(f"%{search}%"),
                models.Prospect.last_name.ilike(f"%{search}%"),
                models.Prospect.company.ilike(f"%{search}%"),
                models.Prospect.email.ilike(f"%{search}%"),
            )
        )

    total = query.count()
    prospects = query.order_by(models.Prospect.created_at.desc()).offset(skip).limit(limit).all()

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

    prospect = models.Prospect(**data.model_dump())
    prospect.lead_score = await score_lead(data.model_dump())
    db.add(prospect)
    db.commit()
    db.refresh(prospect)

    pipeline = models.PipelineEntry(
        prospect_id=prospect.id,
        stage=models.PipelineStage.lead,
        deal_value=2500 * 12,
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
        "annual_premium_volume": prospect.annual_premium_volume,
        "num_producers": prospect.num_producers,
        "lines_of_business": prospect.lines_of_business,
        "has_ops_team": prospect.has_ops_team,
        "title": prospect.title,
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
        "agency_size": p.agency_size,
        "lines_of_business": p.lines_of_business,
        "current_tech_stack": p.current_tech_stack,
        "annual_premium_volume": p.annual_premium_volume,
        "num_producers": p.num_producers,
        "has_ops_team": p.has_ops_team,
        "status": p.status.value if p.status else None,
        "lead_score": p.lead_score,
        "source": p.source,
        "notes": p.notes,
        "opt_out": p.opt_out,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }
