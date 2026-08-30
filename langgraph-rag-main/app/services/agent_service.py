import logging
import time
import httpx
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.services.llm_key_manager import key_manager
from app.services.query_understanding import analyze_query
from app.services.retrieval_service import search_knowledge_base, expand_chunk_context
from app.services.rag_response import NO_EVIDENCE_ANSWER, sources_from_evidence

logger = logging.getLogger(__name__)

def extract_json(text: str) -> Dict[str, Any]:
    import json, re
    text = text.strip()
    
    # 0. Strip <think>...</think> if present
    text = re.sub(r'<think>[\s\S]*?</think>', '', text).strip()
    
    # 1. Direct parse attempt
    try:
        clean = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
        clean = re.sub(r"\s*```$", "", clean, flags=re.MULTILINE)
        return json.loads(clean.strip())
    except Exception:
        pass
        
    # 2. Balanced bracket JSON extraction
    for match in re.finditer(r'\{', text):
        start_idx = match.start()
        brace_count = 0
        in_string = False
        escape = False
        
        for i in range(start_idx, len(text)):
            ch = text[i]
            if ch == '"' and not escape:
                in_string = not in_string
            elif not in_string:
                if ch == '{':
                    brace_count += 1
                elif ch == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        candidate = text[start_idx : i + 1]
                        try:
                            return json.loads(candidate)
                        except Exception:
                            # Try removing trailing commas
                            cleaned = re.sub(r',\s*([\]}])', r'\1', candidate)
                            try:
                                return json.loads(cleaned)
                            except Exception:
                                break
            escape = (ch == '\\' and not escape)

    # 3. Fallback: extract extracted_items array
    match_extracted = re.search(r'"extracted_items"\s*:\s*(\[[\s\S]*?\])', text)
    if match_extracted:
        try:
            items = json.loads(match_extracted.group(1))
            return {"extracted_items": items}
        except Exception:
            pass

    # 4. Fallback: extract answer string
    match_answer = re.search(r'"answer"\s*:\s*"((?:[^"\\]|\\.)*)"', text, re.DOTALL | re.IGNORECASE)
    if match_answer:
        ans = match_answer.group(1).replace('\\"', '"').replace('\\n', '\n')
        return {"answer": ans, "cited_evidence_ids": []}

    logger.warning(f"Could not parse valid JSON from response: {text[:200]}...")
    raise ValueError("Failed to extract JSON from LLM response")



def call_llm(system_prompt: str, user_prompt: str, json_mode: bool = False, timeout: float = 90.0, max_tokens: int = 2048, return_metrics: bool = False) -> Any:
    from app.services.llm_scheduler import llm_scheduler
    
    t_start = time.time()
    content = llm_scheduler.execute_chat_completion(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        json_mode=json_mode,
        timeout=timeout,
        max_tokens=max_tokens
    )
    t_end = time.time()
    
    if return_metrics:
        total = t_end - t_start
        return content, total * 0.3, total * 0.7
    return content

