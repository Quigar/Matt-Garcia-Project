from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import models
from database import get_db
from services.ai_service import analyze_pending_case, generate_case_followup

router = APIRouter(prefix="/api/cases", tags=["cases"])

# Days-stale thresholds per status before risk escalates
STALE_THRESHOLDS = {
    "submitted": 3,
    "pending": 21,
    "requirements": 7,
    "approved": 14,
    "delivery": 7,
}

TERMINAL_STATUSES = {"placed", "nto", "declined", "postponed"}


class CaseCreate(BaseModel):
    prospect_id: int
    client_name: str
    client_age: Optional[int] = None
    carrier: str
    product_type: Optional[str] = None
    face_amount: Optional[float] = None
    annual_premium: Optional[float] = None
    carrier_case_number: Optional[str] = None
    submitted_at: Optional[datetime] = None
    next_followup_date: Optional[datetime] = None
    requirements_outstanding: Optional[str] = None
    notes: Optional[str] = None


class CaseUpdate(BaseModel):
    client_name: Optional[str] = None
    client_age: Optional[int] = None
    carrier: Optional[str] = None
    product_type: Optional[str] = None
    face_amount: Optional[float] = None
    annual_premium: Optional[float] = None
    carrier_case_number: Optional[str] = None
    status: Optional[str] = None
    submitted_at: Optional[datetime] = None
    next_followup_date: Optional[datetime] = None
    requirements_outstanding: Optional[str] = None
    notes: Optional[str] = None


def _days_in_status(case: models.PendingCase) -> int:
    ref = case.status_updated_at or case.created_at
    if not ref:
        return 0
    now = datetime.now(timezone.utc)
    if ref.tzinfo is None:
        ref = ref.replace(tzinfo=timezone.utc)
    return (now - ref).days


def _is_stale(case: models.PendingCase) -> bool:
    status = case.status.value if case.status else ""
    if status in TERMINAL_STATUSES:
        return False
    threshold = STALE_THRESHOLDS.get(status)
    if threshold is None:
        return False
    return _days_in_status(case) > threshold


