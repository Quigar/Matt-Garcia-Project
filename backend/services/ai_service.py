import os
import json
from anthropic import Anthropic

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

QUALIFICATION_SYSTEM_PROMPT = """You are an expert sales development representative for an AI consulting firm that serves individual life insurance agents.

Your goal is to qualify whether a life agent is a good fit for an AI-powered practice management platform.
Keep the conversation natural — 2 sentences per response max. You're curious, not pushy.

Qualification criteria you need to uncover:

1. PRODUCTION — Annual submitted life premium (how much they write per year)
   - Under $100K: too small / emerging
   - $100K–$500K: growing — potential fit
   - $500K–$1M: established — strong fit
   - $1M+: top producer — priority fit

2. PRODUCT MIX — What they primarily sell
   - Final expense (FE), Term, Whole Life, IUL/VUL, Annuities, or mixed
   - IUL/VUL and annuities = highest complexity = biggest need for AI

3. INDEPENDENCE — Captive (Northwestern, NYL, MassMutual) vs. Independent vs. Broker-dealer
   - Independent agents have more flexibility to adopt new tools
   - Captive agents have less control but more pain with admin overhead

4. DISTRIBUTION — IMO/FMO/BGA affiliation (Integrity, AmeriLife, NAIFA, etc.)

5. PAIN POINTS — What's slowing them down?
   Key pains for life agents:
   - "Cases fall through during underwriting because I can't track follow-ups"
   - "I spend more time on illustrations and paperwork than selling"
   - "My lead pipeline is inconsistent — feast or famine"
   - "I do all my own admin — no support staff"
   - "Client ghosting after initial meeting before policy is issued"

6. TECH STACK — What they use today
   Examples: iPipeline, LifeSuite, Salesforce, Redtail, spreadsheets/nothing

7. BUDGET OPENNESS — Are they open to investing $300–$1,000/month for tools?

After 6–10 exchanges, provide your structured assessment.

Score 0–100:
- 0–25: Not a fit (too small, captive with no flexibility, no pain)
- 26–50: Nurture (low production but pain exists, follow up in 60 days)
- 51–75: Qualified (set a discovery call)
- 76–100: Hot (fast-track to demo)

When ready, output ONLY this block (no surrounding text):
<qualification_result>
{
  "score": <0-100>,
  "summary": "<1-2 sentence qualification summary>",
  "recommended_action": "<set_appointment|nurture|disqualify>",
  "key_findings": ["finding1", "finding2", "finding3"],
  "extracted_data": {
    "product_focus": "<final_expense|term|whole_life|iul_vul|annuities|mixed>",
    "captive_or_independent": "<captive|independent|broker_dealer>",
    "imo_fmo_affiliation": "<name or null>",
    "carrier_appointments": <number or null>,
    "annual_life_premium": <number or null>,
    "avg_case_size": <number or null>,
    "has_admin_support": <true|false|null>,
    "production_tier": "<emerging|growing|established|top_producer>",
    "pain_points": ["pain1", "pain2"],
    "current_tech_stack": "<tools they use>"
  }
}
</qualification_result>"""

OUTREACH_SYSTEM_PROMPT = """You are an expert copywriter for an AI consulting firm that serves independent life insurance agents.

Write short, personalized cold outreach emails for life agents.
Rules:
- Under 120 words in the body
- Lead with ONE specific pain point relevant to their product focus or production level
- Reference their actual profile details (product focus, tech stack, IMO) when provided
- Consultative tone — you're a peer, not a vendor
- Soft CTA: 15-minute call, never a hard sell
- Never promise ROI numbers or make compliance claims
- Never use "game-changing", "revolutionary", "cutting-edge"
- Life insurance specific: reference underwriting, illustrations, pending cases, policy delivery, lapse, client follow-up

Pain points by product focus to weave in:
- IUL/VUL agents: illustration software complexity, suitability documentation, case design time
- Final expense agents: high volume of small cases, dialer fatigue, policy delivery follow-up
- Term agents: competitive quoting across carriers, underwriting turnaround, NTO (not taken out) rate
- Annuity agents: suitability reviews, transfer tracking, state approval delays
- Whole life agents: underwriting case management, policy loan tracking, dividend illustrations

Output format — first line must be: Subject: <subject line>
Then blank line, then body."""

PIPELINE_SYSTEM_PROMPT = """You are a life insurance sales strategist and practice management consultant.
Analyze the agent's pipeline entry and provide specific, actionable next steps.
You understand the life insurance sales process: discovery → needs analysis → illustration → underwriting → policy delivery.
Be specific — name the tactic, the message angle, and why it fits this agent's profile.
Output 3–5 bullet-pointed recommendations, each 1–2 sentences."""


