from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class ProspectStatus(str, enum.Enum):
    lead = "lead"
    contacted = "contacted"
    qualified = "qualified"
    unqualified = "unqualified"
    appointment_set = "appointment_set"


class PipelineStage(str, enum.Enum):
    lead = "lead"
    qualified = "qualified"
    discovery_call = "discovery_call"
    demo = "demo"
    proposal = "proposal"
    contracting = "contracting"
    closed_won = "closed_won"
    closed_lost = "closed_lost"


class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class Prospect(Base):
    __tablename__ = "prospects"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    company = Column(String)          # DBA / practice name
    title = Column(String)            # e.g. "Independent Life Agent", "Financial Advisor"

    # Life-insurance-specific profile
    product_focus = Column(String)    # final_expense | term | whole_life | iul_vul | annuities | mixed
    captive_or_independent = Column(String)   # captive | independent | broker_dealer
    imo_fmo_affiliation = Column(String)      # name of their IMO/FMO/BGA
    carrier_appointments = Column(Integer)    # number of carriers contracted with
    annual_life_premium = Column(Float)       # annual submitted life premium ($)
    avg_case_size = Column(Float)             # average annual premium per policy
    has_admin_support = Column(Boolean, default=False)  # VA / admin assistant
    production_tier = Column(String)          # emerging | growing | established | top_producer

    # Pain points captured during qualification (comma-separated)
    pain_points = Column(String)

    current_tech_stack = Column(String)       # iPipeline, LifeSuite, Salesforce, spreadsheets, etc.

    status = Column(Enum(ProspectStatus), default=ProspectStatus.lead)
    lead_score = Column(Integer, default=0)   # 0–100
    source = Column(String)                   # linkedin, referral, cold_email, conference, inbound
    notes = Column(Text)
    opt_out = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    appointments = relationship("Appointment", back_populates="prospect")
    pipeline_entries = relationship("PipelineEntry", back_populates="prospect")
    outreach_logs = relationship("OutreachLog", back_populates="prospect")
    qualification_sessions = relationship("QualificationSession", back_populates="prospect")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True)
    role = Column(String)  # sales_rep, account_exec, closer
    calendar_link = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    appointments = relationship("Appointment", back_populates="employee")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    prospect_id = Column(Integer, ForeignKey("prospects.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    title = Column(String)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=30)
    meeting_link = Column(String)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.scheduled)
    appointment_type = Column(String)  # discovery, demo, proposal_review, onboarding
    notes = Column(Text)
    outcome = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    prospect = relationship("Prospect", back_populates="appointments")
    employee = relationship("Employee", back_populates="appointments")


class PipelineEntry(Base):
    __tablename__ = "pipeline_entries"

    id = Column(Integer, primary_key=True, index=True)
    prospect_id = Column(Integer, ForeignKey("prospects.id"))
    stage = Column(Enum(PipelineStage), default=PipelineStage.lead)
    deal_value = Column(Float, default=0.0)
    probability = Column(Float, default=0.0)  # 0–1
    expected_close_date = Column(DateTime(timezone=True))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    prospect = relationship("Prospect", back_populates="pipeline_entries")


class OutreachLog(Base):
    __tablename__ = "outreach_logs"

    id = Column(Integer, primary_key=True, index=True)
    prospect_id = Column(Integer, ForeignKey("prospects.id"))
    channel = Column(String)   # email, phone, linkedin, sms
    direction = Column(String) # outbound, inbound
    subject = Column(String)
    body = Column(Text)
    ai_generated = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    opened = Column(Boolean, default=False)
    replied = Column(Boolean, default=False)

    prospect = relationship("Prospect", back_populates="outreach_logs")


class QualificationSession(Base):
    __tablename__ = "qualification_sessions"

    id = Column(Integer, primary_key=True, index=True)
    prospect_id = Column(Integer, ForeignKey("prospects.id"))
    messages = Column(Text)  # JSON array of {role, content}
    qualification_score = Column(Integer)  # 0–100
    qualification_summary = Column(Text)
    recommended_action = Column(String)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    prospect = relationship("Prospect", back_populates="qualification_sessions")
