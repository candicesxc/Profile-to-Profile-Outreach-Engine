"""FastAPI backend for Profile-to-Profile Outreach Engine."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import re
from dotenv import load_dotenv

try:
    # Try absolute imports (for local development)
    from backend.agents.extractor_agent import ExtractorAgent
    from backend.agents.overlap_agent import OverlapAgent
    from backend.agents.search_agent import SearchAgent
    from backend.agents.message_draft_agent import MessageDraftAgent
    from backend.agents.refinement_agent import RefinementAgent
    from backend.agents.followup_agent import FollowUpAgent
    from backend.logic.sanitizer import sanitize_input
    from backend.logic.storage import (
        save_user_profile,
        load_user_profile,
        load_user_embedding,
        save_history_entry,
        load_history,
        update_history_entry
    )
    from backend.logic.context_parser import parse_context_note
    from backend.logic.embeddings import generate_embedding
except ImportError:
    # Fall back to relative imports (for Render deployment)
    from agents.extractor_agent import ExtractorAgent
    from agents.overlap_agent import OverlapAgent
    from agents.search_agent import SearchAgent
    from agents.message_draft_agent import MessageDraftAgent
    from agents.refinement_agent import RefinementAgent
    from agents.followup_agent import FollowUpAgent
    from logic.sanitizer import sanitize_input
    from logic.storage import (
        save_user_profile,
        load_user_profile,
        load_user_embedding,
        save_history_entry,
        load_history,
        update_history_entry
    )
    from logic.context_parser import parse_context_note
    from logic.embeddings import generate_embedding

# Load environment variables
load_dotenv()

app = FastAPI(title="Profile-to-Profile Outreach Engine")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://candicesxc.github.io",
        "http://localhost:8000",
        "http://localhost:8080",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agents
extractor_agent = ExtractorAgent()
overlap_agent = OverlapAgent()
try:
    search_agent = SearchAgent()
except Exception as e:
    print(f"Warning: SearchAgent initialization failed: {e}. Exa search will be disabled.")
    search_agent = None
message_draft_agent = MessageDraftAgent()
refinement_agent = RefinementAgent()
followup_agent = FollowUpAgent()


def _extract_first_name(profile_text: str) -> str | None:
    """Lightweight heuristic to capture a contact's first name from profile text."""
    if not profile_text:
        return None

    lines = [line.strip() for line in profile_text.split("\n") if line.strip()]
    for line in lines[:5]:
        if any(term in line.lower() for term in ["@", "http", "linkedin", "|"]):
            continue
        words = line.split()
        if 1 <= len(words) <= 3 and words[0][0:1].isupper():
            return words[0]
    return None


def _extract_company(target_profile: dict, profile_text: str) -> str | None:
    """Pull a likely company name from structured profile data or raw text."""
    if target_profile:
        company = target_profile.get("current_company")
        if company:
            return company

        work_history = target_profile.get("work_history") or []
        if work_history and isinstance(work_history, list):
            top_company = work_history[0].get("company") or work_history[0].get("organization")
            if top_company:
                return top_company

    if profile_text:
        match = re.search(r"\b(?:at|@)\s+([A-Z][A-Za-z0-9&.,'\- ]{2,})", profile_text)
        if match:
            return match.group(1).strip()

    return None


def _derive_contact_details(target_profile: dict, profile_text: str) -> dict:
    """Return a small bundle of contact metadata for consistent history titles."""
    name = None
    if target_profile:
        name = (
            target_profile.get("full_name")
            or target_profile.get("name")
            or target_profile.get("first_name")
            or target_profile.get("firstName")
        )

    if not name:
        name = _extract_first_name(profile_text)

    company = _extract_company(target_profile or {}, profile_text)

    return {"contact_name": name, "contact_company": company}


# Request/Response models
class ProfileRequest(BaseModel):
    uuid: str
    profile_text: str


class ProfileResponse(BaseModel):
    success: bool
    message: str


class OutreachRequest(BaseModel):
    uuid: str
    target_profile: str
    context_note: Optional[str] = ""


class OutreachResponse(BaseModel):
    success: bool
    linkedin_connection_request: str
    cold_outreach_email: str
    followup_template: str
    history_id: str


class RefinementRequest(BaseModel):
    uuid: str
    message: str
    refinement_instructions: str
    message_type: str  # "linkedin", "email", "followup"


class RefinementResponse(BaseModel):
    success: bool
    refined_message: str


class FollowUpRequest(BaseModel):
    uuid: str
    history_id: str


class FollowUpResponse(BaseModel):
    success: bool
    followup_message: str


@app.get("/")
def root():
    return {"message": "Profile-to-Profile Outreach Engine API"}


@app.get("/api/user/profile")
async def check_profile(uuid: str):
    """Check if user profile exists."""
    from backend.logic.storage import get_user_dir
    from pathlib import Path
    import json
    
    profile = load_user_profile(uuid)
    if profile:
        # Try to get the original profile text if stored
        user_dir = get_user_dir(uuid)
        profile_text = ""
        # We don't store the original text, so we'll just return that profile exists
        return {
            "exists": True,
            "profile": profile
        }
    return {"exists": False}


@app.post("/api/user/profile", response_model=ProfileResponse)
async def save_profile(request: ProfileRequest):
    """Save and embed user profile."""
    try:
        # Sanitize input
        profile_text = sanitize_input(request.profile_text)
        
        if not profile_text:
            raise HTTPException(status_code=400, detail="Profile text cannot be empty")
        
        # Extract structured data
        profile_data = extractor_agent.extract(profile_text)
        
        # Generate embedding
        embedding = generate_embedding(profile_text)
        
        # Save profile and embedding
        save_user_profile(request.uuid, profile_data, embedding)
        
        return ProfileResponse(
            success=True,
            message="Profile saved successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/outreach/generate", response_model=OutreachResponse)
