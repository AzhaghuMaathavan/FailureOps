import logging
import time
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.chat import Conversation, Message

logger = logging.getLogger(__name__)

CHAT_MEMORY_WINDOW = 8

def get_recent_history(db: Session, conversation_id: str) -> List[Message]:
    return db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.desc()).limit(CHAT_MEMORY_WINDOW).all()[::-1]

def analyze_query_intelligence(query: str, history: List[Message]) -> Dict[str, Any]:
    """
    Lightweight heuristic analyzer. ZERO LLM CALLS.
    """
    t_understand = time.time()
    
    # Simple heuristic pronoun resolution
    combined_query = query
    query_lower = query.lower()
    pronouns = [" he ", " she ", " it ", " they ", " them ", " this ", " that ", " these ", " those "]
    
    if history and any(p in f" {query_lower} " for p in pronouns):
        # Look back for nouns. Simple heuristic: prepend the last user query context
        for msg in reversed(history):
            if msg.role == "user":
                combined_query = f"{msg.content} -> {query}"
                break
                
    return {
        "type": "DIRECT",
        "queries": [combined_query],
        "combined_query": combined_query,
        "latencies": {
            "query_understanding": time.time() - t_understand
        }
    }
