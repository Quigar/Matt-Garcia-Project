from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import models
from database import get_db
from services.ai_service import get_pipeline_recommendations

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


class PipelineUpdate(BaseModel):
    stage: Optional[str] = None
    deal_value: Optional[float] = None
    probability: Optional[float] = None
    expected_close_date: Optional[datetime] = None
    notes: Optional[str] = None


STAGE_DEFAULT_PROBABILITY = {
    "lead": 0.05,
    "qualified": 0.15,
    "discovery_call": 0.25,
    "demo": 0.45,
    "proposal": 0.65,
    "contracting": 0.85,
    "closed_won": 1.0,
    "closed_lost": 0.0,
}


@router.get("")
def get_pipeline(db: Session = Depends(get_db)):
    entries = (
        db.query(models.PipelineEntry)
        .join(models.Prospect)
        .filter(models.Prospect.opt_out == False)
        .all()
    )

    stages = {}
    for stage in models.PipelineStage:
        stages[stage.value] = {"stage": stage.value, "deals": [], "total_value": 0, "count": 0}

    for entry in entries:
        stage_key = entry.stage.value if entry.stage else "lead"
        stages[stage_key]["deals"].append(_serialize_entry(entry))
        stages[stage_key]["total_value"] += entry.deal_value or 0
        stages[stage_key]["count"] += 1

    total_weighted = sum(
        e.deal_value * e.probability for e in entries if e.deal_value and e.probability
    )
    total_pipeline = sum(e.deal_value for e in entries if e.deal_value)

    return {
        "stages": list(stages.values()),
        "summary": {
            "total_deals": len(entries),
            "total_pipeline_value": total_pipeline,
            "weighted_pipeline_value": total_weighted,
            "active_deals": len([e for e in entries if e.stage not in [
                models.PipelineStage.closed_won, models.PipelineStage.closed_lost
            ]]),
        },
    }


@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)):
    total_prospects = db.query(models.Prospect).count()
    qualified = db.query(models.Prospect).filter(
        models.Prospect.status == models.ProspectStatus.qualified
    ).count()
    appointments_scheduled = db.query(models.Appointment).filter(
        models.Appointment.status.in_(["scheduled", "confirmed"])
    ).count()
    closed_won = db.query(models.PipelineEntry).filter(
        models.PipelineEntry.stage == models.PipelineStage.closed_won
    ).count()
    closed_lost = db.query(models.PipelineEntry).filter(
        models.PipelineEntry.stage == models.PipelineStage.closed_lost
    ).count()

    won_revenue = db.query(func.sum(models.PipelineEntry.deal_value)).filter(
        models.PipelineEntry.stage == models.PipelineStage.closed_won
    ).scalar() or 0

    pipeline_value = db.query(func.sum(models.PipelineEntry.deal_value)).filter(
        models.PipelineEntry.stage.notin_([
            models.PipelineStage.closed_won, models.PipelineStage.closed_lost
        ])
    ).scalar() or 0

    avg_score = db.query(func.avg(models.Prospect.lead_score)).scalar() or 0
    win_rate = (closed_won / (closed_won + closed_lost) * 100) if (closed_won + closed_lost) > 0 else 0

    # Production tier breakdown
    tiers = {}
    for tier in ["emerging", "growing", "established", "top_producer"]:
        tiers[tier] = db.query(models.Prospect).filter(
            models.Prospect.production_tier == tier
        ).count()

    return {
        "total_prospects": total_prospects,
        "qualified_prospects": qualified,
        "appointments_scheduled": appointments_scheduled,
        "closed_won": closed_won,
        "closed_lost": closed_lost,
        "win_rate": round(win_rate, 1),
        "won_revenue": won_revenue,
        "active_pipeline_value": pipeline_value,
        "avg_lead_score": round(avg_score, 1),
        "production_tier_breakdown": tiers,
    }


@router.get("/{entry_id}")
def get_pipeline_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.PipelineEntry).filter(models.PipelineEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Pipeline entry not found")
    return _serialize_entry(entry)


@router.patch("/{entry_id}")
def update_pipeline_entry(entry_id: int, data: PipelineUpdate, db: Session = Depends(get_db)):
    entry = db.query(models.PipelineEntry).filter(models.PipelineEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Pipeline entry not found")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "stage" in update_data and "probability" not in update_data:
        update_data["probability"] = STAGE_DEFAULT_PROBABILITY.get(update_data["stage"], entry.probability)

    for field, value in update_data.items():
        setattr(entry, field, value)

    db.commit()
    db.refresh(entry)
    return _serialize_entry(entry)


@router.get("/{entry_id}/recommendations")
async def get_recommendations(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.PipelineEntry).filter(models.PipelineEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Pipeline entry not found")

    prospect_data = {
        "first_name": entry.prospect.first_name,
        "last_name": entry.prospect.last_name,
        "company": entry.prospect.company,
        "lead_score": entry.prospect.lead_score,
        "product_focus": entry.prospect.product_focus,
        "production_tier": entry.prospect.production_tier,
        "imo_fmo_affiliation": entry.prospect.imo_fmo_affiliation,
        "current_tech_stack": entry.prospect.current_tech_stack,
        "pain_points": entry.prospect.pain_points,
    }
    pipeline_data = {
        "stage": entry.stage.value if entry.stage else None,
        "deal_value": entry.deal_value,
        "probability": entry.probability,
        "notes": entry.notes,
    }

    recommendations = await get_pipeline_recommendations(pipeline_data, prospect_data)
    return {"recommendations": recommendations}


def _serialize_entry(e: models.PipelineEntry) -> dict:
    return {
        "id": e.id,
        "prospect_id": e.prospect_id,
        "prospect_name": f"{e.prospect.first_name} {e.prospect.last_name}" if e.prospect else None,
        "company": e.prospect.company if e.prospect else None,
        "product_focus": e.prospect.product_focus if e.prospect else None,
        "production_tier": e.prospect.production_tier if e.prospect else None,
        "lead_score": e.prospect.lead_score if e.prospect else 0,
        "stage": e.stage.value if e.stage else None,
        "deal_value": e.deal_value,
        "probability": e.probability,
        "weighted_value": (e.deal_value or 0) * (e.probability or 0),
        "expected_close_date": e.expected_close_date.isoformat() if e.expected_close_date else None,
        "notes": e.notes,
        "created_at": e.created_at.isoformat() if e.created_at else None,
        "updated_at": e.updated_at.isoformat() if e.updated_at else None,
    }
