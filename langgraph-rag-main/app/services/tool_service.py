import logging
import time
import re
import ast
import operator
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.document import Document

logger = logging.getLogger(__name__)

# Safe Math Evaluator
_ALLOWED_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos
}

def safe_calculate(expression: str) -> str:
    expr = expression.replace(" of ", " * ").replace("%", "/100")
    expr = re.sub(r'(?i)^(what is|calculate|evaluate)\s*', '', expr).strip()
    expr = expr.replace("?", "").strip()
    
    def _eval(node):
        if isinstance(node, ast.Constant):
            return node.value
        elif isinstance(node, ast.BinOp):
            return _ALLOWED_OPERATORS[type(node.op)](_eval(node.left), _eval(node.right))
        elif isinstance(node, ast.UnaryOp):
            return _ALLOWED_OPERATORS[type(node.op)](_eval(node.operand))
        else:
            raise ValueError(f"Unsupported syntax: {type(node)}")

    try:
        node = ast.parse(expr, mode='eval').body
        result = _eval(node)
        if isinstance(result, float) and result.is_integer():
            return str(int(result))
        elif isinstance(result, float):
            return f"{result:.4f}".rstrip('0').rstrip('.')
        return str(result)
    except Exception as e:
        logger.error(f"[safe_calculate] Failed to evaluate '{expr}': {e}")
        return f"Could not calculate expression: {expr}"

def route_query(query: str, db: Session) -> Tuple[Dict[str, Any], float]:
    """
    Classifies the query and extracts parameters for the appropriate tool. ZERO LLM CALLS.
    Returns: (routing_decision, latency)
    """
    t0 = time.time()
    
    # 1. Calculate
    calc_match = re.match(r'(?i)^(what is|calculate|evaluate)?\s*([0-9\+\-\*\/\(\)\.\s\%]+)\??$', query)
    if calc_match:
        expr = calc_match.group(2).strip()
        if re.search(r'\d', expr) and not re.search(r'(?i)(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)', query):
            return {"tool": "calculate", "parameters": {"expression": expr}}, time.time() - t0
        
    calc_word_match = re.search(r'(?i)^(what is|calculate)\s+(\d+(?:\.\d+)?)\s*\%\s*of\s*(\d+(?:\.\d+)?)', query)
    if calc_word_match:
        expr = f"{calc_word_match.group(2)}/100 * {calc_word_match.group(3)}"
        return {"tool": "calculate", "parameters": {"expression": expr}}, time.time() - t0

    # 2. List Documents
    if re.search(r'(?i)^(what|show|list).*(documents|files|pdfs).*(uploaded|available|have i|in the system)', query):
        return {"tool": "list_documents", "parameters": {}}, time.time() - t0
        
    # 3. Document Metadata
    meta_match = re.search(r'(?i)(how many pages|when was|what is the status of).*(uploaded|processed|have)?\s*(.*\.pdf)', query)
    if meta_match:
        doc_name = meta_match.group(3).strip().replace("?", "")
        return {"tool": "document_metadata", "parameters": {"document_name": doc_name}}, time.time() - t0
        
    # 4. Specific Document Search
    specific_doc_match = re.search(r'(?i)(?:in|according to|search)\s+(.*?\.pdf)\s*(?:for|what|when)?\s*(.*)', query)
    if specific_doc_match:
        doc_name = specific_doc_match.group(1).strip()
        return {"tool": "search_specific_document", "parameters": {"document_name": doc_name}}, time.time() - t0

    # Default to search_documents for all other queries
    return {"tool": "search_documents", "parameters": {}}, time.time() - t0

def execute_list_documents(db: Session) -> Dict[str, Any]:
    docs = db.query(Document).all()
    if not docs:
        ans = "You have no documents uploaded."
    else:
        ans = "Here are the documents currently in the system:\n"
        for d in docs:
            ans += f"- **{d.filename}** (Status: {d.status})\n"
            
    return {
        "answer": ans,
        "domain_state": "IN_DOMAIN",
        "evidence_state": "SUPPORTED",
        "iterations": 1,
        "tools_used": ["list_documents"],
        "citations": [],
        "latencies": {}
    }

def execute_document_metadata(db: Session, document_name: str) -> Dict[str, Any]:
    doc = db.query(Document).filter(Document.filename.ilike(f"%{document_name}%")).first()
    if not doc:
        ans = f"I could not find a document named '{document_name}' in the system."
        evidence_state = "INSUFFICIENT_EVIDENCE"
    else:
        ans = f"**{doc.filename}** Metadata:\n"
        ans += f"- Status: {doc.status}\n"
        try:
            page_count = len(doc.pages)
            ans += f"- Pages: {page_count}\n"
        except Exception:
            pass
        if doc.created_at:
            ans += f"- Uploaded: {doc.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
        evidence_state = "SUPPORTED"

    return {
        "answer": ans,
        "domain_state": "IN_DOMAIN",
        "evidence_state": evidence_state,
        "iterations": 1,
        "tools_used": ["document_metadata"],
        "citations": [],
        "latencies": {}
    }

def execute_calculate(expression: str) -> Dict[str, Any]:
    result = safe_calculate(expression)
    ans = f"The result of `{expression}` is **{result}**."
    return {
        "answer": ans,
        "domain_state": "IN_DOMAIN",
        "evidence_state": "SUPPORTED",
        "iterations": 1,
        "tools_used": ["calculate"],
        "citations": [],
        "latencies": {}
    }
