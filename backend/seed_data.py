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

# ---------------------------------------------------------------------------
# Pending Cases — realistic life cases across all statuses
# ---------------------------------------------------------------------------
from datetime import timezone

def past(days):
    return datetime.now(timezone.utc) - timedelta(days=days)

pending_cases_data = [
    # Kevin Marsh (IUL agent) — 3 cases
    {
        "prospect_id": created_agents[0].id,
        "client_name": "Robert Simmons",
        "client_age": 48,
        "carrier": "Pacific Life",
        "product_type": "IUL",
        "face_amount": 1_000_000,
        "annual_premium": 14_200,
        "carrier_case_number": "PL-2024-00841",
        "status": models.CaseStatus.requirements,
        "submitted_at": past(22),
        "status_updated_at": past(11),  # stale — over 7-day threshold for requirements
        "requirements_outstanding": "APS from cardiologist, 2019 blood panel results",
        "notes": "Client had a minor cardiac event in 2019. Should approve substandard.",
        "ai_risk_level": "high",
        "ai_risk_reason": "Requirements outstanding for 11 days — carrier may close file.",
        "ai_recommended_action": "Call Pacific Life UW directly and confirm APS was received. Follow up with client's physician office.",
    },
    {
        "prospect_id": created_agents[0].id,
        "client_name": "Diana Forsythe",
        "client_age": 39,
        "carrier": "North American",
        "product_type": "IUL",
        "face_amount": 500_000,
        "annual_premium": 8_400,
        "carrier_case_number": "NA-2024-05512",
        "status": models.CaseStatus.pending,
        "submitted_at": past(12),
        "status_updated_at": past(12),
        "requirements_outstanding": None,
        "notes": "Preferred Plus health class expected. Clean application.",
        "ai_risk_level": "low",
        "ai_risk_reason": "12 days in pending — within normal underwriting window for North American.",
        "ai_recommended_action": "Check status at 21-day mark. No action needed yet.",
    },
    {
        "prospect_id": created_agents[0].id,
        "client_name": "Marcus Webb",
        "client_age": 55,
        "carrier": "Nationwide",
        "product_type": "IUL",
        "face_amount": 750_000,
        "annual_premium": 18_600,
        "carrier_case_number": "NW-2024-07741",
        "status": models.CaseStatus.delivery,
        "submitted_at": past(45),
        "status_updated_at": past(9),  # stale — over 7-day delivery threshold
        "requirements_outstanding": None,
        "next_followup_date": past(2),
        "notes": "Policy delivered 9 days ago. Client has not returned signed delivery receipt.",
        "ai_risk_level": "critical",
        "ai_risk_reason": "Policy in delivery for 9 days without acceptance — client going cold.",
        "ai_recommended_action": "Call client today. Offer to meet in person to review policy benefits and get signature.",
    },
    # Tamara Reyes (annuity agent) — 2 cases
    {
        "prospect_id": created_agents[1].id,
        "client_name": "Harold Ostrowski",
        "client_age": 67,
        "carrier": "Allianz",
        "product_type": "FIA (Annuity)",
        "face_amount": None,
        "annual_premium": 85_000,
        "carrier_case_number": "ALZ-2024-11204",
        "status": models.CaseStatus.requirements,
        "submitted_at": past(18),
        "status_updated_at": past(4),
        "requirements_outstanding": "Suitability interview recording, bank transfer confirmation",
        "notes": "1035 exchange from MetLife. Client is 67, Allianz requires recorded suitability call.",
        "ai_risk_level": "medium",
        "ai_risk_reason": "Suitability interview not yet scheduled — 4 days in requirements.",
        "ai_recommended_action": "Schedule suitability call with client this week before Allianz flags the transfer.",
    },
    {
        "prospect_id": created_agents[1].id,
        "client_name": "Sylvia Chambers",
        "client_age": 71,
        "carrier": "Global Atlantic",
        "product_type": "MYGA (Annuity)",
        "face_amount": None,
        "annual_premium": 120_000,
        "carrier_case_number": "GA-2024-03317",
        "status": models.CaseStatus.placed,
        "submitted_at": past(60),
        "status_updated_at": past(5),
        "requirements_outstanding": None,
        "notes": "Issued and client funded. Premium of $120K received. Great case.",
        "ai_risk_level": "low",
        "ai_risk_reason": "Case placed and in-force.",
        "ai_recommended_action": "Schedule 30-day policy review call with client.",
    },
    # Darnell Washington (final expense) — 3 cases
    {
        "prospect_id": created_agents[2].id,
        "client_name": "Betty Mae Johnson",
        "client_age": 74,
        "carrier": "Mutual of Omaha",
        "product_type": "Final Expense WL",
        "face_amount": 15_000,
        "annual_premium": 1_140,
        "carrier_case_number": "MOO-2024-44812",
        "status": models.CaseStatus.submitted,
        "submitted_at": past(2),
        "status_updated_at": past(2),
        "requirements_outstanding": None,
        "notes": "E-app submitted. Simplified issue — should approve in 24-48 hrs.",
        "ai_risk_level": "low",
        "ai_risk_reason": "Only 2 days since submission — within normal simplified-issue window.",
        "ai_recommended_action": "Check carrier portal tomorrow for approval.",
    },
    {
        "prospect_id": created_agents[2].id,
        "client_name": "Raymond Torres",
        "client_age": 68,
        "carrier": "American Amicable",
        "product_type": "Final Expense WL",
        "face_amount": 10_000,
        "annual_premium": 864,
        "carrier_case_number": "AA-2024-29004",
        "status": models.CaseStatus.approved,
        "submitted_at": past(30),
        "status_updated_at": past(16),  # stale — over 14-day approved threshold
        "requirements_outstanding": None,
        "next_followup_date": past(2),
        "notes": "Approved standard. Policy not yet delivered — agent hasn't scheduled delivery.",
        "ai_risk_level": "high",
        "ai_risk_reason": "Approved 16 days ago with no delivery scheduled — lapse risk rising.",
        "ai_recommended_action": "Contact client immediately to schedule policy delivery meeting.",
    },
    {
        "prospect_id": created_agents[2].id,
        "client_name": "Gloria Hutchins",
        "client_age": 81,
        "carrier": "Foresters Financial",
        "product_type": "Final Expense WL",
        "face_amount": 8_000,
        "annual_premium": 912,
        "carrier_case_number": "FF-2024-17703",
        "status": models.CaseStatus.nto,
        "submitted_at": past(50),
        "status_updated_at": past(10),
        "requirements_outstanding": None,
        "notes": "Client declined to accept policy at delivery — said premium was too high.",
        "ai_risk_level": "low",
        "ai_risk_reason": "NTO — terminal status, no further action on this case.",
        "ai_recommended_action": "Requalify client for a lower face amount or graded benefit policy.",
    },
    # Monique Jackson (top producer, mixed) — 2 cases
    {
        "prospect_id": created_agents[5].id,
        "client_name": "Thomas & Angela Whitfield",
        "client_age": 51,
        "carrier": "Lincoln Financial",
        "product_type": "IUL",
        "face_amount": 2_000_000,
        "annual_premium": 32_400,
        "carrier_case_number": "LFG-2024-08819",
        "status": models.CaseStatus.pending,
        "submitted_at": past(8),
        "status_updated_at": past(8),
        "requirements_outstanding": None,
        "notes": "Joint insured case. Both non-smokers, excellent health. Expecting Preferred Plus.",
        "ai_risk_level": "low",
        "ai_risk_reason": "8 days in pending on a clean $2M case — normal timeline.",
        "ai_recommended_action": "Follow up at 21-day mark. Prepare delivery meeting agenda.",
    },
    {
        "prospect_id": created_agents[5].id,
        "client_name": "David Kiran",
        "client_age": 44,
        "carrier": "Protective Life",
        "product_type": "Term (20-yr)",
        "face_amount": 1_500_000,
        "annual_premium": 2_100,
        "carrier_case_number": "PL-2024-55601",
        "status": models.CaseStatus.requirements,
        "submitted_at": past(14),
        "status_updated_at": past(3),
        "requirements_outstanding": "Attending physician statement — sleep study for sleep apnea disclosed",
        "notes": "Client has mild sleep apnea, CPAP compliant. Should get standard or table B.",
        "ai_risk_level": "medium",
        "ai_risk_reason": "APS requested 3 days ago for sleep apnea — monitoring physician's office response time.",
        "ai_recommended_action": "Have client contact physician office directly to expedite APS release.",
    },
]

for case_data in pending_cases_data:
    case = models.PendingCase(**case_data)
    db.add(case)

db.commit()
db.close()

print("Database seeded with life insurance agent data.")
print(f"  {len(pending_cases_data)} pending cases added")
print(f"  {len(employees)} employees")
print(f"  {len(sample_agents)} life agents")
print(f"  {len(sample_agents)} pipeline entries")
print(f"  {len(appt_data)} appointments")
