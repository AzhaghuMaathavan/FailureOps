import logging
import re
from typing import Dict, Any

logger = logging.getLogger(__name__)

def analyze_query(query: str) -> Dict[str, Any]:
    """
    Lightweight heuristic analyzer for retrieval scope. ZERO LLM CALLS.
    """
    q_lower = query.lower()
    
    scope = "UNKNOWN"
    
    # 1. EXACT_LOOKUP
    if re.search(r'\b(reg no|register no|id|identifier|roll no)\b', q_lower) or re.search(r'\b\d{10,20}\b', q_lower):
        scope = "EXACT_LOOKUP"
    # 2. EXHAUSTIVE_LIST (Includes counts, plurals, and filtered entity queries)
    elif any(kw in q_lower for kw in ["all", "every", "list", "entire", "complete", "how many", "how much"]) or re.search(r'\b(which|what|who)\s+(are\b|\w+s\b|student|course|department|record|employee|person|user|item|entity|candidate|detail|name)\b', q_lower):
        scope = "EXHAUSTIVE_LIST"
    # 3. SEMANTIC / CONCEPTUAL
    elif any(kw in q_lower for kw in ["how ", "why ", "explain", "describe", "process", "reason", "policy"]):
        scope = "SEMANTIC"
    # 4. MULTI_CONDITION
    elif " and " in q_lower or " both " in q_lower:
        scope = "MULTI_CONDITION"
    # 5. SIMPLE_FACTUAL
    elif any(kw in q_lower for kw in ["who ", "what ", "where ", "when ", "which ", "fee", "cost", "intake", "duration", "chairperson"]):
        scope = "SIMPLE_FACTUAL"

    keywords = [w for w in re.sub(r'[^a-zA-Z0-9\s]', '', q_lower).split() if len(w) > 3]

    # Simple date extraction heuristic
    date_mentions = []
    date_pattern = r'\b((?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)\b|\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b'
    for match in re.finditer(date_pattern, q_lower):
        date_mentions.append(match.group(0))
        
    department = None
    deps = ["cse", "ece", "mech", "civil", "it", "eee", "cs", "computer science", "mechanical", "electrical"]
    for d in deps:
        if f" {d} " in f" {q_lower} ":
            department = d
            break

    # Determine Logical Operation for Multi-target queries
    logical_operation = "SINGLE_TARGET"
    targets = [query]
    
    if any(kw in q_lower for kw in ["compare", "difference", "vs ", "versus"]):
        logical_operation = "COMPARISON"
        if " and " in q_lower:
            targets = [t.strip() for t in query.split(" and ") if t.strip()]
        elif " vs " in q_lower:
            targets = [t.strip() for t in query.split(" vs ") if t.strip()]
    elif any(kw in q_lower for kw in ["both", "as well as", "simultaneously"]):
        logical_operation = "INTERSECTION"
        if " as well as " in q_lower:
            targets = [t.strip() for t in query.split(" as well as ") if t.strip()]
        elif " and " in q_lower:
            targets = [t.strip() for t in query.split(" and ") if t.strip()]
    elif " and " in q_lower or " or " in q_lower:
        # Default interpretation of "and" in list queries is UNION unless "both" is specified
        logical_operation = "UNION"
        if " and " in q_lower:
            targets = [t.strip() for t in query.split(" and ") if t.strip()]
        else:
            targets = [t.strip() for t in query.split(" or ") if t.strip()]

    # Fallback to single target if splitting failed or resulted in 1 item
    if len(targets) <= 1:
        logical_operation = "SINGLE_TARGET"
        targets = [query]

    return {
        "retrieval_scope": scope,
        "logical_operation": logical_operation,
        "targets": targets,
        "domain_concepts": [],
        "date_mentions": date_mentions,
        "department": department,
        "academic_year": None,
        "semester": None,
        "document_types": [],
        "keywords": keywords
    }
