from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.agent_service import orchestrate_rag
from app.models.chat import Conversation, Message
from app.services.memory_service import get_recent_history, analyze_query_intelligence
from app.services.tool_service import route_query, execute_list_documents, execute_document_metadata, execute_calculate

from typing import List, Optional
import time
import uuid

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    document_ids: Optional[List[str]] = None
    conversation_id: Optional[str] = None

@router.post("/")
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Public Chat Endpoint powered by Agentic RAG with Document-Aware Memory.
    """
    conversation_id = request.conversation_id
    
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
        # Truncate title cleanly without LLM
        title = request.query[:45].strip() + ("..." if len(request.query) > 45 else "")
        new_conv = Conversation(id=conversation_id, title=title)
        db.add(new_conv)
        db.commit()
    else:
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conv:
            conv = Conversation(id=conversation_id, title="Restored Conversation")
            db.add(conv)
            db.commit()

    # Fetch history before adding the new user message
    history = get_recent_history(db, conversation_id)
    
    analysis = analyze_query_intelligence(request.query, history)
    combined_query = analysis.get("combined_query", request.query)
    initial_queries = analysis.get("queries", [request.query])
    query_type = analysis.get("type", "DIRECT")

    # Route the fully resolved query
    route_decision, route_latency = route_query(combined_query, db)
    tool_name = route_decision.get("tool", "search_documents")
    tool_params = route_decision.get("parameters", {})

    # Save user message
    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=request.query
    )
    db.add(user_msg)
    db.commit()

    # Dispatch tool
    if tool_name == "list_documents":
        result = execute_list_documents(db)
    elif tool_name == "document_metadata":
        doc_name = tool_params.get("document_name", "")
        result = execute_document_metadata(db, doc_name)
    elif tool_name == "calculate":
        expr = tool_params.get("expression", "")
        result = execute_calculate(expr)
    else:
        # For search_documents or search_specific_document, use orchestrate_rag
        active_document_ids = request.document_ids
        
        # If search_specific_document, try to find the document_id
        if tool_name == "search_specific_document" and "document_name" in tool_params:
            from app.models.document import Document
            doc_name = tool_params["document_name"]
            found_doc = db.query(Document).filter(Document.filename.ilike(f"%{doc_name}%")).first()
            if found_doc:
                # Restrict search space to this document
                active_document_ids = [found_doc.id]

        result = orchestrate_rag(db, combined_query, initial_queries, active_document_ids, original_query=request.query)

    # Initialize latencies dict if not present
    if "latencies" not in result:
        result["latencies"] = {}
        
    # Inject intelligence latency
    if "latencies" in analysis:
        for k, v in analysis["latencies"].items():
            result["latencies"][k] = round(v, 2)
            
    # Inject route latency
    result["latencies"]["tool_routing"] = round(route_latency, 2)
            
    result["query_type"] = query_type
    result["conversation_id"] = conversation_id

    # Save assistant message
    answer_text = result.get("answer", "")
    citations = result.get("citations", [])
    
    # Serialize citations to JSON-friendly dicts for DB
    db_citations = []
    for c in citations:
        db_citations.append({
            "document_id": c.get("document_id"),
            "lineage": c.get("lineage", {})
        })
        
    asst_msg = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=answer_text,
        citations=db_citations
    )
    db.add(asst_msg)
    db.commit()

    return result
