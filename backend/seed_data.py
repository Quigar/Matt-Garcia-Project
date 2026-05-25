"""Seed with realistic individual life insurance agent prospects."""
from database import SessionLocal, engine, Base
import models
from datetime import datetime, timedelta

Base.metadata.create_all(bind=engine)
db = SessionLocal()

employees = [
    models.Employee(name="Sarah Mitchell", email="sarah@insureflow.ai", role="account_exec", calendar_link="https://cal.com/sarah"),
    models.Employee(name="James Okafor", email="james@insureflow.ai", role="sales_rep", calendar_link="https://cal.com/james"),
    models.Employee(name="Priya Nair", email="priya@insureflow.ai", role="closer", calendar_link="https://cal.com/priya"),
]
db.add_all(employees)
db.commit()

# Realistic individual life agent profiles
sample_agents = [
    {
        "first_name": "Kevin", "last_name": "Marsh", "email": "kevin@marshlifeplanning.com",
        "phone": "512-555-0101", "company": "Marsh Life Planning", "title": "Independent Life Agent",
        "product_focus": "iul_vul",
        "captive_or_independent": "independent",
        "imo_fmo_affiliation": "Integrity Marketing Group",
        "carrier_appointments": 14,
        "annual_life_premium": 780000,
        "avg_case_size": 8200,
        "has_admin_support": False,
        "production_tier": "established",
        "pain_points": "underwriting tracking,case design time,client follow-up",
        "current_tech_stack": "iPipeline,spreadsheets",
        "source": "linkedin", "lead_score": 82,
        "status": models.ProspectStatus.qualified,
    },
    {
        "first_name": "Tamara", "last_name": "Reyes", "email": "tamara@reyesfinancial.com",
        "phone": "713-555-0182", "company": "Reyes Financial Services", "title": "Financial Advisor",
        "product_focus": "annuities",
        "captive_or_independent": "independent",
        "imo_fmo_affiliation": "AmeriLife",
        "carrier_appointments": 9,
        "annual_life_premium": 1450000,
        "avg_case_size": 42000,
        "has_admin_support": True,
        "production_tier": "top_producer",
        "pain_points": "suitability review delays,transfer tracking,state approval bottleneck",
        "current_tech_stack": "Salesforce,LifeSuite",
        "source": "referral", "lead_score": 91,
        "status": models.ProspectStatus.appointment_set,
    },
    {
        "first_name": "Darnell", "last_name": "Washington", "email": "darnell@dwlifeinsurance.com",
        "phone": "404-555-0247", "company": "DW Life Insurance", "title": "Life Insurance Agent",
        "product_focus": "final_expense",
        "captive_or_independent": "independent",
        "imo_fmo_affiliation": "EFES",
        "carrier_appointments": 6,
        "annual_life_premium": 210000,
        "avg_case_size": 950,
        "has_admin_support": False,
        "production_tier": "growing",
        "pain_points": "high case volume,policy delivery follow-up,dialer fatigue",
        "current_tech_stack": "spreadsheets",
        "source": "cold_email", "lead_score": 58,
        "status": models.ProspectStatus.contacted,
    },
    {
        "first_name": "Lindsay", "last_name": "Cho", "email": "lindsay@choprotects.com",
        "phone": "206-555-0319", "company": "Cho Protects", "title": "Independent Agent",
        "product_focus": "term",
        "captive_or_independent": "independent",
        "imo_fmo_affiliation": "Compulife",
        "carrier_appointments": 11,
        "annual_life_premium": 390000,
        "avg_case_size": 2100,
        "has_admin_support": False,
        "production_tier": "growing",
        "pain_points": "competitive quoting speed,NTO rate,underwriting turnaround",
        "current_tech_stack": "spreadsheets,email",
        "source": "conference", "lead_score": 61,
        "status": models.ProspectStatus.qualified,
    },
    {
        "first_name": "Brian", "last_name": "Stanton", "email": "brian@stantonwealth.com",
        "phone": "312-555-0443", "company": "Stanton Wealth Management", "title": "Wealth Advisor",
        "product_focus": "whole_life",
        "captive_or_independent": "broker_dealer",
        "imo_fmo_affiliation": "NFP",
        "carrier_appointments": 5,
        "annual_life_premium": 92000,
        "avg_case_size": 18000,
        "has_admin_support": True,
        "production_tier": "emerging",
        "pain_points": "policy loan tracking,dividend illustration complexity",
        "current_tech_stack": "Redtail CRM",
        "source": "linkedin", "lead_score": 29,
        "status": models.ProspectStatus.lead,
    },
    {
        "first_name": "Monique", "last_name": "Jackson", "email": "monique@mjlifestrategies.com",
        "phone": "214-555-0574", "company": "MJ Life Strategies", "title": "Senior Life Agent",
        "product_focus": "mixed",
        "captive_or_independent": "independent",
        "imo_fmo_affiliation": "Equis Financial",
        "carrier_appointments": 18,
        "annual_life_premium": 1100000,
        "avg_case_size": 6500,
        "has_admin_support": False,
        "production_tier": "top_producer",
        "pain_points": "no admin support,pending case management,client ghosting during underwriting",
        "current_tech_stack": "spreadsheets,nothing formal",
        "source": "referral", "lead_score": 95,
        "status": models.ProspectStatus.qualified,
    },
    {
        "first_name": "Tyler", "last_name": "Nguyen", "email": "tyler@nguyeninsurance.net",
        "phone": "602-555-0638", "company": "Nguyen Insurance", "title": "Captive Agent",
        "product_focus": "whole_life",
        "captive_or_independent": "captive",
        "imo_fmo_affiliation": "Northwestern Mutual",
        "carrier_appointments": 1,
        "annual_life_premium": 175000,
        "avg_case_size": 5800,
        "has_admin_support": True,
        "production_tier": "growing",
        "pain_points": "limited carrier options,corporate CRM is clunky",
        "current_tech_stack": "Corporate CRM",
        "source": "cold_email", "lead_score": 34,
        "status": models.ProspectStatus.lead,
    },
]

