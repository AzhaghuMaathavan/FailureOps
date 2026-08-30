import logging
from typing import List, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

def compress_context(query: str, evidence_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not evidence_list:
        return evidence_list
        
    compressed_evidence = []
    
    # Import here to avoid circular dependencies if any
    from app.services.agent_service import call_llm
    
    sys_prompt = (
        "You are an Evidence Compression Assistant for an Agentic RAG system.\n"
        "Your task is to extract ONLY the information from the SOURCE CONTENT that is directly relevant to answering the QUESTION.\n"
        "CRITICAL RULES:\n"
        "- Do not generate answers or draw conclusions.\n"
        "- Do not add outside knowledge.\n"
        "- Extract verbatim where possible.\n"
        "- Preserve numerical values, dates, codes exactly.\n"
        "- Preserve table relationships (e.g. keep the row/column structure if extracting from a table).\n"
        "- If nothing is relevant, output an empty string.\n"
        "- Return plain text, not JSON.\n"
    )

    for chunk in evidence_list:
        content = chunk.get("content", "")
        # Heuristic: if it's already short, don't compress to save latency
        if len(content) < settings.CONTEXT_COMPRESSION_MIN_CHARS:
            chunk["compressed_content"] = content
            compressed_evidence.append(chunk)
            continue
            
        lineage = chunk.get("lineage", {})
        doc_name = lineage.get("document_name", "Unknown Document")
        page_nums = lineage.get("page_numbers", [])
        page_str = f"Pages {', '.join(map(str, page_nums))}" if page_nums else "Unknown Page"
        
        user_prompt = (
            f"QUESTION: {query}\n\n"
            f"SOURCE DOCUMENT: {doc_name}\n"
            f"SOURCE PAGE: {page_str}\n"
            f"SOURCE CONTENT:\n{content}\n"
        )
        
        try:
            compressed_text = call_llm(sys_prompt, user_prompt, json_mode=False)
            compressed_text = compressed_text.strip()
            
            if len(compressed_text) > settings.CONTEXT_COMPRESSION_MAX_CHARS:
                compressed_text = compressed_text[:settings.CONTEXT_COMPRESSION_MAX_CHARS]
                
            chunk["compressed_content"] = compressed_text if compressed_text else "No directly relevant context found in this chunk."
        except Exception as e:
            logger.error(f"[compress_context] Error compressing chunk: {e}")
            chunk["compressed_content"] = content
            
        compressed_evidence.append(chunk)
        
    return compressed_evidence
