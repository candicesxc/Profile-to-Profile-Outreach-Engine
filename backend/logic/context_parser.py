"""Parse context note into structured attributes."""
from typing import Dict, Any


def parse_context_note(context_note: str) -> Dict[str, Any]:
    """
    Parse free-text context note into:
    - outreach_goal
    - connection_context
    - personal_hook
    """
    if not context_note or not context_note.strip():
        return {
            "outreach_goal": "learn about their work",
            "connection_context": "no prior connection",
            "personal_hook": ""
        }
    
    context_note = context_note.strip()
    
    # Default values
    result = {
        "outreach_goal": "learn about their work",
        "connection_context": "no prior connection",
        "personal_hook": ""
    }
    
    # Simple keyword-based parsing (can be enhanced with LLM if needed)
    context_lower = context_note.lower()
    
    # Check for connection context keywords
    if any(word in context_lower for word in ["met", "conference", "event", "summit", "talk", "presentation"]):
        result["connection_context"] = context_note
    
    # Check for goal keywords
    if any(word in context_lower for word in ["coffee", "chat", "meet", "connect"]):
        result["outreach_goal"] = "coffee chat or meeting"
    elif any(word in context_lower for word in ["curious", "explore", "learn", "interested"]):
        result["outreach_goal"] = "learn about their work"
    elif any(word in context_lower for word in ["role", "position", "team"]):
        result["outreach_goal"] = "explore their role/team"
    
    # Check for personal hook keywords
    if any(word in context_lower for word in ["also", "share", "similar", "same", "both"]):
        result["personal_hook"] = context_note
    
    # If no specific patterns match, use the whole note as context
    if result["connection_context"] == "no prior connection" and result["personal_hook"] == "":
        # Try to infer - if it's short, might be a hook; if longer, might be context
        if len(context_note) < 50:
            result["personal_hook"] = context_note
        else:
            result["connection_context"] = context_note
    
    return result

