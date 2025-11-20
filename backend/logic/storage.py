"""JSON-based persistent storage utilities."""
import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
import uuid as uuid_lib


def get_user_dir(uuid: str) -> Path:
    """Get the user data directory for a given UUID."""
    # Try to find the backend directory
    current_file = Path(__file__)
    # If we're in backend/logic/, go up two levels
    if current_file.parts[-2] == "logic":
        base_dir = current_file.parent.parent / "data" / "users" / uuid
    else:
        # Fallback: use current directory
        base_dir = Path("backend/data/users") / uuid
    base_dir.mkdir(parents=True, exist_ok=True)
    return base_dir


def save_user_profile(uuid: str, profile_data: Dict[str, Any], embedding: list) -> None:
    """Save user profile and embedding."""
    user_dir = get_user_dir(uuid)
    
    profile_file = user_dir / "my_profile.json"
    embedding_file = user_dir / "my_profile_embedding.json"
    
    with open(profile_file, 'w') as f:
        json.dump(profile_data, f, indent=2)
    
    with open(embedding_file, 'w') as f:
        json.dump(embedding, f, indent=2)


def load_user_profile(uuid: str) -> Optional[Dict[str, Any]]:
    """Load user profile."""
    user_dir = get_user_dir(uuid)
    profile_file = user_dir / "my_profile.json"
    
    if not profile_file.exists():
        return None
    
    with open(profile_file, 'r') as f:
        return json.load(f)


def load_user_embedding(uuid: str) -> Optional[list]:
    """Load user profile embedding."""
    user_dir = get_user_dir(uuid)
    embedding_file = user_dir / "my_profile_embedding.json"
    
    if not embedding_file.exists():
        return None
    
    with open(embedding_file, 'r') as f:
        return json.load(f)


def save_history_entry(uuid: str, entry: Dict[str, Any]) -> str:
    """Save a history entry and return its ID."""
    user_dir = get_user_dir(uuid)
    history_file = user_dir / "history.json"
    
    # Load existing history
    if history_file.exists():
        with open(history_file, 'r') as f:
            history = json.load(f)
    else:
        history = []
    
    # Generate entry ID
    entry_id = str(uuid_lib.uuid4())
    entry['id'] = entry_id
    
    # Add timestamp if not present
    if 'timestamp' not in entry:
        from datetime import datetime
        entry['timestamp'] = datetime.now().isoformat()
    
    history.append(entry)
    
    # Save back
    with open(history_file, 'w') as f:
        json.dump(history, f, indent=2)
    
    return entry_id


def load_history(uuid: str) -> list:
    """Load user history."""
    user_dir = get_user_dir(uuid)
    history_file = user_dir / "history.json"
    
    if not history_file.exists():
        return []
    
    with open(history_file, 'r') as f:
        return json.load(f)


def update_history_entry(uuid: str, entry_id: str, updates: Dict[str, Any]) -> bool:
    """Update a specific history entry."""
    user_dir = get_user_dir(uuid)
    history_file = user_dir / "history.json"
    
    if not history_file.exists():
        return False
    
    with open(history_file, 'r') as f:
        history = json.load(f)
    
    # Find and update entry
    for entry in history:
        if entry.get('id') == entry_id:
            entry.update(updates)
            with open(history_file, 'w') as f:
                json.dump(history, f, indent=2)
            return True
    
    return False