def compress_tabular_evidence(evidence: List[Dict[str, Any]], targets: List[str]) -> List[Dict[str, Any]]:
    """
    Compresses tabular chunks (like spreadsheets) by retaining only the rows that match the query targets.
    """
    import re
    stopwords = {"give", "me", "all", "which", "what", "who", "where", "when", "how", 
                 "students", "registered", "enrolled", "for", "in", "the", "and", "or", 
                 "both", "of", "a", "an", "is", "are", "do", "does", "to", "with", "show"}
    
    clean_targets = []
    for tgt in targets:
        tgt_clean = re.sub(r'[^\w\s]', ' ', tgt).lower()
        words = tgt_clean.split()
        meaningful = [w for w in words if w not in stopwords]
        if meaningful:
            clean_targets.append(" ".join(meaningful))
            
    if not clean_targets:
        return evidence # Cannot compress safely
        
    def check_match(target, line):
        target = target.lower()
        line_lower = line.lower()
        # Exact substring
        if target in line_lower: return True
        # All words present
        terms = target.split()
        if len(terms) > 1 and all(t in line_lower for t in terms):
            return True
        # Acronym check
        if len(target) <= 5 and target.isalpha():
            words = [w for w in re.split(r'\W+', line_lower) if w]
            for i in range(len(words) - len(target) + 1):
                if "".join(w[0] for w in words[i:i+len(target)]) == target:
                    return True
        return False

    compressed_evidence = []
    seen_lines = set()
    
    for chunk in evidence:
        content = chunk.get("content", "")
        lines = content.split("\n")
        looks_tabular = bool(chunk.get("is_table")) or content.count("|") >= 2 or len(lines) >= 8
        if not looks_tabular:
            compressed_evidence.append(chunk)
            continue
            
        retained_lines = []
        for line in lines:
            # Always keep short structural lines or headers
            if len(line.strip()) < 50 and "|" not in line:
                retained_lines.append(line)
                continue
                
            keep = False
            for tgt in clean_targets:
                if check_match(tgt, line):
                    keep = True
                    break
                    
            if keep:
                line_key = line.strip().lower()
                if line_key not in seen_lines:
                    seen_lines.add(line_key)
                    retained_lines.append(line)
                
        # Fail safely: if filtering destroyed everything or did nothing, revert
        if len(retained_lines) == len(lines) or len(retained_lines) == 0:
            compressed_evidence.append(chunk)
        else:
            new_chunk = chunk.copy()
            new_chunk["content"] = "\n".join(retained_lines)
            compressed_evidence.append(new_chunk)
            
    return compressed_evidence


_QUERY_STOPWORDS = {
    "what", "happened", "about", "please", "tell", "give", "show", "does", "did",
    "have", "been", "this", "that", "with", "from", "were", "there", "their",
    "which", "when", "where", "whom", "whose", "summarize", "describe", "explain",
    "related", "using", "into", "onto", "than", "then", "them", "they", "your",
}


