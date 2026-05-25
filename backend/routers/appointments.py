from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import models
from database import get_db

router = APIRouter(prefix="/api/appointments", tags=["appointments"])


class AppointmentCreate(BaseModel):
    prospect_id: int
    employee_id: int
    title: str
    scheduled_at: datetime
    duration_minutes: int = 30
    meeting_link: Optional[str] = None
    appointment_type: str = "discovery"
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    employee_id: Optional[int] = None
    title: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    meeting_link: Optional[str] = None
    status: Optional[str] = None
    appointment_type: Optional[str] = None
    notes: Optional[str] = None
    outcome: Optional[str] = None


class EmployeeCreate(BaseModel):
    name: str
    email: str
    role: str = "sales_rep"
    calendar_link: Optional[str] = None


@router.get("")
def list_appointments(
    employee_id: Optional[int] = None,
    prospect_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Appointment)
    if employee_id:
        query = query.filter(models.Appointment.employee_id == employee_id)
    if prospect_id:
        query = query.filter(models.Appointment.prospect_id == prospect_id)
    if status:
        query = query.filter(models.Appointment.status == status)

    appointments = query.order_by(models.Appointment.scheduled_at.asc()).all()
    return [_serialize_appointment(a) for a in appointments]


@router.post("", status_code=201)
def create_appointment(data: AppointmentCreate, db: Session = Depends(get_db)):
    prospect = db.query(models.Prospect).filter(models.Prospect.id == data.prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")

    employee = db.query(models.Employee).filter(models.Employee.id == data.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    conflict = db.query(models.Appointment).filter(
        models.Appointment.employee_id == data.employee_id,
        models.Appointment.status.in_(["scheduled", "confirmed"]),
        models.Appointment.scheduled_at >= data.scheduled_at - timedelta(minutes=data.duration_minutes),
        models.Appointment.scheduled_at <= data.scheduled_at + timedelta(minutes=data.duration_minutes),
    ).first()

    if conflict:
        raise HTTPException(status_code=409, detail="Employee has a conflicting appointment at that time")

    appointment = models.Appointment(**data.model_dump())
    db.add(appointment)

    prospect.status = models.ProspectStatus.appointment_set
    db.commit()
    db.refresh(appointment)
    return _serialize_appointment(appointment)


@router.get("/available-slots")
def get_available_slots(
    employee_id: int,
    date: str,
    duration_minutes: int = 30,
    db: Session = Depends(get_db),
):
    """Return available 30-min slots for a given employee on a given date."""
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Date must be YYYY-MM-DD format")

    booked = db.query(models.Appointment).filter(
        models.Appointment.employee_id == employee_id,
        models.Appointment.status.in_(["scheduled", "confirmed"]),
        models.Appointment.scheduled_at >= target_date,
        models.Appointment.scheduled_at < target_date + timedelta(days=1),
    ).all()

    booked_times = set()
    for appt in booked:
        start = appt.scheduled_at
        for i in range(appt.duration_minutes // 30 + 1):
            slot = start + timedelta(minutes=30 * i)
            booked_times.add(slot.strftime("%H:%M"))

    all_slots = []
    start_hour = 8
    end_hour = 17
    current = target_date.replace(hour=start_hour, minute=0)
    while current.hour < end_hour:
        slot_str = current.strftime("%H:%M")
        all_slots.append({
            "time": slot_str,
            "datetime": current.isoformat(),
            "available": slot_str not in booked_times,
        })
        current += timedelta(minutes=30)

    return {"date": date, "employee_id": employee_id, "slots": all_slots}


@router.get("/employees")
def list_employees(db: Session = Depends(get_db)):
    employees = db.query(models.Employee).filter(models.Employee.is_active == True).all()
    return [_serialize_employee(e) for e in employees]


@router.post("/employees", status_code=201)
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db)):
    employee = models.Employee(**data.model_dump())
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return _serialize_employee(employee)


@router.get("/{appointment_id}")
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return _serialize_appointment(appt)


@router.patch("/{appointment_id}")
def update_appointment(appointment_id: int, data: AppointmentUpdate, db: Session = Depends(get_db)):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    for field, value in update_data.items():
        setattr(appt, field, value)

    db.commit()
    db.refresh(appt)
    return _serialize_appointment(appt)


def _serialize_appointment(a: models.Appointment) -> dict:
    return {
        "id": a.id,
        "prospect_id": a.prospect_id,
        "employee_id": a.employee_id,
        "prospect_name": f"{a.prospect.first_name} {a.prospect.last_name}" if a.prospect else None,
        "prospect_company": a.prospect.company if a.prospect else None,
        "employee_name": a.employee.name if a.employee else None,
        "title": a.title,
        "scheduled_at": a.scheduled_at.isoformat() if a.scheduled_at else None,
        "duration_minutes": a.duration_minutes,
        "meeting_link": a.meeting_link,
        "status": a.status.value if a.status else None,
        "appointment_type": a.appointment_type,
        "notes": a.notes,
        "outcome": a.outcome,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _serialize_employee(e: models.Employee) -> dict:
    return {
        "id": e.id,
        "name": e.name,
        "email": e.email,
        "role": e.role,
        "calendar_link": e.calendar_link,
        "is_active": e.is_active,
    }
