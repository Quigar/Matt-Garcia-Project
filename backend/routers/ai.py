from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import json
import models
from database import get_db
from services.ai_service import qualify_prospect, generate_outreach_email

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatMessage(BaseModel):
    role: str
    content: str


class QualifyRequest(BaseModel):
    prospect_id: int
    session_id: Optional[int] = None
    message: Optional[str] = None


class OutreachRequest(BaseModel):
    prospect_id: int
    tone: str = "consultative"


@router.post("/qualify")
async def qualify(request: QualifyRequest, db: Session = Depends(get_db)):
    """Drive an AI qualification conversation for a prospect."""
    prospect = db.query(models.Prospect).filter(models.Prospect.id == request.prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    session = None
    if request.session_id:
        session = db.query(models.QualificationSession).filter(
            models.QualificationSession.id == request.session_id
        ).first()

    if not session:
        session = models.QualificationSession(
            prospect_id=prospect.id,
            messages=json.dumps([]),
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    history = json.loads(session.messages or "[]")

    if request.message:
        history.append({"role": "user", "content": request.message})

    prospect_context = {
        "first_name": prospect.first_name,
        "last_name": prospect.last_name,
        "company": prospect.company,
        "title": prospect.title,
        "source": prospect.source,
    }

    result = await qualify_prospect(prospect_context, history)
    history.append({"role": "assistant", "content": result["message"]})
    session.messages = json.dumps(history)

    if result.get("qualification_result"):
        qr = result["qualification_result"]
        session.qualification_score = qr.get("score")
        session.qualification_summary = qr.get("summary")
        session.recommended_action = qr.get("recommended_action")
        session.completed = True

        prospect.lead_score = qr.get("score", prospect.lead_score)
        extracted = qr.get("extracted_data", {})
        if extracted.get("agency_size"):
            prospect.agency_size = extracted["agency_size"]
        if extracted.get("lines_of_business"):
            prospect.lines_of_business = extracted["lines_of_business"]
        if extracted.get("current_tech_stack"):
            prospect.current_tech_stack = extracted["current_tech_stack"]
        if extracted.get("annual_premium_volume"):
            prospect.annual_premium_volume = extracted["annual_premium_volume"]
        if extracted.get("num_producers"):
            prospect.num_producers = extracted["num_producers"]
        if extracted.get("has_ops_team") is not None:
            prospect.has_ops_team = extracted["has_ops_team"]

        action = qr.get("recommended_action")
        if action == "set_appointment":
            prospect.status = models.ProspectStatus.qualified
        elif action == "disqualify":
            prospect.status = models.ProspectStatus.unqualified

    db.commit()
    db.refresh(session)

    return {
        "session_id": session.id,
        "message": result["message"],
        "history": json.loads(session.messages),
        "completed": session.completed,
        "qualification_result": result.get("qualification_result"),
    }


@router.get("/qualify/sessions/{prospect_id}")
def get_qualification_sessions(prospect_id: int, db: Session = Depends(get_db)):
    sessions = db.query(models.QualificationSession).filter(
        models.QualificationSession.prospect_id == prospect_id
    ).order_by(models.QualificationSession.created_at.desc()).all()

    return [
        {
            "id": s.id,
            "qualification_score": s.qualification_score,
            "qualification_summary": s.qualification_summary,
            "recommended_action": s.recommended_action,
            "completed": s.completed,
            "message_count": len(json.loads(s.messages or "[]")),
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sessions
    ]


@router.post("/outreach")
async def generate_outreach(request: OutreachRequest, db: Session = Depends(get_db)):
    """Generate a personalized outreach email for a prospect."""
    prospect = db.query(models.Prospect).filter(models.Prospect.id == request.prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    if prospect.opt_out:
        raise HTTPException(status_code=400, detail="Prospect has opted out of communications")

    prospect_data = {
        "first_name": prospect.first_name,
        "last_name": prospect.last_name,
        "company": prospect.company,
        "title": prospect.title,
        "agency_size": prospect.agency_size,
        "lines_of_business": prospect.lines_of_business,
        "current_tech_stack": prospect.current_tech_stack,
    }

    result = await generate_outreach_email(prospect_data, request.tone)

    log = models.OutreachLog(
        prospect_id=prospect.id,
        channel="email",
        direction="outbound",
        subject=result["subject"],
        body=result["body"],
        ai_generated=True,
    )
    db.add(log)
    db.commit()

    return {
        "prospect_id": prospect.id,
        "subject": result["subject"],
        "body": result["body"],
        "log_id": log.id,
    }


@router.get("/outreach/logs/{prospect_id}")
def get_outreach_logs(prospect_id: int, db: Session = Depends(get_db)):
    logs = db.query(models.OutreachLog).filter(
        models.OutreachLog.prospect_id == prospect_id
    ).order_by(models.OutreachLog.sent_at.desc()).all()

    return [
        {
            "id": l.id,
            "channel": l.channel,
            "direction": l.direction,
            "subject": l.subject,
            "body": l.body,
            "ai_generated": l.ai_generated,
            "sent_at": l.sent_at.isoformat() if l.sent_at else None,
            "opened": l.opened,
            "replied": l.replied,
        }
        for l in logs
    ]