created_agents = []
for a_data in sample_agents:
    a = models.Prospect(**a_data)
    db.add(a)
    db.commit()
    db.refresh(a)
    created_agents.append(a)

# Pipeline stages spread across the funnel
pipeline_stages = [
    models.PipelineStage.lead,
    models.PipelineStage.qualified,
    models.PipelineStage.discovery_call,
    models.PipelineStage.demo,
    models.PipelineStage.proposal,
    models.PipelineStage.contracting,
    models.PipelineStage.closed_won,
]
stage_probs = [0.05, 0.15, 0.25, 0.45, 0.65, 0.85, 1.0]

tier_deal_values = {
    "top_producer": 12000,
    "established": 8400,
    "growing": 4800,
    "emerging": 3600,
}

for i, agent in enumerate(created_agents):
    stage = pipeline_stages[min(i, len(pipeline_stages) - 1)]
    prob = stage_probs[min(i, len(stage_probs) - 1)]
    deal_val = tier_deal_values.get(agent.production_tier or "growing", 4800)
    entry = models.PipelineEntry(
        prospect_id=agent.id,
        stage=stage,
        deal_value=deal_val,
        probability=prob,
        expected_close_date=datetime.now() + timedelta(days=20 + i * 12),
        notes=f"Source: {agent.source}. Pain: {agent.pain_points}.",
    )
    db.add(entry)

db.commit()

now = datetime.now()
appt_data = [
    (created_agents[0].id, employees[0].id, "Discovery Call — IUL Practice Review", now + timedelta(days=2), "discovery"),
    (created_agents[1].id, employees[2].id, "Annuity Platform Demo", now + timedelta(days=1), "demo"),
    (created_agents[3].id, employees[1].id, "Term Agent Needs Analysis", now + timedelta(days=4), "discovery"),
    (created_agents[5].id, employees[2].id, "Top Producer Demo — Monique Jackson", now + timedelta(days=3), "demo"),
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

print("Database seeded with life insurance agent data.")
print(f"  {len(employees)} employees")
print(f"  {len(sample_agents)} life agents")
print(f"  {len(sample_agents)} pipeline entries")
print(f"  {len(appt_data)} appointments")
