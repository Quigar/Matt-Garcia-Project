import os
import json
from anthropic import Anthropic

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

QUALIFICATION_SYSTEM_PROMPT = """You are an expert AI sales development representative for an insurance technology consulting firm.
Your job is to qualify insurance agency prospects for a consultative AI sales process.

You are having a natural conversation to determine if the prospect is a good fit.
Key qualification criteria for insurance agencies:
- Agency size (number of producers, annual premium volume)
- Lines of business (P&C, Life, Health, Commercial)
- Current pain points (manual processes, quoting speed, customer service, retention)
- Technology stack (Applied Epic, AMS360, HawkSoft, EZLynx, other)
- Decision-making authority (are you talking to the owner/principal?)
- Budget openness ($2,500-$10,000/mo range)
- Timeline (actively looking vs. just exploring)

Score the prospect 0-100 based on:
- 0-30: Not a fit (too small, no budget, wrong industry segment)
- 31-60: Potential fit (needs nurturing, circle back in 90 days)
- 61-80: Good fit (set a discovery call)
- 81-100: Strong fit (fast-track to demo)

Keep responses conversational, concise (2-3 sentences), and focused on uncovering pain points.
Do NOT pitch products until you have enough information.
After 5-8 exchanges, provide a JSON block with your qualification assessment.

When ready to assess, output:
<qualification_result>
{
  "score": <0-100>,
  "summary": "<brief qualification summary>",
  "recommended_action": "<set_appointment|nurture|disqualify>",
  "key_findings": ["finding1", "finding2"],
  "extracted_data": {
    "agency_size": "<small|mid|large>",
    "lines_of_business": "<CSV list>",
    "current_tech_stack": "<system name>",
    "annual_premium_volume": <number or null>,
    "num_producers": <number or null>,
    "has_ops_team": <true|false|null>,
    "pain_points": ["pain1", "pain2"]
  }
}
</qualification_result>"""

OUTREACH_SYSTEM_PROMPT = """You are an expert copywriter for an insurance AI consulting firm.
Write compelling, personalized outreach emails for insurance agency prospects.
Keep emails under 150 words. Focus on a specific pain point relevant to their profile.
Use a consultative tone — not pushy. Always include a soft CTA (15-min call, not a hard sell).
Reference their specific agency type, size, or tech stack when provided.
Never make compliance promises. Avoid buzzwords like "revolutionary" or "game-changing".
Output only the email body — no subject line unless asked."""

PIPELINE_SYSTEM_PROMPT = """You are an expert insurance sales strategist.
Analyze the prospect's pipeline entry and provide actionable next steps.
Consider their stage, deal value, last activity, and qualification score.
Be specific to the insurance industry context.
Output concise, bullet-pointed recommendations."""


async def qualify_prospect(prospect_context: dict, conversation_history: list) -> dict:
    """Run an AI qualification conversation turn."""
    system = QUALIFICATION_SYSTEM_PROMPT

    context_block = f"""
Prospect context:
- Name: {prospect_context.get('first_name', '')} {prospect_context.get('last_name', '')}
- Company: {prospect_context.get('company', '')}
- Title: {prospect_context.get('title', '')}
- Source: {prospect_context.get('source', '')}
"""
    messages = [{"role": "user", "content": context_block}] if not conversation_history else []
    messages += conversation_history

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        messages=messages,
    )

    content = response.content[0].text

    result = {"message": content, "qualification_result": None}

    if "<qualification_result>" in content:
        try:
            json_str = content.split("<qualification_result>")[1].split("</qualification_result>")[0].strip()
            result["qualification_result"] = json.loads(json_str)
        except (json.JSONDecodeError, IndexError):
            pass

    return result


async def generate_outreach_email(prospect: dict, tone: str = "consultative") -> dict:
    """Generate a personalized outreach email for a prospect."""
    prompt = f"""Write a personalized cold outreach email for:
- Name: {prospect.get('first_name', '')} {prospect.get('last_name', '')}
- Title: {prospect.get('title', 'Agency Principal')}
- Company: {prospect.get('company', 'their agency')}
- Agency Size: {prospect.get('agency_size', 'unknown')}
- Lines of Business: {prospect.get('lines_of_business', 'P&C')}
- Current Tech Stack: {prospect.get('current_tech_stack', 'unknown')}
- Tone: {tone}

Focus on one specific pain point common to agencies of their profile.
Include a subject line on the first line formatted as: Subject: <subject>"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=OUTREACH_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.content[0].text
    lines = content.strip().split("\n")
    subject = ""
    body = content

    if lines[0].startswith("Subject:"):
        subject = lines[0].replace("Subject:", "").strip()
        body = "\n".join(lines[1:]).strip()

    return {"subject": subject, "body": body}


async def get_pipeline_recommendations(pipeline_entry: dict, prospect: dict) -> str:
    """Get AI-driven next-step recommendations for a pipeline entry."""
    prompt = f"""Analyze this insurance agency pipeline entry and recommend next steps:

Prospect: {prospect.get('first_name')} {prospect.get('last_name')} - {prospect.get('company')}
Stage: {pipeline_entry.get('stage')}
Deal Value: ${pipeline_entry.get('deal_value', 0):,.0f}/year
Probability: {pipeline_entry.get('probability', 0) * 100:.0f}%
Lead Score: {prospect.get('lead_score', 0)}/100
Lines of Business: {prospect.get('lines_of_business', 'unknown')}
Tech Stack: {prospect.get('current_tech_stack', 'unknown')}
Notes: {pipeline_entry.get('notes', 'none')}

Provide 3-5 specific, actionable next steps to advance this deal."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=PIPELINE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    return response.content[0].text


async def score_lead(prospect: dict) -> int:
    """Auto-score a lead 0-100 based on profile data."""
    score = 0

    vol = prospect.get("annual_premium_volume") or 0
    if vol >= 10_000_000:
        score += 30
    elif vol >= 2_000_000:
        score += 20
    elif vol >= 500_000:
        score += 10

    producers = prospect.get("num_producers") or 0
    if producers >= 10:
        score += 20
    elif producers >= 5:
        score += 15
    elif producers >= 2:
        score += 8

    lob = prospect.get("lines_of_business") or ""
    if "commercial" in lob.lower() or "p&c" in lob.lower():
        score += 15

    if prospect.get("has_ops_team"):
        score += 10

    title = (prospect.get("title") or "").lower()
    if any(t in title for t in ["owner", "principal", "president", "ceo", "partner"]):
        score += 15
    elif any(t in title for t in ["vp", "director", "manager"]):
        score += 8

    tech = (prospect.get("current_tech_stack") or "").lower()
    legacy_stacks = ["applied epic", "ams360", "hawksoft", "ezlynx", "vertafore"]
    if any(t in tech for t in legacy_stacks):
        score += 10

    return min(score, 100)
