"""Seed the database with sample prospects, employees, appointments, and pipeline data."""
from database import SessionLocal, engine, Base
import models
from datetime import datetime, timedelta
import random

Base.metadata.create_all(bind=engine)

db = SessionLocal()

employees = [
    models.Employee(name="Sarah Mitchell", email="sarah@insureflow.ai", role="account_exec", calendar_link="https://cal.com/sarah"),
    models.Employee(name="James Okafor", email="james@insureflow.ai", role="sales_rep", calendar_link="https://cal.com/james"),
    models.Employee(name="Priya Nair", email="priya@insureflow.ai", role="closer", calendar_link="https://cal.com/priya"),
]
db.add_all(employees)
db.commit()

sample_prospects = [
    {
        "first_name": "David", "last_name": "Hartman", "email": "david@hartmaninsurance.com",
        "phone": "512-555-0101", "company": "Hartman Insurance Group", "title": "Owner",
        "agency_size": "mid", "lines_of_business": "P&C,Commercial",
        "current_tech_stack": "Applied Epic", "annual_premium_volume": 4500000,
        "num_producers": 8, "has_ops_team": True, "source": "linkedin", "lead_score": 72,
        "status": models.ProspectStatus.qualified,
    },
    {
        "first_name": "Angela", "last_name": "Torres", "email": "angela@torresagency.com",
        "phone": "713-555-0182", "company": "Torres Family Agency", "title": "Principal",
        "agency_size": "small", "lines_of_business": "Life,Health",
        "current_tech_stack": "EZLynx", "annual_premium_volume": 850000,
        "num_producers": 3, "has_ops_team": False, "source": "cold_email", "lead_score": 41,
        "status": models.ProspectStatus.contacted,
    },
    {
        "first_name": "Marcus", "last_name": "Chen", "email": "marcus@crestlineins.com",
        "phone": "214-555-0247", "company": "Crestline Insurance Partners", "title": "CEO",
        "agency_size": "large", "lines_of_business": "P&C,Commercial,Life",
        "current_tech_stack": "AMS360", "annual_premium_volume": 22000000,
        "num_producers": 24, "has_ops_team": True, "source": "referral", "lead_score": 91,
        "status": models.ProspectStatus.appointment_set,
    },
    {
        "first_name": "Brittany", "last_name": "Wallace", "email": "bwallace@wallaceins.net",
        "phone": "469-555-0319", "company": "Wallace & Associates Insurance", "title": "VP Sales",
        "agency_size": "mid", "lines_of_business": "P&C,Commercial",
        "current_tech_stack": "HawkSoft", "annual_premium_volume": 6200000,
        "num_producers": 12, "has_ops_team": True, "source": "conference", "lead_score": 78,
        "status": models.ProspectStatus.qualified,
    },
    {
        "first_name": "Robert", "last_name": "Diaz", "email": "rdiaz@diazprotection.com",
        "phone": "210-555-0443", "company": "Diaz Protection Services", "title": "Owner",
        "agency_size": "small", "lines_of_business": "P&C",
        "current_tech_stack": "Other", "annual_premium_volume": 320000,
        "num_producers": 2, "has_ops_team": False, "source": "cold_email", "lead_score": 22,
        "status": models.ProspectStatus.lead,
    },
    {
        "first_name": "Natalie", "last_name": "Brooks", "email": "nbrooks@summitins.com",
        "phone": "817-555-0574", "company": "Summit Risk Solutions", "title": "President",
        "agency_size": "large", "lines_of_business": "Commercial,E&O,Cyber",
        "current_tech_stack": "Applied Epic", "annual_premium_volume": 31000000,
        "num_producers": 35, "has_ops_team": True, "source": "linkedin", "lead_score": 95,
        "status": models.ProspectStatus.qualified,
    },
]

created_prospects = []
for p_data in sample_prospects:
    p = models.Prospect(**p_data)
    db.add(p)
    db.commit()
    db.refresh(p)
    created_prospects.append(p)

pipeline_stages = [
    models.PipelineStage.lead,
    models.PipelineStage.qualified,
    models.PipelineStage.discovery_call,
    models.PipelineStage.demo,
    models.PipelineStage.proposal,
    models.PipelineStage.closed_won,
]

stage_probs = [0.05, 0.15, 0.25, 0.40, 0.60, 1.0]

for i, prospect in enumerate(created_prospects):
    stage = pipeline_stages[min(i, len(pipeline_stages) - 1)]
    prob = stage_probs[min(i, len(stage_probs) - 1)]
    deal_val = (prospect.annual_premium_volume or 30000) * 0.008
    entry = models.PipelineEntry(
        prospect_id=prospect.id,
        stage=stage,
        deal_value=deal_val,
        probability=prob,
        expected_close_date=datetime.now() + timedelta(days=30 + i * 15),
        notes=f"Sourced via {prospect.source}. Lead score: {prospect.lead_score}.",
    )
    db.add(entry)

db.commit()

now = datetime.now()
appt_data = [
    (created_prospects[0].id, employees[0].id, "Discovery Call", now + timedelta(days=2), "discovery"),
    (created_prospects[2].id, employees[2].id, "Demo & Proposal", now + timedelta(days=1), "demo"),
    (created_prospects[3].id, employees[1].id, "Needs Analysis", now + timedelta(days=5), "discovery"),
    (created_prospects[5].id, employees[2].id, "Executive Demo", now + timedelta(days=3), "demo"),
]

for prospect_id, employee_id, title, scheduled_at, appt_type in appt_data:
    appt = models.Appointment(
        prospect_id=prospect_id,
        employee_id=employee_id,
        title=title,
        scheduled_at=scheduled_at,
        duration_minutes=45,
        meeting_link="https://meet.google.com/placeholder",
        status=models.AppointmentStatus.scheduled,
        appointment_type=appt_type,
    )
    db.add(appt)

db.commit()
db.close()

print("Database seeded successfully.")
print(f"  {len(employees)} employees")
print(f"  {len(sample_prospects)} prospects")
print(f"  {len(sample_prospects)} pipeline entries")
print(f"  {len(appt_data)} appointments")
