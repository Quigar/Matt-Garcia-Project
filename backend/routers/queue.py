from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import models
from database import get_db
from services.queue_service import check_and_queue_stale_cases

router = APIRouter(prefix="/api/queue", tags=["queue"])


class QueueItemUpdate(BaseModel):
    message: Optional[str] = None
    status: Optional[str] = None


@router.get("")
def list_queue(
    status: Optional[str] = None,
    prospect_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(models.FollowupQueueItem)
    if status:
        query = query.filter(models.FollowupQueueItem.status == status)
    if prospect_id:
        query = query.filter(models.FollowupQueueItem.prospect_id == prospect_id)

    items = query.order_by(models.FollowupQueueItem.triggered_at.desc()).offset(skip).limit(limit).all()
    return [_serialize(i) for i in items]


@router.get("/metrics")
def get_queue_metrics(db: Session = Depends(get_db)):
    pending = db.query(models.FollowupQueueItem).filter(
        models.FollowupQueueItem.status == models.QueueStatus.pending
    ).count()
    sent_today = db.query(models.FollowupQueueItem).filter(
        models.FollowupQueueItem.status == models.QueueStatus.sent,
        models.FollowupQueueItem.sent_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0),
    ).count()
    dismissed = db.query(models.FollowupQueueItem).filter(
        models.FollowupQueueItem.status == models.QueueStatus.dismissed
    ).count()
    total = db.query(models.FollowupQueueItem).count()

    return {
        "pending": pending,
        "sent_today": sent_today,
        "dismissed": dismissed,
        "total": total,
    }


@router.get("/{item_id}")
def get_queue_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.FollowupQueueItem).filter(models.FollowupQueueItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    return _serialize(item)


@router.patch("/{item_id}")
def update_queue_item(item_id: int, data: QueueItemUpdate, db: Session = Depends(get_db)):
    item = db.query(models.FollowupQueueItem).filter(models.FollowupQueueItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")

    if data.message is not None:
        item.message = data.message
    if data.status is not None:
        item.status = data.status
        if data.status == "sent":
            item.sent_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(item)
    return _serialize(item)


@router.post("/{item_id}/send")
def mark_sent(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.FollowupQueueItem).filter(models.FollowupQueueItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    item.status = models.QueueStatus.sent
    item.sent_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return _serialize(item)


@router.post("/{item_id}/dismiss")
def dismiss_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.FollowupQueueItem).filter(models.FollowupQueueItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    item.status = models.QueueStatus.dismissed
    db.commit()
    db.refresh(item)
    return _serialize(item)


@router.post("/check")
async def trigger_stale_check():
    """Manually trigger the stale case check — same logic as the hourly scheduler."""
    result = await check_and_queue_stale_cases()
    return result


def _serialize(i: models.FollowupQueueItem) -> dict:
    case = i.case
    prospect = i.prospect
    return {
        "id": i.id,
        "case_id": i.case_id,
        "prospect_id": i.prospect_id,
        # Case info
        "client_name": case.client_name if case else None,
        "carrier": case.carrier if case else None,
        "product_type": case.product_type if case else None,
        "case_status": case.status.value if case and case.status else None,
        "face_amount": case.face_amount if case else None,
        "annual_premium": case.annual_premium if case else None,
        "requirements_outstanding": case.requirements_outstanding if case else None,
        "ai_risk_level": case.ai_risk_level if case else None,
        "ai_recommended_action": case.ai_recommended_action if case else None,
        # Agent info
        "agent_name": f"{prospect.first_name} {prospect.last_name}" if prospect else None,
        "agent_company": prospect.company if prospect else None,
        "agent_email": prospect.email if prospect else None,
        # Queue item
        "message": i.message,
        "trigger_reason": i.trigger_reason,
        "status": i.status.value if i.status else None,
        "triggered_at": i.triggered_at.isoformat() if i.triggered_at else None,
        "sent_at": i.sent_at.isoformat() if i.sent_at else None,
        "created_at": i.created_at.isoformat() if i.created_at else None,
    }
