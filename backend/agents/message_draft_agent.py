"""MessageDraftAgent - Generates outreach messages."""
from openai import OpenAI
import os
import json
from typing import Dict, Any, List
try:
    from backend.logic.sanitizer import enforce_character_limit
except ImportError:
    from logic.sanitizer import enforce_character_limit


class MessageDraftAgent:
    """Agent that drafts LinkedIn connection requests, emails, and follow-ups."""
    
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o"  # Using gpt-4o as gpt-5.1 doesn't exist yet
    
    def draft_messages(
        self,
        user_profile: Dict[str, Any],
        target_profile: Dict[str, Any],
        overlap_summary: Dict[str, Any],
        context_attributes: Dict[str, Any],
        exa_results: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Generate all three message types."""
        
        # Build context summary
        exa_summary = "\n".join([
            f"- {r.get('title', '')}: {r.get('summary', '')}"
            for r in exa_results[:3]
        ])
        
        prompt = f"""You are an expert at writing personalized, effective cold outreach messages following SalesBread best practices.

User Profile Summary:
- Industries: {', '.join(user_profile.get('industries', []))}
- Skills: {', '.join(user_profile.get('skills', [])[:10])}
- Background: {json.dumps(user_profile.get('work_history', [])[:2], indent=2)}

Target Profile Summary:
- Industries: {', '.join(target_profile.get('industries', []))}
- Skills: {', '.join(target_profile.get('skills', [])[:10])}
- Background: {json.dumps(target_profile.get('work_history', [])[:2], indent=2)}

Overlap Analysis:
- Shared Companies: {', '.join(overlap_summary.get('shared_companies', []))}
- Shared Schools: {', '.join(overlap_summary.get('shared_schools', []))}
- Shared Industries: {', '.join(overlap_summary.get('shared_industries', []))}
- Skill Overlap: {', '.join(overlap_summary.get('skill_overlap', []))}
- Alignment: {overlap_summary.get('alignment', '')}
- Hook Options: {', '.join(overlap_summary.get('personalization_hook_options', []))}

Context:
- Outreach Goal: {context_attributes.get('outreach_goal', 'learn about their work')}
- Connection Context: {context_attributes.get('connection_context', 'no prior connection')}
- Personal Hook: {context_attributes.get('personal_hook', '')}

Relevant Insights:
{exa_summary if exa_summary else 'None'}

Generate three messages following these guidelines:

1. LINKEDIN CONNECTION REQUEST (MAX 300 characters):
   - Personal, warm, and concise
   - Reference a specific overlap or hook
   - Clear but low-pressure ask
   - MUST be under 300 characters

2. COLD OUTREACH EMAIL (MAX 1200 characters):
   - Subject line included
   - Personalized opening with specific reference
   - Value proposition or clear reason for reaching out
   - Soft call-to-action
   - Professional but friendly tone
   - MUST be under 1200 characters

3. FOLLOW-UP TEMPLATE (MAX 1200 characters):
   - Friendly, non-pushy tone
   - Reference previous message if applicable
   - Natural coffee chat ask
   - Low pressure
   - MUST be under 1200 characters

Return ONLY a JSON object with this structure:
{{
  "linkedin_connection_request": "message text (≤300 chars)",
  "cold_outreach_email": "Subject: ...\\n\\nEmail body (≤1200 chars)",
  "followup_template": "message text (≤1200 chars)"
}}

CRITICAL: All messages MUST respect character limits. If any message exceeds its limit, automatically shorten it while preserving clarity, tone, and personalization."""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert cold outreach writer. Always respect character limits strictly. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        content = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        try:
            messages = json.loads(content)
        except json.JSONDecodeError:
            messages = {
                "linkedin_connection_request": "",
                "cold_outreach_email": "",
                "followup_template": ""
            }
        
        # Enforce character limits
        messages["linkedin_connection_request"] = enforce_character_limit(
            messages.get("linkedin_connection_request", ""), 300
        )
        messages["cold_outreach_email"] = enforce_character_limit(
            messages.get("cold_outreach_email", ""), 1200
        )
        messages["followup_template"] = enforce_character_limit(
            messages.get("followup_template", ""), 1200
        )
        
        return messages

