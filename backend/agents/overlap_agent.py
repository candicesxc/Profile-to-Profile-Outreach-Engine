"""OverlapAgent - Compares user and target profiles to find overlaps."""
from openai import OpenAI
import os
import json
from typing import Dict, Any


class OverlapAgent:
    """Agent that finds overlaps between user and target profiles."""
    
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini"
    
    def find_overlaps(self, user_profile: Dict[str, Any], target_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Find overlaps between user and target profiles."""
        prompt = f"""Compare these two LinkedIn profiles and identify overlaps and alignment opportunities.

User Profile:
{json.dumps(user_profile, indent=2)}

Target Profile:
{json.dumps(target_profile, indent=2)}

Analyze and return a JSON object with:
{{
  "shared_companies": ["company1", "company2", ...],
  "shared_schools": ["school1", "school2", ...],
  "shared_industries": ["industry1", "industry2", ...],
  "skill_overlap": ["skill1", "skill2", ...],
  "alignment": "brief description of how profiles align",
  "personalization_hook_options": ["hook1", "hook2", "hook3"]
}}

Return ONLY the JSON object, nothing else."""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a profile analysis specialist. Compare profiles and identify meaningful overlaps. Always return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2
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
            return json.loads(content)
        except json.JSONDecodeError:
            # Fallback structure
            return {
                "shared_companies": [],
                "shared_schools": [],
                "shared_industries": [],
                "skill_overlap": [],
                "alignment": "",
                "personalization_hook_options": []
            }

