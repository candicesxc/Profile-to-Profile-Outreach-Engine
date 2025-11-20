"""SearchAgent - Uses Exa Search API to find relevant company/role insights."""
from exa_py import Exa
import os
from typing import List, Dict, Any


class SearchAgent:
    """Agent that searches for relevant company news and insights using Exa."""
    
    def __init__(self):
        api_key = os.getenv("EXA_API_KEY")
        if not api_key:
            raise ValueError("EXA_API_KEY environment variable not set")
        self.client = Exa(api_key=api_key)
    
    def search(self, target_profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Search for relevant company news and role insights."""
        results = []
        
        # Extract search terms from target profile
        companies = []
        industries = []
        roles = []
        
        if "work_history" in target_profile:
            for work in target_profile.get("work_history", []):
                if work.get("company"):
                    companies.append(work["company"])
                if work.get("role"):
                    roles.append(work["role"])
        
        if "industries" in target_profile:
            industries = target_profile.get("industries", [])
        
        # Build search queries
        queries = []
        
        # Company news query
        if companies:
            queries.append(f"recent news about {companies[0]}")
        
        # Industry insights query
        if industries:
            queries.append(f"trends in {industries[0]} industry")
        
        # Role insights query
        if roles:
            queries.append(f"insights about {roles[0]} role")
        
        # If no specific queries, use a general one
        if not queries:
            queries.append("professional networking insights")
        
        # Execute searches (limit to top 1-3 results)
        for query in queries[:2]:  # Limit to 2 queries
            try:
                search_results = self.client.search(
                    query=query,
                    num_results=2,
                    use_autoprompt=True
                )
                
                for result in search_results.results[:2]:  # Top 2 per query
                    results.append({
                        "title": result.title or "",
                        "url": result.url or "",
                        "summary": result.text[:200] if result.text else "",  # Brief summary
                        "query": query
                    })
            except Exception as e:
                # If Exa fails, continue without results
                print(f"Exa search error: {e}")
                continue
        
        # Return top 1-3 items
        return results[:3]