async def qualify_prospect(prospect_context: dict, conversation_history: list) -> dict:
    """Run one turn of the AI qualification conversation."""
    context_block = f"""Agent context:
- Name: {prospect_context.get('first_name', '')} {prospect_context.get('last_name', '')}
- Company/DBA: {prospect_context.get('company', 'unknown')}
- Title: {prospect_context.get('title', 'Life Insurance Agent')}
- Source: {prospect_context.get('source', 'unknown')}
Start by introducing yourself briefly and asking what products they primarily focus on."""

    messages = [{"role": "user", "content": context_block}] if not conversation_history else []
    messages += conversation_history

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=QUALIFICATION_SYSTEM_PROMPT,
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
    """Generate a personalized cold outreach email for a life agent."""
    product = prospect.get("product_focus") or "life insurance"
    imo = prospect.get("imo_fmo_affiliation") or ""
    tech = prospect.get("current_tech_stack") or "unknown tools"
    tier = prospect.get("production_tier") or "growing"
    pain = prospect.get("pain_points") or ""

    prompt = f"""Write a cold outreach email for this life agent:
- Name: {prospect.get('first_name', '')} {prospect.get('last_name', '')}
- Title: {prospect.get('title', 'Independent Life Agent')}
- Product focus: {product}
- Production tier: {tier}
- IMO/FMO: {imo or 'unknown'}
- Tech stack: {tech}
- Known pain points: {pain or 'not captured yet'}
- Tone: {tone}

Pick the most relevant pain point for their profile and lead with it."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        system=OUTREACH_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.content[0].text.strip()
    lines = content.split("\n")
    subject = ""
    body = content

    if lines[0].startswith("Subject:"):
        subject = lines[0].replace("Subject:", "").strip()
        body = "\n".join(lines[1:]).strip()

    return {"subject": subject, "body": body}


async def get_pipeline_recommendations(pipeline_entry: dict, prospect: dict) -> str:
    """Get AI-driven next-step recommendations for a pipeline deal."""
    prompt = f"""Analyze this life agent's pipeline deal and recommend next steps:

Agent: {prospect.get('first_name')} {prospect.get('last_name')} — {prospect.get('company', 'independent')}
Product focus: {prospect.get('product_focus', 'unknown')}
Production tier: {prospect.get('production_tier', 'unknown')}
IMO/FMO: {prospect.get('imo_fmo_affiliation', 'unknown')}
Tech stack: {prospect.get('current_tech_stack', 'unknown')}
Pain points: {prospect.get('pain_points', 'not captured')}
Lead score: {prospect.get('lead_score', 0)}/100

Pipeline stage: {pipeline_entry.get('stage')}
Deal value: ${pipeline_entry.get('deal_value', 0):,.0f}/year
Win probability: {pipeline_entry.get('probability', 0) * 100:.0f}%
Notes: {pipeline_entry.get('notes', 'none')}

Give 3–5 specific next steps to advance this deal."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=PIPELINE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    return response.content[0].text


async def score_lead(prospect: dict) -> int:
    """Score a life agent lead 0–100 based on profile signals."""
    score = 0

    # Annual production (most important signal)
    premium = prospect.get("annual_life_premium") or 0
    if premium >= 1_000_000:
        score += 35
    elif premium >= 500_000:
        score += 28
    elif premium >= 100_000:
        score += 18
    elif premium >= 50_000:
        score += 8

    # Product complexity (higher complexity = more need for AI)
    product = (prospect.get("product_focus") or "").lower()
    if product in ("iul_vul", "annuities"):
        score += 20
    elif product in ("whole_life", "mixed"):
        score += 14
    elif product == "term":
        score += 10
    elif product == "final_expense":
        score += 8

    # Independent agents can adopt tools more freely
    captive = (prospect.get("captive_or_independent") or "").lower()
    if captive == "independent":
        score += 15
    elif captive == "broker_dealer":
        score += 10

    # No admin support = stronger pain = more need
    if prospect.get("has_admin_support") is False:
        score += 10
    elif prospect.get("has_admin_support") is True:
        score += 4

    # Multiple carrier appointments = more complexity to manage
    carriers = prospect.get("carrier_appointments") or 0
    if carriers >= 10:
        score += 10
    elif carriers >= 5:
        score += 7
    elif carriers >= 2:
        score += 4

    # Using manual/spreadsheet tools = ripe for upgrade
    tech = (prospect.get("current_tech_stack") or "").lower()
    if any(t in tech for t in ["spreadsheet", "excel", "nothing", "paper", "manual"]):
        score += 10
    elif any(t in tech for t in ["ipipeline", "lifesuite", "salesforce", "redtail"]):
        score += 5

    return min(score, 100)
