"""Embedding generation utilities."""
from openai import OpenAI
import os
from typing import List


def generate_embedding(text: str) -> List[float]:
    """Generate embedding using text-embedding-3-large."""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    response = client.embeddings.create(
        model="text-embedding-3-large",
        input=text
    )
    
    return response.data[0].embedding

