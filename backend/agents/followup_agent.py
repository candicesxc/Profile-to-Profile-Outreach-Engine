"""FollowUpAgent - Generates follow-up messages when outreach is accepted."""
from openai import OpenAI
import os
try:
    from backend.logic.sanitizer import enforce_character_limit
except ImportError:
    from logic.sanitizer import enforce_character_limit


class FollowUpAgent:
    """Agent that generates friendly follow-up messages."""
    
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o"
    
    def generate_followup(
        self,
        original_outreach: Dict[str, Any],
        user_profile: Dict[str, Any],
        target_profile: Dict[str, Any]
    ) -> str:
        """Generate a friendly follow-up message."""
        
        prompt = f"""Generate a friendly, low-pressure follow-up message for a LinkedIn connection that was accepted.

Context:
- The original outreach was accepted
- User wants to continue the conversation naturally
- Goal: friendly follow-up with a natural coffee chat ask

User Profile:
- Industries: {', '.join(user_profile.get('industries', []))}
- Background: {str(user_profile.get('work_history', [])[:1])}

Target Profile:
- Industries: {', '.join(target_profile.get('industries', []))}
- Background: {str(target_profile.get('work_history', [])[:1])}

Original Outreach (for context):
LinkedIn: {original_outreach.get('linkedin_connection_request', '')[:100]}

Generate a follow-up message that:
- Is friendly and warm
- References the connection naturally
- Contains a natural, low-pressure coffee chat ask
- Is professional but personable
- MUST be under 1200 characters

Return ONLY the message text, nothing else."""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert at writing friendly, natural follow-up messages. Always keep messages under 1200 characters. Return only the message text."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        followup = response.choices[0].message.content.strip()
        
        # Enforce character limit
        return enforce_character_limit(followup, 1200)