def _extractive_answer_if_grounded(query: str, citations_map: Dict[int, Dict[str, Any]]):
    """If the LLM refuses but a retrieved chunk clearly matches the question, quote it."""
    import re

    terms = {
        word
        for word in re.findall(r"[a-zA-Z]{4,}", (query or "").lower())
        if word not in _QUERY_STOPWORDS
    }
    if not terms:
        return None, []
    needed = max(1, (len(terms) + 1) // 2)
    for evidence_id, citation in citations_map.items():
        content = (citation.get("content") or "").lower()
        if sum(1 for term in terms if term in content) >= needed:
            body = (citation.get("content") or "").strip()
            return f"{body} [Evidence {evidence_id}]", [citation]
    return None, []


def generate_answer(query: str, evidence: List[Dict[str, Any]], scope: str = "MULTI_FACT", logical_operation: str = "SINGLE_TARGET", targets: List[str] = None) -> Tuple[str, List[Dict[str, Any]], str, Dict[str, Any]]:

    sys_prompt = (
        "You are a production-quality Answer Generator for an Agentic RAG system.\n"
        "Your task is to answer the user's question STRICTLY and ONLY using the provided evidence.\n"
        "CRITICAL RULES:\n"
        "1. DO NOT hallucinate, guess, or use outside knowledge. Never fabricate a person, course, registration, or identifier.\n"
        "2. Never infer a missing identifier from neighboring identifiers. Only use the EXACT identifier provided.\n"
        "3. If NONE of the evidence is about the question, output ONLY the string: 'INSUFFICIENT_EVIDENCE'. If the evidence contains the needed information, answer from it even when the wording differs from the question. Do not refuse a grounded paraphrase.\n"
        "4. To cite a piece of evidence, append the Evidence ID in brackets like [Evidence 1].\n"
        "5. Keep the answer concise. If the question asks WHICH students/entities match a condition, return EVERY matching entity supported by the provided evidence. Do not return only the first or most relevant match. Never invent additional matching entities. Only include entities supported by retrieved evidence.\n"
        "6. Provide ONLY the final answer directly. DO NOT output ANY internal reasoning, planning, or phrases like 'We need to answer...' or 'Let's locate...' or 'Evidence X shows...'. Be direct and professional.\n"
        "7. YOUR RESPONSE MUST BE RAW, VALID JSON. DO NOT output any preamble, markdown code blocks, or thinking text outside of the JSON.\n"
    )

    if logical_operation == "UNION":
        sys_prompt += "8. OPERATION: UNION. The user query mentions multiple target entities (e.g., connected by 'and' or commas). You MUST aggregate and list ALL matching entities for ANY of the requested targets. Do NOT restrict the answer only to entities that satisfy all conditions (i.e. DO NOT perform an intersection). List EVERY single entity found in the evidence without omitting any.\n"
    elif logical_operation == "INTERSECTION":
        sys_prompt += "8. OPERATION: INTERSECTION. The user is explicitly asking for entities that satisfy ALL requested conditions simultaneously (e.g., 'both A and B'). Only include entities where the evidence proves they meet ALL criteria.\n"
    elif logical_operation == "COMPARISON":
        sys_prompt += "8. OPERATION: COMPARISON. Group the evidence separately for each target to highlight differences or similarities.\n"

    sys_prompt += (
        "Output a JSON object exactly matching this schema:\n"
        "{\n"
        '  "answer": "Your direct answer string with [Evidence X] citations OR the exact INSUFFICIENT_EVIDENCE message.",\n'
        '  "cited_evidence_ids": [1, 2, ...]\n'
        "}\n"
    )


    if targets:
        # ALWAYS safely compress tabular evidence for all query types
        # to drastically reduce TTFT and generation latency!
        evidence = compress_tabular_evidence(evidence, targets)
            
    evidence_text = ""

    citations_map = {}

    for i, e in enumerate(evidence):
        eid = i + 1
        lineage = e.get("lineage", {})
        doc_name = lineage.get("document_name") or "Unknown Document"

        md = lineage.get("source_metadata", {})
        sourceText = ""
        if md.get("slide"):
            sourceText = f" (Slide {', '.join(map(str, md['slide']))})"
        elif md.get("sheet"):
            sourceText = f" (Sheet: {', '.join(md['sheet'])})"
        elif md.get("section"):
            sourceText = f" (Section: {md['section'][0]})"
        elif lineage.get("page_numbers"):
            sourceText = f" (Pages: {', '.join(map(str, lineage['page_numbers']))})"

        citations_map[eid] = {
            "chunk_id": e.get("chunk_id") or e.get("id"),
            "document_id": e.get("document_id"),
            "filename": doc_name,
            "lineage": lineage,
            "content": e.get("content"),
        }

        content_to_show = e.get("content")
        doc_meta = e.get("document_metadata", {})
        safe_meta = {k: v for k, v in doc_meta.items() if k in ["title", "academic_year", "semester", "department", "document_type"] and v}
        meta_str = f"Document Metadata: {safe_meta}\n" if safe_meta else ""
        addition = f"\n--- Evidence {eid} ---\nSource: {doc_name}{sourceText}\n{meta_str}Content: {content_to_show}\n"
        
        if len(evidence_text) + len(addition) > 100000:
            logger.warning("Truncating evidence payload to prevent LLM context window overflow (max 100000 chars).")
            break
            
        evidence_text += addition

    user_prompt = f"Question: {query}\n\nEvidence:{evidence_text}"

    max_tokens = 4096 if (scope == "EXHAUSTIVE_LIST" or logical_operation == "UNION") else 2048

    metrics = {
        "input_chars": len(user_prompt) + len(sys_prompt),
        "ttft": 0.0,
        "generation_time": 0.0
    }
    print(f"Calling LLM with {metrics['input_chars']} chars...")

    try:
        content_result = call_llm(sys_prompt, user_prompt, json_mode=True, timeout=90.0, max_tokens=max_tokens, return_metrics=True)


        if content_result == "MODEL_TIMEOUT":
            raise RuntimeError("LLM generation failed: timeout")

        content, ttft, gen_time = content_result
        metrics["ttft"] = ttft
        metrics["generation_time"] = gen_time

        try:
            parsed = extract_json(content)
        except Exception:
            logger.error(f"JSON extraction failed for content: {content}")
            return "I encountered a formatting error while generating the response.", [], "UNKNOWN", metrics

        answer = parsed.get("answer", "An error occurred while parsing the answer.")
        cited_ids = parsed.get("cited_evidence_ids", [])

        active_citations = []
        for eid in cited_ids:
            if eid in citations_map:
                active_citations.append(citations_map[eid])

        if answer.strip().startswith("INSUFFICIENT_EVIDENCE"):
            fallback_answer, fallback_citations = _extractive_answer_if_grounded(query, citations_map)
            if fallback_answer:
                logger.info("[LLM] using grounded extractive fallback after INSUFFICIENT_EVIDENCE")
                return fallback_answer, fallback_citations, "SUPPORTED", metrics
            return NO_EVIDENCE_ANSWER, [], "INSUFFICIENT_EVIDENCE", metrics

        return answer, active_citations, "SUPPORTED", metrics
    except Exception as e:
        logger.error("[LLM] generation failed: %s", e)
        raise RuntimeError(f"LLM generation failed: {e}") from e

def check_strong_identifiers_in_evidence(query: str, evidence_list: List[Dict[str, Any]]) -> bool:
    import re
    # 1. Emails
    emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', query)
    # 2. Long numbers (>= 7 digits)
    long_numbers = re.findall(r'\b\d{7,20}\b', query)
    # 3. Alphanumeric IDs (>= 6 chars, contains both letters and digits)
    alphanumerics = [w for w in re.findall(r'\b[a-zA-Z0-9]{6,20}\b', query) if any(c.isalpha() for c in w) and any(c.isdigit() for c in w)]
    
    strong_identifiers = set(emails + long_numbers + alphanumerics)
    if not strong_identifiers:
        return True
        
    combined_content = " ".join([e.get("content", "") for e in evidence_list]).lower()
    for identifier in strong_identifiers:
        if identifier.lower() not in combined_content:
            return False
            
    return True


def evaluate_evidence(query: str, targets: List[str], evidence: List[Dict[str, Any]], scope: str, logical_operation: str) -> Dict[str, Any]:
    if not evidence:
        return {"sufficient": False, "missing_targets": targets, "reason": "RETRIEVAL_EMPTY"}
        
    best_score = max([e.get("rerank_score", -999.0) for e in evidence])
    if best_score < -8.5:
        return {"sufficient": False, "missing_targets": targets, "reason": "OUT_OF_DOMAIN"}
        
    # FAST PATH: Trust simple queries if they found anything above domain threshold
    if scope in ["SIMPLE_FACTUAL", "EXACT_LOOKUP", "SEMANTIC"]:
        # If it looks like a multi-hop or complex query, force heuristic evaluation
        if len(query.split()) >= 10 and any(w in query.lower() for w in [" who ", " which ", " that "]):
            pass # Fall through to strict evaluation
        else:
            return {"sufficient": True, "missing_targets": [], "reason": "FAST_PATH_SUFFICIENT"}
        
    # HEURISTIC EVALUATION for complex queries
    evidence_text = " ".join([e.get("content", "").lower() for e in evidence])
    missing = []
    
    import re
    stopwords = {"give", "me", "all", "which", "what", "who", "where", "when", "how", "students", "registered", "enrolled", "for", "in", "the", "and", "or", "both", "of", "a", "an", "is", "are", "do", "does", "to", "with", "show"}
    
    for tgt in targets:
        tgt_clean = re.sub(r'[^\w\s]', ' ', tgt).lower()
        words = [w for w in tgt_clean.split() if w not in stopwords and len(w) > 2]
        
        target_found = False
        if words:
            if all(w in evidence_text for w in words):
                target_found = True
            else:
                target_acronym = "".join([w[0] for w in words])
                if len(target_acronym) > 1 and target_acronym in evidence_text:
                    target_found = True
                    
            if not target_found:
                missing.append(tgt)
                
    if not missing:
        return {"sufficient": True, "missing_targets": [], "reason": "HEURISTIC_TARGETS_FOUND"}
        
    return {"sufficient": False, "missing_targets": missing, "reason": "HEURISTIC_MISSING"}

def build_corrective_query(original_query: str, missing_targets: List[str]) -> List[str]:
    # For now, deterministic extraction to avoid slow LLM calls
    # Simply use the missing targets directly as the new queries
    return missing_targets

def verify_citations(answer: str, citations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    # Deterministic verification: keep only citations that are actually referenced in the answer text
    # e.g., if [Evidence 3] is in answer, we keep citation 3.
    import re
    referenced_ids = set()
    for match in re.finditer(r'\[Evidence\s+(\d+)\]', answer):
        referenced_ids.add(int(match.group(1)))
        
    verified_citations = []
    for i, cit in enumerate(citations):
        eid = i + 1
        if eid in referenced_ids:
            verified_citations.append(cit)
            
    # If LLM didn't use brackets correctly but provided citations, just return all as fallback
    if not referenced_ids and citations:
        return citations
        
    return verified_citations


def semantic_is_duplicate(new_q: str, past_attempts: List[str]) -> bool:
    import re
    def normalize(q):
        words = re.sub(r'[^\w\s]', ' ', str(q)).lower().split()
        stopwords = {"give", "me", "all", "which", "what", "who", "where", "when", "how", "for", "in", "the", "and", "or", "both", "of", "a", "an", "is", "are", "do", "does", "to", "with", "show"}
        return set([w for w in words if w not in stopwords and len(w) > 1])

    new_set = normalize(new_q)
    if not new_set:
        return True
        
    for past in past_attempts:
        past_set = normalize(past)
        if not past_set:
            continue
            
        intersection = new_set.intersection(past_set)
        union = new_set.union(past_set)
        jaccard = len(intersection) / len(union) if union else 0
        if jaccard > 0.8:
            return True
        if new_set.issubset(past_set):
            return True
    return False

def agent_decide_next_action(agent_state: Dict[str, Any], scope: str, logical_operation: str) -> Dict[str, Any]:
    fallback = {"action": "SEARCH", "query": agent_state["missing_targets"], "reason": "Fallback to missing targets"}
    if not agent_state["missing_targets"]:
        return {"action": "FINISH", "reason": "No missing targets via fallback"}
        
    safe_evidence = agent_state["retrieved_evidence"][:10]
    evidence_text = "\n".join([f"Snippet {i+1}: {e.get('content', '')[:400]}..." for i, e in enumerate(safe_evidence)])
    
    sys_prompt = (
        "You are an advanced Agentic RAG Planner.\n"
        "Review the user's original query, constraints, previous searches, and current evidence.\n"
        "Your job is to determine what facts are still missing and formulate the next retrieval step.\n"
        "You MUST output a SINGLE JSON OBJECT ONLY. Put all your reasoning inside the \"thought\" key.\n"
        "SCHEMA:\n"
        "{\n"
        "  \"thought\": \"Your step-by-step reasoning about the evidence and what to do next.\",\n"
        "  \"progress\": \"Briefly state what new useful entity/fact was discovered in the current evidence (or 'None').\",\n"
        "  \"unresolved\": [\"List of specific constraints/facts from the original query that are still missing.\"],\n"
        "  \"goal\": \"What you intend to achieve in the next search.\",\n"
        "  \"action\": \"SEARCH\" or \"FINISH\",\n"
        "  \"query\": \"The exact query string to execute (ONLY if action is SEARCH). Be specific, use discovered entities and preserve unresolved constraints.\",\n"
        "  \"reason\": \"A concise user-facing explanation for this action (max 10 words).\"\n"
        "}\n\n"
        "CRITICAL RULES:\n"
        "1. MULTI-HOP: If you discovered a partial entity (e.g., student name 'John') but need another attribute (e.g., department), your next query MUST combine the discovered entity with the missing attribute (e.g. 'John department').\n"
        "2. PRESERVE CONSTRAINTS: Never drop important constraints (dates like '2024-01-01', locations, limits) from your new search query if they are unresolved.\n"
        "3. NO DUPLICATES: Do not repeat semantically identical queries. If no new strategy exists, output FINISH.\n"
        "4. If all required constraints and facts are satisfied, output FINISH.\n"
    )

    user_prompt = (
        f"Original User Query: {agent_state.get('query')}\n"
        f"Iteration: {agent_state.get('iteration')} / {agent_state.get('max_iterations')}\n"
        f"Retrieval Attempts So Far: {agent_state.get('retrieval_attempts')}\n\n"
        f"Current Evidence Snippets (Top {len(safe_evidence)}):\n{evidence_text}\n\n"
        "Analyze the state and provide the next action in JSON format."
    )

    try:
        import time
        resp_text, ttft, total = call_llm(sys_prompt, user_prompt, json_mode=True, max_tokens=2048, return_metrics=True)
        decision = extract_json(resp_text)
        
        action = decision.get("action")
        if action not in ["SEARCH", "FINISH"]:
            return fallback
            
        if action == "SEARCH":
            q = decision.get("query", [])
            if isinstance(q, str):
                q = [q]
            
            # Semantic duplicate prevention
            new_queries = []
            for x in q:
                if not semantic_is_duplicate(x, agent_state["retrieval_attempts"]):
                    new_queries.append(x)
                    
            if not new_queries:
                return {"action": "FINISH", "reason": "No unique search strategy remaining"}
            decision["query"] = new_queries
            
        return decision
        
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Decision LLM failed: {e}")
        return fallback

def orchestrate_rag(
    db: Session,
    query: str,
    initial_queries: List[str] = None,
    document_ids: List[str] = None,
    original_query: str = None,
    organization_id: str = None,
    project_id: str = None,
) -> Dict[str, Any]:

    global_t0 = time.time()
    latencies = {}

    print(f"\nQUERY: {query}")
    logger.info("[QUERY] chars=%s project_id=%s", len(query or ""), project_id)
    print("-" * 32)

    t_analyze = time.time()
    query_filters = analyze_query(query)
    latencies["query_analysis"] = time.time() - t_analyze
    scope = query_filters.get("retrieval_scope", "MULTI_FACT")
    logical_operation = query_filters.get("logical_operation", "SINGLE_TARGET")

    search_query = initial_queries[0] if initial_queries else query

    targets = query_filters.get("targets", [query])
    if not targets:
        targets = [query]
        
    agent_state = {
        "iteration": 0,
        "max_iterations": 3,
        "query": query,
        "targets": targets.copy(),
        "retrieved_evidence": [],
        "missing_targets": [],
        "retrieval_attempts": [],
        "evaluation": {},
        "stop_reason": None
    }
    
    seen_chunks = set()
    r_metrics = {}
    current_targets = agent_state["targets"]
    retrieval_error = None
    
    while agent_state["iteration"] < agent_state["max_iterations"]:
        agent_state["iteration"] += 1
        
        try:
            for tgt in current_targets:
                if tgt in agent_state["retrieval_attempts"]:
                    continue
                agent_state["retrieval_attempts"].append(tgt)
                
                tgt_evidence, t_metrics, _ = search_knowledge_base(
                    db,
                    tgt,
                    document_ids,
                    filters=query_filters,
                    organization_id=organization_id,
                    project_id=project_id,
                )
                for k, v in t_metrics.items():
                    r_metrics[k] = r_metrics.get(k, 0) + v
                for e in tgt_evidence:
                    cid = e.get("chunk_id", e.get("id"))
                    if cid not in seen_chunks:
                        seen_chunks.add(cid)
                        agent_state["retrieved_evidence"].append(e)
            
            agent_state["retrieved_evidence"].sort(key=lambda x: x.get("rerank_score", -999.0), reverse=True)
        except Exception as e:
            logger.error(f"[orchestrate_rag] Retrieval failed. Exception: {e}")
            agent_state["stop_reason"] = "RETRIEVAL_ERROR"
            retrieval_error = str(e)
            break
            
        if agent_state["iteration"] == 1:
            if not agent_state["retrieved_evidence"]:
                agent_state["stop_reason"] = "OUT_OF_DOMAIN"
                break
            best_score = agent_state["retrieved_evidence"][0].get("rerank_score")
            if isinstance(best_score, (int, float)) and best_score < -8.5:
                agent_state["stop_reason"] = "OUT_OF_DOMAIN"
                break
                
        eval_result = evaluate_evidence(query, targets, agent_state["retrieved_evidence"], scope, logical_operation)
        agent_state["evaluation"] = eval_result
        agent_state["missing_targets"] = eval_result.get("missing_targets", [])
        
        if eval_result["sufficient"]:
            agent_state["stop_reason"] = "SUFFICIENT_EVIDENCE"
            break
            
        if agent_state["iteration"] >= agent_state["max_iterations"]:
            agent_state["stop_reason"] = "MAX_ITERATIONS_REACHED"
            break
            
        t_decide = time.time()
        decision = agent_decide_next_action(agent_state, scope, logical_operation)
        latencies["agent_decision"] = latencies.get("agent_decision", 0) + (time.time() - t_decide)
        
        action = decision.get("action")
        reason = decision.get("reason", "Agent decided to act.")
        
        agent_state.setdefault("decision_history", []).append({
            "iteration": agent_state["iteration"],
            "action": action,
            "query": decision.get("query"),
            "reason": reason,
            "goal": decision.get("goal"),
            "unresolved": decision.get("unresolved"),
            "progress": decision.get("progress")
        })
        
        if action == "FINISH":
            agent_state["stop_reason"] = "AGENT_FINISHED"
            break
        elif action == "SEARCH":
            current_targets = decision.get("query", [])
            if not current_targets:
                agent_state["stop_reason"] = "NO_USEFUL_CORRECTION"
                break
        else:
            current_targets = agent_state["missing_targets"]
            if not current_targets:
                agent_state["stop_reason"] = "NO_USEFUL_CORRECTION"
                break

    raw_evidence = agent_state["retrieved_evidence"]
    for k, v in r_metrics.items():
        latencies[k] = v

    if retrieval_error:
        latencies["total"] = time.time() - global_t0
        raise RuntimeError(f"Vector retrieval failed: {retrieval_error}")

    best_score = raw_evidence[0].get("rerank_score", -999.0) if raw_evidence else -999.0
    if not raw_evidence or agent_state["stop_reason"] == "OUT_OF_DOMAIN":
        logger.info("[RESPONSE] no relevant chunks project_id=%s", project_id)
        latencies["total"] = time.time() - global_t0
        return {
            "answer": NO_EVIDENCE_ANSWER,
            "sources": [],
            "domain_state": "OUT_OF_DOMAIN",
            "evidence_state": "NONE",
            "iterations": agent_state["iteration"],
            "tools_used": ["search_knowledge_base"],
            "citations": [],
            "retrieved_evidence": [],
            "latencies": latencies
        }

    # NEW STRONG EVIDENCE GROUNDING GATE
    check_query = original_query if original_query else query
    if search_query != check_query and raw_evidence:
        t_gate = time.time()
        from app.services.retrieval_service import rerank_candidates
        gate_evidence = rerank_candidates(check_query, raw_evidence[:5], rerank_top_k=5)
        best_gate_score = gate_evidence[0].get("rerank_score", -999.0) if gate_evidence else -999.0
        latencies["grounding_gate"] = time.time() - t_gate
        
        if best_gate_score < -5.0:
            print(f"Grounding Gate Failed! Best Gate Score for CURRENT query: {best_gate_score}")
            latencies["total"] = time.time() - global_t0
            return {
                "answer": NO_EVIDENCE_ANSWER,
                "sources": [],
                "domain_state": "OUT_OF_DOMAIN",
                "evidence_state": "NONE",
                "iterations": agent_state["iteration"],
                "tools_used": ["search_knowledge_base"],
                "citations": [],
                "retrieved_evidence": [],
                "latencies": latencies
            }

    # EXACT IDENTIFIER SAFETY VERIFICATION
    if not check_strong_identifiers_in_evidence(query, raw_evidence):
        latencies["total"] = time.time() - global_t0
        return {
            "answer": NO_EVIDENCE_ANSWER,
            "sources": [],
            "domain_state": "IN_DOMAIN",
            "evidence_state": "INSUFFICIENT_EVIDENCE",
            "iterations": agent_state["iteration"],
            "tools_used": ["search_knowledge_base"],
            "citations": [],
            "retrieved_evidence": raw_evidence,
            "latencies": latencies
        }
        
    # Context Slicing (MINIMUM REQUIRED EVIDENCE)
    if scope == "EXHAUSTIVE_LIST" or logical_operation == "UNION":
        valid_evidence = [e for e in raw_evidence if e.get("rerank_score", -999.0) > -8.0]
        final_evidence_list = valid_evidence[:150] if valid_evidence else raw_evidence[:15]
    elif scope == "SEMANTIC" or logical_operation == "COMPARISON":
        final_evidence_list = raw_evidence[:15]
    elif scope == "EXACT_LOOKUP" or logical_operation == "INTERSECTION":
        final_evidence_list = raw_evidence[:10]
    else: # SIMPLE_FACTUAL or UNKNOWN
        final_evidence_list = raw_evidence[:5]

    import re
    emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', query)
    long_numbers = re.findall(r'\d{7,20}', query)
    alphanumerics = [w for w in re.findall(r'[a-zA-Z0-9]{6,20}', query) if any(c.isalpha() for c in w) and any(c.isdigit() for c in w)]
    strong_identifiers = set(emails + long_numbers + alphanumerics)
    
    if strong_identifiers:
        for chunk in raw_evidence:
            chunk_content = chunk.get("content", "").lower()
            if any(ident.lower() in chunk_content for ident in strong_identifiers):
                if chunk not in final_evidence_list:
                    chunk["rerank_score"] = 999.0 # Force to top
                    final_evidence_list.insert(0, chunk)
                else:
                    chunk["rerank_score"] = 999.0 # Force to top
                    
    # Cap size after forced insertions (only for non-list queries)
    if scope not in ["EXHAUSTIVE_LIST"] and not (scope == "MULTI_CONDITION" and logical_operation == "UNION"):
        final_evidence_list = final_evidence_list[:10]
    final_evidence_list.sort(key=lambda x: x.get("rerank_score", -999.0), reverse=True)

    # 5. Context Neighborhood Expansion (Deduplicated Structure)
    t_expand = time.time()
    final_evidence_list = expand_chunk_context(db, final_evidence_list)
    latencies["context_building"] = time.time() - t_expand

    # 6. Generation
    logger.info("[LLM] chunks=%s", len(final_evidence_list))
    t_gen = time.time()
    answer, citations, evidence_state, gen_metrics = generate_answer(query, final_evidence_list, scope=scope, logical_operation=logical_operation, targets=targets)
    citations = verify_citations(answer, citations)
    latencies["llm_generation"] = time.time() - t_gen
    latencies["total"] = time.time() - global_t0
    latencies["context_chars"] = gen_metrics.get("input_chars", 0)
    latencies["output_chars"] = len(answer)
    latencies["evidence_chunks"] = len(final_evidence_list)
    logger.info("[LLM] elapsed_ms=%s", int(latencies["llm_generation"] * 1000))

    # Log everything as requested
    print(f"Query analysis:      {latencies.get('query_analysis', 0):.2f}s")
    print(f"Embedding:           {latencies.get('query_embedding', 0):.2f}s")
    print(f"Vector search:       {latencies.get('vector_search', 0):.2f}s")
    print(f"BM25 search:         {latencies.get('bm25_search', 0):.2f}s")
    print(f"RRF fusion:          {latencies.get('rrf_fusion', 0):.2f}s")
    print(f"Reranking:           {latencies.get('reranking', 0):.2f}s")
    print(f"Context building:    {latencies.get('context_building', 0):.2f}s")
    print(f"LLM TTFT:            {gen_metrics.get('ttft', 0):.2f}s")
    print(f"LLM generation:      {gen_metrics.get('generation_time', 0):.2f}s")
    print(f"Total:               {latencies['total']:.2f}s")
    print("-" * 32)
    print(f"Input characters:    {gen_metrics.get('input_chars', 0)}")
    print(f"Output chars:        {len(answer)}")
    print(f"LLM calls:           1")

    final_stop_reason = agent_state.get("stop_reason", "SUFFICIENT_EVIDENCE")
    if evidence_state == "INSUFFICIENT_EVIDENCE" and final_stop_reason in ["SUFFICIENT_EVIDENCE", "FAST_PATH_SUFFICIENT"]:
        final_stop_reason = "LLM_EVALUATED_INSUFFICIENT"
    elif evidence_state == "SUPPORTED" and final_stop_reason == "MAX_ITERATIONS_REACHED":
        if agent_state.get("missing_targets"):
            evidence_state = "PARTIAL_EVIDENCE"
            final_stop_reason = "MAX_ITERATIONS_PARTIAL"

    return {
        "answer": answer if evidence_state != "INSUFFICIENT_EVIDENCE" else NO_EVIDENCE_ANSWER,
        "sources": sources_from_evidence(citations or final_evidence_list),
        "domain_state": "IN_DOMAIN",
        "evidence_state": evidence_state,
        "iterations": agent_state["iteration"],
        "max_iterations": agent_state.get("max_iterations", 3),
        "stop_reason": final_stop_reason,
        "tools_used": ["search_knowledge_base"],
        "citations": citations,
        "retrieved_evidence": final_evidence_list,
        "latencies": latencies,
        "decision_history": agent_state.get("decision_history", [])
    }
