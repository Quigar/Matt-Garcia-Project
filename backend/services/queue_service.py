"""
Automated follow-up queue service.

check_and_queue_stale_cases() is called by the APScheduler job every hour.
For each active, stale case that does not already have a pending queue item,
it generates an AI follow-up message and creates a FollowupQueueItem.
"""
import logging
from datetime import datetime, timezone

from database import SessionLocal
import models
from services.ai_service import generate_case_followup

logger = logging.getLogger(__name__)

STALE_THRESHOLDS = {
    "submitted": 3,
    "pending": 21,
    "requirements": 7,
    "approved": 14,
    "delivery": 7,
}

TERMINAL_STATUSES = {"placed", "nto", "declined", "postponed"}


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


async def check_and_queue_stale_cases() -> dict:
    """
    Scan all active cases for staleness. For each stale case with no pending
    queue item, generate an AI follow-up message and enqueue it.
    Returns a summary dict.
    """
    db = SessionLocal()
    queued = 0
    skipped_existing = 0
    errors = 0

    try:
        active_cases = (
            db.query(models.PendingCase)
            .join(models.Prospect)
            .filter(models.Prospect.opt_out == False)
            .all()
        )

        for case in active_cases:
            if not _is_stale(case):
                continue

            # Skip if a pending item already exists for this case
            existing = (
                db.query(models.FollowupQueueItem)
                .filter(
                    models.FollowupQueueItem.case_id == case.id,
                    models.FollowupQueueItem.status == models.QueueStatus.pending,
                )
                .first()
            )
            if existing:
                skipped_existing += 1
                continue

            days = _days_in_status(case)
            threshold = STALE_THRESHOLDS.get(case.status.value if case.status else "", "?")
            trigger_reason = (
                f"{case.status.value} stale {days}d (threshold: {threshold}d)"
            )

            case_dict = {
                "client_name": case.client_name,
                "carrier": case.carrier,
                "product_type": case.product_type,
                "status": case.status.value if case.status else None,
                "days_in_status": days,
                "requirements_outstanding": case.requirements_outstanding,
                "ai_recommended_action": case.ai_recommended_action,
            }
            agent_dict = {
                "first_name": case.prospect.first_name if case.prospect else "",
                "last_name": case.prospect.last_name if case.prospect else "",
            }

            try:
                message = await generate_case_followup(case_dict, agent_dict)
            except Exception as exc:
                logger.warning("AI message generation failed for case %d: %s", case.id, exc)
                # Fallback template so the queue item still gets created
                message = (
                    f"Hi {agent_dict['first_name']}, just checking in on {case.client_name}'s "
                    f"{case.product_type or 'life'} case with {case.carrier}. "
                    f"It's been {days} days in {case.status.value} status"
                    + (f" — outstanding requirements: {case.requirements_outstanding}." if case.requirements_outstanding else ".")
                    + " Let me know if you need anything to move this forward."
                )
                errors += 1

            item = models.FollowupQueueItem(
                case_id=case.id,
                prospect_id=case.prospect_id,
                message=message,
                trigger_reason=trigger_reason,
                status=models.QueueStatus.pending,
                triggered_at=datetime.now(timezone.utc),
            )
            db.add(item)
            queued += 1
            logger.info("Queued follow-up for case %d (%s / %s)", case.id, case.client_name, case.carrier)

        if queued:
            db.commit()

    except Exception as exc:
        logger.error("queue check failed: %s", exc)
        db.rollback()
    finally:
        db.close()

    summary = {
        "queued": queued,
        "skipped_existing": skipped_existing,
        "errors": errors,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }
    logger.info("Stale case check complete: %s", summary)
    return summary
