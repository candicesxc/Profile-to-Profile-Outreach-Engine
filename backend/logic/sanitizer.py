"""Input sanitization utilities."""
import re
import html


def sanitize_input(text: str, max_length: int = 8000) -> str:
    """
    Sanitize user input by:
    - Stripping HTML tags
    - Removing scripts
    - Removing injection attempts
    - Enforcing max length
    """
    if not text:
        return ""
    
    # Decode HTML entities
    text = html.unescape(text)
    
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Remove script tags and content
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove common injection attempts
    injection_patterns = [
        r'ignore\s+previous\s+instructions',
        r'system\s*:',
        r'you\s+are\s+now',
        r'forget\s+everything',
        r'new\s+instructions',
    ]
    for pattern in injection_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Trim and enforce max length
    text = text.strip()[:max_length]
    
    return text


def enforce_character_limit(text: str, max_chars: int) -> str:
    """Enforce character limit, preserving meaning if possible."""
    if len(text) <= max_chars:
        return text
    
    # Try to truncate at sentence boundary
    truncated = text[:max_chars]
    last_period = truncated.rfind('.')
    last_exclamation = truncated.rfind('!')
    last_question = truncated.rfind('?')
    
    last_sentence_end = max(last_period, last_exclamation, last_question)
    
    if last_sentence_end > max_chars * 0.8:  # If we can keep 80% of content
        return truncated[:last_sentence_end + 1]
    
    # Otherwise, truncate at word boundary
    last_space = truncated.rfind(' ')
    if last_space > max_chars * 0.8:
        return truncated[:last_space] + '...'
    
    return truncated[:max_chars] + '...'