async def generate_outreach(request: OutreachRequest):
    """Generate outreach messages."""
    try:
        # Load user profile
        user_profile = load_user_profile(request.uuid)
        if not user_profile:
            raise HTTPException(status_code=404, detail="User profile not found. Please save your profile first.")
        
        # Sanitize inputs
        target_profile_text = sanitize_input(request.target_profile)
        context_note = sanitize_input(request.context_note or "")
        
        if not target_profile_text:
            raise HTTPException(status_code=400, detail="Target profile cannot be empty")
        
        # Parse context note
        context_attributes = parse_context_note(context_note)
        
        # Extract target profile
        target_profile = extractor_agent.extract(target_profile_text)
        
        # Find overlaps
        overlap_summary = overlap_agent.find_overlaps(user_profile, target_profile)
        
        # Search for insights
        exa_results = []
        if search_agent:
            try:
                exa_results = search_agent.search(target_profile)
            except Exception as e:
                print(f"Exa search failed: {e}")
                exa_results = []  # Continue without Exa results
        
        # Draft messages
        messages = message_draft_agent.draft_messages(
            user_profile=user_profile,
            target_profile=target_profile,
            overlap_summary=overlap_summary,
            context_attributes=context_attributes,
            exa_results=exa_results
        )
        
        # Save to history
        contact_meta = _derive_contact_details(target_profile, target_profile_text)
        history_entry = {
            "target_profile_text": target_profile_text[:500],  # Store truncated version
            "target_profile": target_profile,
            "context_note": context_note,
            "context_attributes": context_attributes,
            "overlap_summary": overlap_summary,
            "exa_results": exa_results,
            "linkedin_connection_request": messages["linkedin_connection_request"],
            "cold_outreach_email": messages["cold_outreach_email"],
            "followup_template": messages["followup_template"],
            "status": "draft",
            **contact_meta,
        }
        
        history_id = save_history_entry(request.uuid, history_entry)
        
        return OutreachResponse(
            success=True,
            linkedin_connection_request=messages["linkedin_connection_request"],
            cold_outreach_email=messages["cold_outreach_email"],
            followup_template=messages["followup_template"],
            history_id=history_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/outreach/refine", response_model=RefinementResponse)
async def refine_message(request: RefinementRequest):
    """Refine a message based on user instructions."""
    try:
        # Sanitize inputs
        message = sanitize_input(request.message)
        instructions = sanitize_input(request.refinement_instructions)
        
        if not message or not instructions:
            raise HTTPException(status_code=400, detail="Message and instructions are required")
        
        # Refine message
        refined = refinement_agent.refine(
            original_message=message,
            refinement_instructions=instructions,
            message_type=request.message_type
        )
        
        return RefinementResponse(
            success=True,
            refined_message=refined
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/outreach/followup", response_model=FollowUpResponse)
async def generate_followup(request: FollowUpRequest):
    """Generate follow-up message when outreach is accepted."""
    try:
        # Load user profile
        user_profile = load_user_profile(request.uuid)
        if not user_profile:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        # Load history
        history = load_history(request.uuid)
        
        # Find the specific entry
        entry = None
        for h in history:
            if h.get("id") == request.history_id:
                entry = h
                break
        
        if not entry:
            raise HTTPException(status_code=404, detail="History entry not found")
        
        # Generate follow-up
        followup_message = followup_agent.generate_followup(
            original_outreach=entry,
            user_profile=user_profile,
            target_profile=entry.get("target_profile", {})
        )
        
        # Update history entry
        update_history_entry(request.uuid, request.history_id, {
            "status": "accepted",
            "followup_message": followup_message
        })
        
        return FollowUpResponse(
            success=True,
            followup_message=followup_message
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history/{uuid}")
async def get_history(uuid: str):
    """Get user's outreach history."""
    try:
        history = load_history(uuid)
        # Return simplified version for frontend
        return {
            "success": True,
            "history": [
                {
                    "id": h.get("id"),
                    "timestamp": h.get("timestamp"),
                    "status": h.get("status", "draft"),
                    "target_preview": h.get("target_profile_text", "")[:100],
                    "contact_name": h.get("contact_name") or _derive_contact_details(
                        h.get("target_profile", {}),
                        h.get("target_profile_text", "")
                    ).get("contact_name"),
                    "contact_company": h.get("contact_company") or _derive_contact_details(
                        h.get("target_profile", {}),
                        h.get("target_profile_text", "")
                    ).get("contact_company"),
                }
                for h in history
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history/{uuid}/{history_id}")
async def get_history_entry(uuid: str, history_id: str):
    """Get a specific history entry."""
    try:
        history = load_history(uuid)
        
        for entry in history:
            if entry.get("id") == history_id:
                # Populate contact metadata for older entries that may not have it yet
                contact_meta = _derive_contact_details(
                    entry.get("target_profile", {}),
                    entry.get("target_profile_text", "")
                )
                entry.setdefault("contact_name", contact_meta.get("contact_name"))
                entry.setdefault("contact_company", contact_meta.get("contact_company"))
                return {
                    "success": True,
                    "entry": entry
                }
        
        raise HTTPException(status_code=404, detail="History entry not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

