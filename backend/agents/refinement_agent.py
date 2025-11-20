"""RefinementAgent - Refines messages based on free-text instructions."""
from openai import OpenAI
import os
from backend.logic.sanitizer import enforce_character_limit


class RefinementAgent:
    """Agent that refines messages based on user feedback."""
    
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o"
    
    def refine(
        self,
        original_message: str,
        refinement_instructions: str,
        message_type: str = "general"  # "linkedin", "email", "followup"
    ) -> str:
        """Refine a message based on free-text instructions."""
        
        # Determine character limit based on message type
        char_limit = 300 if message_type == "linkedin" else 1200
        
        prompt = f"""Refine this message based on the user's instructions.

Original Message:
{original_message}

User Instructions:
{refinement_instructions}

Refine the message according to the instructions while:
- Preserving personalization and accuracy
- Maintaining professional tone (unless instructed otherwise)
- Keeping the core message intact
- Following the character limit of {char_limit} characters

Return ONLY the refined message text, nothing else. The message MUST be under {char_limit} characters."""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": f"You are a message refinement specialist. Always respect the {char_limit} character limit. Return only the refined message text."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        refined = response.choices[0].message.content.strip()
        
        # Enforce character limit
        return enforce_character_limit(refined, char_limit)

