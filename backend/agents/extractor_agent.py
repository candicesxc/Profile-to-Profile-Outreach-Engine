"""ExtractorAgent - Extracts structured data from LinkedIn profiles."""
from crewai import Agent
from openai import OpenAI
import os
import json
from typing import Dict, Any


class ExtractorAgent:
    """Agent that extracts structured JSON from LinkedIn profile text."""
    
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini"
    
    def extract(self, profile_text: str) -> Dict[str, Any]:
        """Extract structured data from profile text."""
        prompt = f"""Extract structured information from this LinkedIn profile text. Return ONLY valid JSON, no markdown or extra text.

Profile text:
{profile_text}

Extract and return a JSON object with these fields:
{{
  "work_history": [{{"company": "...", "role": "...", "duration": "...", "responsibilities": "..."}}],
  "education": [{{"school": "...", "degree": "...", "field": "..."}}],
  "skills": ["skill1", "skill2", ...],
  "industries": ["industry1", "industry2", ...],
  "achievements": ["achievement1", "achievement2", ...],
  "keywords": ["keyword1", "keyword2", ...],
  "tone_indicators": {{"professional": true/false, "casual": true/false, "technical": true/false}}
}}

Return ONLY the JSON object, nothing else."""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a data extraction specialist. Extract structured information from LinkedIn profiles. Always return valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
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
            # Fallback structure if parsing fails
            return {
                "work_history": [],
                "education": [],
                "skills": [],
                "industries": [],
                "achievements": [],
                "keywords": [],
                "tone_indicators": {}
            }