def _serialize_case(c: models.PendingCase) -> dict:
    days = _days_in_status(c)
    stale = _is_stale(c)
    return {
        "id": c.id,
        "prospect_id": c.prospect_id,
        "agent_name": f"{c.prospect.first_name} {c.prospect.last_name}" if c.prospect else None,
        "agent_company": c.prospect.company if c.prospect else None,
        "client_name": c.client_name,
        "client_age": c.client_age,
        "carrier": c.carrier,
        "product_type": c.product_type,
        "face_amount": c.face_amount,
        "annual_premium": c.annual_premium,
        "carrier_case_number": c.carrier_case_number,
        "status": c.status.value if c.status else None,
        "submitted_at": c.submitted_at.isoformat() if c.submitted_at else None,
        "status_updated_at": c.status_updated_at.isoformat() if c.status_updated_at else None,
        "next_followup_date": c.next_followup_date.isoformat() if c.next_followup_date else None,
        "requirements_outstanding": c.requirements_outstanding,
        "days_in_status": days,
        "is_stale": stale,
        "stale_threshold": STALE_THRESHOLDS.get(c.status.value if c.status else "", None),
        "ai_risk_level": c.ai_risk_level,
        "ai_risk_reason": c.ai_risk_reason,
        "ai_recommended_action": c.ai_recommended_action,
        "ai_analyzed_at": c.ai_analyzed_at.isoformat() if c.ai_analyzed_at else None,
        "notes": c.notes,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


@router.get("")
def list_cases(
    prospect_id: Optional[int] = None,
    status: Optional[str] = None,
    stale_only: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(models.PendingCase)
    if prospect_id:
        query = query.filter(models.PendingCase.prospect_id == prospect_id)
    if status:
        query = query.filter(models.PendingCase.status == status)

    cases = query.order_by(models.PendingCase.status_updated_at.asc()).all()

    if stale_only:
        cases = [c for c in cases if _is_stale(c)]

    return [_serialize_case(c) for c in cases]


@router.get("/metrics")
def get_case_metrics(db: Session = Depends(get_db)):
    all_cases = db.query(models.PendingCase).all()
    active = [c for c in all_cases if c.status and c.status.value not in TERMINAL_STATUSES]
    stale = [c for c in active if _is_stale(c)]
    in_requirements = [c for c in active if c.status == models.CaseStatus.requirements]

    placed = sum(1 for c in all_cases if c.status == models.CaseStatus.placed)
    nto = sum(1 for c in all_cases if c.status == models.CaseStatus.nto)
    declined = sum(1 for c in all_cases if c.status == models.CaseStatus.declined)
    terminal = placed + nto + declined
    placement_rate = round((placed / terminal * 100) if terminal > 0 else 0, 1)

    total_placed_premium = sum(
        (c.annual_premium or 0) for c in all_cases if c.status == models.CaseStatus.placed
    )
    active_premium = sum((c.annual_premium or 0) for c in active)

    critical = [c for c in active if c.ai_risk_level == "critical"]
    high_risk = [c for c in active if c.ai_risk_level in ("high", "critical")]

    by_status = {}
    for s in models.CaseStatus:
        count = sum(1 for c in all_cases if c.status == s)
        if count:
            by_status[s.value] = count

    return {
        "total_active": len(active),
        "total_cases": len(all_cases),
        "stale_cases": len(stale),
        "in_requirements": len(in_requirements),
        "critical_cases": len(critical),
        "high_risk_cases": len(high_risk),
        "placement_rate": placement_rate,
        "placed_count": placed,
        "nto_count": nto,
        "declined_count": declined,
        "total_placed_premium": total_placed_premium,
        "active_premium_at_risk": active_premium,
        "by_status": by_status,
    }


@router.post("", status_code=201)
def create_case(data: CaseCreate, db: Session = Depends(get_db)):
    prospect = db.query(models.Prospect).filter(models.Prospect.id == data.prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Agent (prospect) not found")

    case = models.PendingCase(**data.model_dump())
    if not case.submitted_at:
        case.submitted_at = datetime.now(timezone.utc)
    db.add(case)
    db.commit()
    db.refresh(case)
    return _serialize_case(case)


@router.get("/{case_id}")
def get_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(models.PendingCase).filter(models.PendingCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return _serialize_case(case)


@router.patch("/{case_id}")
def update_case(case_id: int, data: CaseUpdate, db: Session = Depends(get_db)):
    case = db.query(models.PendingCase).filter(models.PendingCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    old_status = case.status

    for field, value in update_data.items():
        setattr(case, field, value)

    # Reset the status clock whenever status changes
    if "status" in update_data and update_data["status"] != (old_status.value if old_status else None):
        case.status_updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(case)
    return _serialize_case(case)


@router.delete("/{case_id}", status_code=204)
def delete_case(case_id: int, db: Session = Depends(get_db)):
    case = db.query(models.PendingCase).filter(models.PendingCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    db.delete(case)
    db.commit()


@router.post("/{case_id}/analyze")
async def analyze_case(case_id: int, db: Session = Depends(get_db)):
    """Run AI risk analysis on a pending case and persist the result."""
    case = db.query(models.PendingCase).filter(models.PendingCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    days = _days_in_status(case)
    case_dict = {
        "client_name": case.client_name,
        "client_age": case.client_age,
        "carrier": case.carrier,
        "product_type": case.product_type,
        "face_amount": case.face_amount,
        "annual_premium": case.annual_premium,
        "status": case.status.value if case.status else None,
        "requirements_outstanding": case.requirements_outstanding,
        "notes": case.notes,
    }

    result = await analyze_pending_case(case_dict, days)

    case.ai_risk_level = result.get("risk_level")
    case.ai_risk_reason = result.get("risk_reason")
    case.ai_recommended_action = result.get("recommended_action")
    case.ai_analyzed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(case)

    return {**_serialize_case(case), "estimated_days_to_resolution": result.get("estimated_days_to_resolution")}


@router.post("/{case_id}/followup")
async def generate_followup(case_id: int, db: Session = Depends(get_db)):
    """Generate a check-in message for the agent about this case."""
    case = db.query(models.PendingCase).filter(models.PendingCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case_dict = _serialize_case(case)
    agent_dict = {
        "first_name": case.prospect.first_name if case.prospect else "",
        "last_name": case.prospect.last_name if case.prospect else "",
    }

    message = await generate_case_followup(case_dict, agent_dict)
    return {"message": message, "case_id": case_id}


@router.get("/agent/{prospect_id}/summary")
def agent_case_summary(prospect_id: int, db: Session = Depends(get_db)):
    """Return a quick stats summary for one agent's cases."""
    cases = db.query(models.PendingCase).filter(models.PendingCase.prospect_id == prospect_id).all()
    active = [c for c in cases if c.status and c.status.value not in TERMINAL_STATUSES]
    return {
        "total": len(cases),
        "active": len(active),
        "stale": sum(1 for c in active if _is_stale(c)),
        "in_requirements": sum(1 for c in active if c.status == models.CaseStatus.requirements),
        "placed": sum(1 for c in cases if c.status == models.CaseStatus.placed),
        "active_premium": sum((c.annual_premium or 0) for c in active),
    }
